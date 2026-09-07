import * as THREE from 'three';
import { RacerState, PlayerInput, Projectile, PowerUpType, TrackDefinition, CarDefinition, CarCustomization, SpeedClass } from '../types';
import { buildTrack, TrackData } from './tracks';
import { createToonCarMesh, CarMeshContainer, CAR_DEFINITIONS } from './cars';
import { updateRacerPhysics, resolveCarCarCollisions, updateProjectiles, CollisionEvent } from './physics';
import { createAIControllers, computeAIInput, AIOpponentController } from './ai';
import { getRandomPowerUp, createRocketMesh, createMineMesh, createShieldMesh } from './powerups';
import { soundManager } from '../audio/soundManager';
import { ParticleSystem } from './particles';
import { SkidMarkManager } from './skidmarks';

// Pre-allocated static scratch vectors for zero-allocation per-frame engine updates
const _visFwd = new THREE.Vector3();
const _visRight = new THREE.Vector3();
const _visPos = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();

export interface GameEngineCallbacks {
  onHUDUpdate: (data: {
    speed: number;
    lap: number;
    totalLaps: number;
    position: number;
    totalRacers: number;
    currentItem: PowerUpType | null;
    isDrifting: boolean;
    hasTurbo: boolean;
    hasShield: boolean;
    isWrongWay: boolean;
    currentLapTime: number;
    bestLapTime: number | null;
    driftCharge: number;
    currentSurface?: string;
    surfaceName?: string;
    surfaceIcon?: string;
  }) => void;
  onCombatEvent: (message: string) => void;
  onRaceFinished: (results: RacerState[]) => void;
  onCountdownTick: (value: string | number) => void;
}

export class ToonCarEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  private trackDef: TrackDefinition;
  private trackData!: TrackData;
  private totalLaps: number;

  public racers: RacerState[] = [];
  private carMeshes: Map<string, CarMeshContainer> = new Map();
  private shieldMeshes: Map<string, THREE.Mesh> = new Map();
  private shadowMeshes: Map<string, THREE.Mesh> = new Map();
  private speechSprites: Map<string, THREE.Sprite> = new Map();

  private projectiles: Projectile[] = [];
  private projectileMeshes: Map<string, THREE.Group> = new Map();

  private aiControllers: Map<string, AIOpponentController> = new Map();
  private callbacks: GameEngineCallbacks;

  // Visual FX & Environment
  private particles: ParticleSystem;
  private skidMarks: SkidMarkManager;
  private cloudsGroup?: THREE.Group;
  private cameraShake: number = 0;
  private hudTimer: number = 0;
  private cachedMinimapPoints: { x: number; z: number }[] | null = null;
  private cachedMinimapRacers: { id: string; x: number; z: number; color: string; isPlayer: boolean; position: number }[] = [];

  // Local player input
  public localInput: PlayerInput = {
    throttle: 0,
    brake: 0,
    steer: 0,
    drift: false,
    useItem: false,
    honk: false,
    lookBehind: false,
    respawn: false,
  };

  public localPlayerId: string = 'player_1';
  public gameState: 'countdown' | 'racing' | 'finished' = 'countdown';
  private countdownTimer: number = 3.2;
  public userCustomization?: CarCustomization;
  public speedFactor: number = 1.0;

  constructor(
    container: HTMLElement,
    trackDef: TrackDefinition,
    userCarId: string,
    userCarColor: string,
    totalLaps: number,
    callbacks: GameEngineCallbacks,
    customRacers?: { id: string; name: string; carId: string; color: string; isAI: boolean }[],
    userCustomization?: CarCustomization,
    speedClass?: SpeedClass
  ) {
    this.container = container;
    this.trackDef = trackDef;
    this.totalLaps = totalLaps;
    this.callbacks = callbacks;
    this.userCustomization = userCustomization;
    if (speedClass === '50cc') {
      this.speedFactor = 0.85;
    } else if (speedClass === '150cc') {
      this.speedFactor = 1.18;
    } else {
      this.speedFactor = 1.0;
    }

    // 1. Three.js setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(trackDef.skyColor);
    this.scene.fog = new THREE.FogExp2(trackDef.fogColor, 0.0035);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    container.appendChild(this.renderer.domElement);

    // 2. Systems
    this.particles = new ParticleSystem(this.scene);
    this.skidMarks = new SkidMarkManager(this.scene);

    // 3. Lighting
    this.setupLighting();

    // 4. Track building
    this.setupTrack();

    // 5. Racers setup
    this.setupRacers(userCarId, userCarColor, customRacers);

    // 6. Resize listener
    window.addEventListener('resize', this.onWindowResize);

    // 7. Pre-compile all WebGL shaders upfront (track, cars, particles, items, shields, rockets, mines)
    // This completely eliminates any synchronous shader compilation stutter when first picking up boxes or firing items!
    const warmupGroup = new THREE.Group();
    warmupGroup.visible = false;
    warmupGroup.add(createRocketMesh());
    warmupGroup.add(createMineMesh());
    warmupGroup.add(createShieldMesh());
    this.particles.getWarmupMeshes().forEach(m => warmupGroup.add(m));
    this.scene.add(warmupGroup);

    try {
      this.renderer.compile(this.scene, this.camera);
    } catch (_) {}

    this.scene.remove(warmupGroup);

    // Start audio
    soundManager.init();
    soundManager.startMusic();

    // Begin loop
    this.lastTime = performance.now();
    this.loop();
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffaed, 1.2);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 400;
    const d = 120;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    // Subtle blue hemisphere ground bounce
    const hemi = new THREE.HemisphereLight(0xffffff, this.trackDef.groundColor, 0.5);
    this.scene.add(hemi);

    // Rim light for rich 3D body reflections and depth definition
    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.45);
    rimLight.position.set(-70, 50, -50);
    this.scene.add(rimLight);
  }

  private setupTrack() {
    this.trackData = buildTrack(this.trackDef);

    // Ground terrain plane
    const groundGeo = new THREE.PlaneGeometry(1200, 1200);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: this.trackDef.groundColor,
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add track parts
    this.scene.add(this.trackData.trackMesh);
    this.scene.add(this.trackData.curbsMesh);
    this.scene.add(this.trackData.wallsMesh);
    this.scene.add(this.trackData.startArch);
    this.scene.add(this.trackData.decorations);
    if (this.trackData.waterMesh) {
      this.scene.add(this.trackData.waterMesh);
    }

    // Item boxes
    this.trackData.itemBoxes.forEach(box => {
      this.scene.add(box.mesh);
    });

    // Boost pad visual meshes
    this.trackData.boostPads.forEach(pad => {
      const padGeo = new THREE.PlaneGeometry(3.5, 5);
      padGeo.rotateX(-Math.PI / 2);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.set(pad.x, pad.y, pad.z);
      padMesh.rotation.y = pad.rotY;
      this.scene.add(padMesh);
    });

    // Fluffy cartoon clouds
    const cloudsGroup = new THREE.Group();
    const cMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const cGeo = new THREE.SphereGeometry(6 + Math.random() * 4, 7, 7);
        const puff = new THREE.Mesh(cGeo, cMat);
        puff.position.set((j - 1.5) * 5, Math.sin(j * 1.5) * 2, (Math.random() - 0.5) * 3);
        puff.scale.set(1.4, 0.7, 1);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 550, 70 + Math.random() * 25, (Math.random() - 0.5) * 550);
      cloudsGroup.add(cloud);
    }
    this.scene.add(cloudsGroup);
    this.cloudsGroup = cloudsGroup;
  }

  private setupRacers(
    userCarId: string,
    userCarColor: string,
    customRacers?: { id: string; name: string; carId: string; color: string; isAI: boolean }[]
  ) {
    const startPt = this.trackData.curve.getPointAt(0);
    const startTangent = this.trackData.curve.getTangentAt(0);
    const startRotY = Math.atan2(startTangent.x, startTangent.z);
    const right = new THREE.Vector3().crossVectors(startTangent, new THREE.Vector3(0, 1, 0)).normalize();
    const now = Date.now();
    const totalTrackLen = this.trackData.curve.getLength() || 700;
    const getGridSlot = (gridIndex: number) => {
      // Stagger cars evenly along the track curve behind start line (Pole position at 4.5m, then 11.5m, 18.5m, etc.)
      const distBehindStart = 4.5 + gridIndex * 7.0;
      const t = (1.0 - (distBehindStart / totalTrackLen) + 1.0) % 1.0;
      const pt = this.trackData.curve.getPointAt(t);
      const tangent = this.trackData.curve.getTangentAt(t).normalize();
      const upVec = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const side = (gridIndex % 2 === 0 ? -1 : 1) * 2.8;
      const pos = pt.clone().addScaledVector(right, side);
      const rotY = Math.atan2(tangent.x, tangent.z);
      return { pos, rotY };
    };

    if (customRacers && customRacers.length > 0) {
      customRacers.forEach((cr, i) => {
        const slot = getGridSlot(i);

        this.addRacer({
          id: cr.id,
          name: cr.name,
          carId: cr.carId,
          isAI: cr.isAI,
          color: cr.color,
          x: slot.pos.x,
          y: slot.pos.y + 0.1,
          z: slot.pos.z,
          rotY: slot.rotY,
          rotX: 0,
          rotZ: 0,
          speed: 0,
          steerAngle: 0,
          driftFactor: 0,
          isDrifting: false,
          driftChargeTime: 0,
          lap: 1,
          checkpointIndex: 0,
          totalDistance: 0,
          position: i + 1,
          finished: false,
          lapTimes: [],
          currentLapStartTime: now,
          bestLapTime: null,
          isWrongWay: false,
          currentItem: null,
          hasShield: false,
          shieldTimer: 0,
          turboTimer: 0,
          spinTimer: 0,
          frozenTimer: 0,
          wheelRot: 0,
          bounceOffset: 0,
        });
      });
    } else {
      // Singleplayer with 5 AI Opponents
      const aiDefs = CAR_DEFINITIONS.filter(c => c.id !== userCarId).slice(0, 5);
      const playerSlot = getGridSlot(0);

      // Add local player in Pole Position (Slot 0)
      this.addRacer({
        id: this.localPlayerId,
        name: 'Sina (You)',
        carId: userCarId,
        isAI: false,
        color: userCarColor,
        x: playerSlot.pos.x,
        y: playerSlot.pos.y + 0.1,
        z: playerSlot.pos.z,
        rotY: playerSlot.rotY,
        rotX: 0,
        rotZ: 0,
        speed: 0,
        steerAngle: 0,
        driftFactor: 0,
        isDrifting: false,
        driftChargeTime: 0,
        lap: 1,
        checkpointIndex: 0,
        totalDistance: 0,
        position: 1,
        finished: false,
        lapTimes: [],
        currentLapStartTime: now,
        bestLapTime: null,
        isWrongWay: false,
        currentItem: null,
        hasShield: false,
        shieldTimer: 0,
        turboTimer: 0,
        spinTimer: 0,
        frozenTimer: 0,
        wheelRot: 0,
        bounceOffset: 0,
      });

      // Add 5 AI bots in staggered grid slots 1 to 5
      aiDefs.forEach((aiCar, idx) => {
        const slot = getGridSlot(idx + 1);

        this.addRacer({
          id: `ai_${aiCar.id}`,
          name: aiCar.driverName,
          carId: aiCar.id,
          isAI: true,
          color: aiCar.primaryColor,
          x: slot.pos.x,
          y: slot.pos.y + 0.1,
          z: slot.pos.z,
          rotY: slot.rotY,
          rotX: 0,
          rotZ: 0,
          speed: 0,
          steerAngle: 0,
          driftFactor: 0,
          isDrifting: false,
          driftChargeTime: 0,
          lap: 1,
          checkpointIndex: 0,
          totalDistance: 0,
          position: idx + 2,
          finished: false,
          lapTimes: [],
          currentLapStartTime: now,
          bestLapTime: null,
          isWrongWay: false,
          currentItem: null,
          hasShield: false,
          shieldTimer: 0,
          turboTimer: 0,
          spinTimer: 0,
          frozenTimer: 0,
          wheelRot: 0,
          bounceOffset: 0,
        });
      });
    }

    this.aiControllers = createAIControllers(this.racers);
  }

  private addRacer(state: RacerState) {
    this.racers.push(state);

    const carDef = CAR_DEFINITIONS.find(c => c.id === state.carId) || CAR_DEFINITIONS[0];
    const meshContainer = createToonCarMesh(
      carDef,
      state.color,
      state.id === this.localPlayerId ? this.userCustomization : undefined
    );
    meshContainer.root.position.set(state.x, state.y, state.z);
    meshContainer.root.rotation.y = state.rotY;

    this.scene.add(meshContainer.root);
    this.carMeshes.set(state.id, meshContainer);

    // Soft drop shadow beneath car
    const shadowGeo = new THREE.PlaneGeometry(2.2, 3.2);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(state.x, state.y + 0.04, state.z);
    shadowMesh.rotation.y = state.rotY;
    shadowMesh.renderOrder = 0;
    this.scene.add(shadowMesh);
    this.shadowMeshes.set(state.id, shadowMesh);

    // Shield mesh
    const shield = createShieldMesh();
    shield.visible = false;
    meshContainer.root.add(shield);
    this.shieldMeshes.set(state.id, shield);
  }

  // --- Main Game Loop ---
  private loop = () => {
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.1) dt = 0.1; // Clamp big hitches

    // 1. Countdown handler
    if (this.gameState === 'countdown') {
      const prevTimer = this.countdownTimer;
      this.countdownTimer -= dt;

      if (prevTimer >= 3.0 && this.countdownTimer < 3.0) {
        soundManager.playCountdown(false);
        this.callbacks.onCountdownTick(3);
      } else if (prevTimer >= 2.0 && this.countdownTimer < 2.0) {
        soundManager.playCountdown(false);
        this.callbacks.onCountdownTick(2);
      } else if (prevTimer >= 1.0 && this.countdownTimer < 1.0) {
        soundManager.playCountdown(false);
        this.callbacks.onCountdownTick(1);
      } else if (prevTimer > 0.0 && this.countdownTimer <= 0.0) {
        soundManager.playCountdown(true);
        this.callbacks.onCountdownTick('LÄKS!');
        this.gameState = 'racing';

        // Check for rocket start! If player is holding throttle (W/Up) as GO triggers
        const player = this.racers.find(r => r.id === this.localPlayerId);
        if (player && this.localInput.throttle > 0) {
          player.turboTimer = 1.8;
          player.speed = 46;
          soundManager.playTurbo();
          this.callbacks.onCombatEvent('🚀 TÄIUSLIK START! Nitro aktiveeritud!');
        }

        setTimeout(() => {
          this.callbacks.onCountdownTick('');
        }, 1200);
      }
    }

    // 2. Process Racers
    const canDrive = this.gameState === 'racing';

    this.racers.forEach(racer => {
      let input: PlayerInput = {
        throttle: 0,
        brake: 0,
        steer: 0,
        drift: false,
        useItem: false,
        honk: false,
      };

      if (canDrive && !racer.finished) {
        if (racer.id === this.localPlayerId) {
          input = this.localInput;

          // Check if player used item
          if (this.localInput.useItem && racer.currentItem) {
            this.firePowerUp(racer);
            this.localInput.useItem = false;
          }

          // Check honk
          if (this.localInput.honk) {
            soundManager.playHonk();
            this.localInput.honk = false;
          }
        } else if (racer.isAI) {
          const ctrl = this.aiControllers.get(racer.id);
          if (ctrl) {
            input = computeAIInput(racer, ctrl, this.trackData, this.racers, dt, (rId) => {
              const r = this.racers.find(x => x.id === rId);
              if (r) this.firePowerUp(r);
            });
          }
        }
      }

      // Physics update
      updateRacerPhysics(racer, input, this.trackData, dt, (event) => this.handleCollision(event), this.speedFactor);

      // Sound update for local player
      if (racer.id === this.localPlayerId) {
        soundManager.updateEngine(Math.abs(racer.speed) / 50, input.throttle > 0);
        if (racer.isDrifting) {
          soundManager.playDrift();
        }
      }

      // Check race finish
      if (racer.lap > this.totalLaps && !racer.finished) {
        racer.finished = true;
        racer.finishTime = Date.now();
        if (racer.id === this.localPlayerId) {
          soundManager.playWinFanfare();
          this.callbacks.onCombatEvent('🏁 SÕIT LÕPETATUD! Vaata tulemusi!');
        }

        // Check if all finished
        const allDone = this.racers.every(r => r.finished);
        if (allDone || racer.id === this.localPlayerId) {
          setTimeout(() => {
            this.callbacks.onRaceFinished(this.racers);
          }, 1500);
        }
      }
    });

    // 3. Resolve Bumping Collisions between cars
    resolveCarCarCollisions(this.racers, dt, (event) => this.handleCollision(event));

    // 4. Update Projectiles
    updateProjectiles(this.projectiles, this.racers, dt, (event) => this.handleCollision(event));
    this.syncProjectileMeshes();

    // 5. Update Item Boxes Respawn & Idle Spin
    this.trackData.itemBoxes.forEach(box => {
      box.mesh.rotation.y += dt * 2.5;
      box.mesh.position.y = box.y + Math.sin(now * 0.004) * 0.2;

      if (!box.active) {
        box.respawnTime -= dt;
        if (box.respawnTime <= 0) {
          box.active = true;
          box.mesh.visible = true;
        }
      }
    });

    // Clouds gentle drift
    if (this.cloudsGroup) {
      this.cloudsGroup.children.forEach(c => {
        c.position.x += dt * 3.5;
        if (c.position.x > 320) c.position.x = -320;
      });
    }

    // Animate tropical ocean waves
    if (this.trackData.waterMesh) {
      this.trackData.waterMesh.position.y = -0.4 + Math.sin(now * 0.0018) * 0.12;
    }

    // 6. Update 3D Visual Meshes & Particles
    this.updateVisualMeshes(dt);
    this.particles.update(dt);
    this.skidMarks.update(dt);

    // 7. Calculate Race Standings (1st - 6th)
    this.updateRacePositions();

    // 8. Dynamic Chase Camera
    this.updateCamera(dt);

    // 9. Notify React HUD (throttled to 20 FPS to prevent thread stalling)
    this.hudTimer += dt;
    if (this.hudTimer >= 0.05) {
      this.hudTimer = 0;
      const localRacer = this.racers.find(r => r.id === this.localPlayerId);
      if (localRacer) {
        const currentLapTime = localRacer.currentLapStartTime > 0 
          ? (Date.now() - localRacer.currentLapStartTime) / 1000 
          : 0;
        const driftCharge = (localRacer.driftChargeTime || 0) >= 2.6 ? 3 : ((localRacer.driftChargeTime || 0) >= 1.6 ? 2 : ((localRacer.driftChargeTime || 0) >= 0.75 ? 1 : 0));

        this.callbacks.onHUDUpdate({
          speed: Math.round(Math.abs(localRacer.speed) * 3.6),
          lap: Math.min(localRacer.lap, this.totalLaps),
          totalLaps: this.totalLaps,
          position: localRacer.position,
          totalRacers: this.racers.length,
          currentItem: localRacer.currentItem,
          isDrifting: localRacer.isDrifting,
          hasTurbo: localRacer.turboTimer > 0,
          hasShield: localRacer.hasShield,
          isWrongWay: !!localRacer.isWrongWay,
          currentLapTime,
          bestLapTime: localRacer.bestLapTime,
          driftCharge,
          currentSurface: localRacer.currentSurface,
          surfaceName: localRacer.surfaceName,
          surfaceIcon: localRacer.surfaceIcon,
        });
      }
    }

    // 10. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  };

  private handleCollision(event: CollisionEvent) {
    if (event.type === 'car_bump') {
      soundManager.playBoing();
      this.particles.emitSparks(event.x, event.y + 0.3, event.z, 0xffd700, 5);
    } else if (event.type === 'wall_hit') {
      soundManager.playBump();
      this.particles.emitSparks(event.x, event.y + 0.3, event.z, 0xffffff, 6);
      if (event.racerId === this.localPlayerId) {
        this.cameraShake = Math.min(this.cameraShake + 0.15, 0.25);
      }
    } else if (event.type === 'item_box') {
      soundManager.playItemBox();
      this.particles.emitBoxBreak(event.x, event.y, event.z);
      const racer = this.racers.find(r => r.id === event.racerId);
      if (racer && !racer.currentItem) {
        racer.currentItem = getRandomPowerUp(racer.position, this.racers.length);
        if (racer.id === this.localPlayerId) {
          this.callbacks.onCombatEvent(`🎁 Said eseme: ${racer.currentItem.toUpperCase()}!`);
        }
      }
    } else if (event.type === 'rocket_hit') {
      soundManager.playExplosion();
      this.particles.emitExplosion(event.x, event.y, event.z);
      if (event.targetId === this.localPlayerId) {
        this.cameraShake = 1.0;
      }
      const attacker = this.racers.find(r => r.id === event.racerId);
      const target = this.racers.find(r => r.id === event.targetId);
      if (attacker && target) {
        this.callbacks.onCombatEvent(`💥 ${attacker.name} tabas raketiga sõitjat ${target.name}!`);
      }
    } else if (event.type === 'mine_hit') {
      soundManager.playExplosion();
      this.particles.emitExplosion(event.x, event.y, event.z);
      if (event.targetId === this.localPlayerId) {
        this.cameraShake = 1.0;
      }
      const target = this.racers.find(r => r.id === event.targetId);
      if (target) {
        this.callbacks.onCombatEvent(`💣 ${target.name} sõitis miinile otsa!`);
      }
    } else if (event.type === 'boost_pad') {
      soundManager.playTurbo();
      const racer = this.racers.find(r => r.id === event.racerId);
      if (racer && racer.id === this.localPlayerId) {
        this.callbacks.onCombatEvent('⚡ KIIRENDUSPADI! Nitro aktiveeritud!');
      }
    }
  }

  public firePowerUp(racer: RacerState) {
    if (!racer.currentItem) return;
    const item = racer.currentItem;
    racer.currentItem = null;

    if (item === 'turbo') {
      racer.turboTimer = 3.5;
      racer.speed = Math.max(racer.speed + 20, 58);
      soundManager.playTurbo();
      if (racer.id === this.localPlayerId) {
        this.callbacks.onCombatEvent('🚀 SUPER NITRO KÄIVITATUD!');
      }
    } else if (item === 'shield') {
      racer.hasShield = true;
      racer.shieldTimer = 8.0;
      soundManager.playShield();
      if (racer.id === this.localPlayerId) {
        this.callbacks.onCombatEvent('🛡️ MULLKILP AKTIVEERITUD!');
      }
    } else if (item === 'repair') {
      racer.spinTimer = 0;
      racer.frozenTimer = 0;
      racer.speed += 8;
      soundManager.playTurbo();
      if (racer.id === this.localPlayerId) {
        this.callbacks.onCombatEvent('🔧 REMONT TEHTUD! Auto on jälle korras!');
      }
    } else if (item === 'lightning') {
      // Zap all rivals!
      soundManager.playExplosion();
      this.racers.forEach(r => {
        if (r.id !== racer.id && !r.hasShield) {
          r.frozenTimer = 3.2;
          r.speed *= 0.4;
        }
      });
      this.callbacks.onCombatEvent(`🌩️ ${racer.name} lõi kõiki välguga!`);
    } else if (item === 'anvil') {
      // Squash leader!
      const leader = this.racers.find(r => r.position === 1 && r.id !== racer.id);
      if (leader) {
        if (leader.hasShield) {
          leader.hasShield = false;
          leader.shieldTimer = 0;
        } else {
          leader.spinTimer = 2.5;
          leader.speed = 0;
        }
        soundManager.playExplosion();
        this.callbacks.onCombatEvent(`🔨 10T ALASI kukkus liidrile (${leader.name}) pähe!`);
      }
    } else if (item === 'rocket') {
      soundManager.playRocketLaunch();
      // Find target ahead
      const target = this.racers.find(r => r.id !== racer.id && r.position < racer.position);

      const fwd = new THREE.Vector3(Math.sin(racer.rotY), 0, Math.cos(racer.rotY)).normalize();
      const spawnPos = new THREE.Vector3(racer.x, racer.y + 0.6, racer.z).add(fwd.clone().multiplyScalar(2.5));

      this.projectiles.push({
        id: `rocket_${Date.now()}_${Math.random()}`,
        type: 'rocket',
        ownerId: racer.id,
        x: spawnPos.x,
        y: spawnPos.y,
        z: spawnPos.z,
        vx: fwd.x * 55,
        vy: 0,
        vz: fwd.z * 55,
        targetId: target?.id,
        life: 5.0,
        active: true,
      });
    } else if (item === 'trio_rockets') {
      soundManager.playRocketLaunch();
      const fwd = new THREE.Vector3(Math.sin(racer.rotY), 0, Math.cos(racer.rotY)).normalize();
      const right = new THREE.Vector3(fwd.z, 0, -fwd.x);

      [-0.3, 0, 0.3].forEach((angleOff, idx) => {
        const dir = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOff);
        const spawnPos = new THREE.Vector3(racer.x, racer.y + 0.6, racer.z)
          .add(fwd.clone().multiplyScalar(2.5))
          .add(right.clone().multiplyScalar((idx - 1) * 1.2));

        this.projectiles.push({
          id: `trio_${Date.now()}_${idx}`,
          type: 'rocket',
          ownerId: racer.id,
          x: spawnPos.x,
          y: spawnPos.y,
          z: spawnPos.z,
          vx: dir.x * 50,
          vy: 0,
          vz: dir.z * 50,
          life: 4.5,
          active: true,
        });
      });
    } else if (item === 'mine') {
      const fwd = new THREE.Vector3(Math.sin(racer.rotY), 0, Math.cos(racer.rotY)).normalize();
      const spawnPos = new THREE.Vector3(racer.x, racer.y + 0.4, racer.z).sub(fwd.clone().multiplyScalar(2.8));

      this.projectiles.push({
        id: `mine_${Date.now()}_${Math.random()}`,
        type: 'mine',
        ownerId: racer.id,
        x: spawnPos.x,
        y: spawnPos.y,
        z: spawnPos.z,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 25.0,
        active: true,
      });
    }
  }

  private syncProjectileMeshes() {
    // Add new meshes
    this.projectiles.forEach(p => {
      if (p.active && !this.projectileMeshes.has(p.id)) {
        const mesh = p.type === 'rocket' ? createRocketMesh() : createMineMesh();
        mesh.position.set(p.x, p.y, p.z);
        this.scene.add(mesh);
        this.projectileMeshes.set(p.id, mesh);
      }
    });

    // Update positions and remove dead
    this.projectileMeshes.forEach((mesh, id) => {
      const p = this.projectiles.find(x => x.id === id);
      if (p && p.active) {
        mesh.position.set(p.x, p.y, p.z);
        if (p.type === 'rocket') {
          const angle = Math.atan2(p.vx, p.vz);
          mesh.rotation.y = angle;
        } else {
          mesh.rotation.y += 0.05;
        }
      } else {
        this.scene.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    });

    if (this.projectiles.some(p => !p.active)) {
      this.projectiles = this.projectiles.filter(p => p.active);
    }
  }

  private updateVisualMeshes(dt: number) {
    this.racers.forEach(racer => {
      const meshContainer = this.carMeshes.get(racer.id);
      if (!meshContainer) return;

      // Position with suspension bounce
      meshContainer.root.position.set(racer.x, racer.y + racer.bounceOffset, racer.z);

      // Rotation (Y yaw + drift tilt)
      const driftTilt = racer.isDrifting ? -racer.steerAngle * 0.18 : 0;
      meshContainer.root.rotation.set(0, racer.rotY, driftTilt);

      // Front wheels steering
      meshContainer.frontWheels.forEach(fw => {
        fw.rotation.y = racer.steerAngle;
      });

      // All wheels spin
      meshContainer.allWheels.forEach(w => {
        w.rotation.x = racer.wheelRot;
      });

      // Driver bobbing head
      meshContainer.driverHead.rotation.z = -racer.steerAngle * 0.3;
      meshContainer.driverHead.position.y = 0.95 + Math.sin(Date.now() * 0.02) * 0.03;

      // Update Car Shadow position and yaw
      const shadow = this.shadowMeshes.get(racer.id);
      if (shadow) {
        shadow.position.set(racer.x, racer.y + 0.04, racer.z);
        shadow.rotation.y = racer.rotY;
      }

      // Chassis dynamic lean & pitch
      meshContainer.bodyGroup.rotation.x = racer.rotX || 0;
      meshContainer.bodyGroup.rotation.z = -racer.steerAngle * 0.14;

      // Dynamic glowing brake lights
      if (meshContainer.tailLightMat) {
        const isBraking = racer.id === this.localPlayerId 
          ? (this.localInput.brake > 0.1 && racer.speed > 0) 
          : (racer.speed < 12);
        meshContainer.tailLightMat.emissiveIntensity = isBraking ? 2.8 : 0.8;
      }

      // Skidmarks & Drift sparks
      if (racer.isDrifting) {
        this.skidMarks.addSkid(racer.id, racer.x, racer.y, racer.z, racer.rotY);
        const sparkLevel: 1 | 2 | 3 = (racer.driftChargeTime || 0) >= 2.6 ? 3 : ((racer.driftChargeTime || 0) >= 1.6 ? 2 : 1);
        _visFwd.set(Math.sin(racer.rotY), 0, Math.cos(racer.rotY));
        _visRight.set(_visFwd.z, 0, -_visFwd.x);

        const rLx = racer.x + _visFwd.x * -0.8 + _visRight.x * -0.75;
        const rLz = racer.z + _visFwd.z * -0.8 + _visRight.z * -0.75;
        const rRx = racer.x + _visFwd.x * -0.8 + _visRight.x * 0.75;
        const rRz = racer.z + _visFwd.z * -0.8 + _visRight.z * 0.75;

        this.particles.emitDriftSparks(rLx, racer.y, rLz, sparkLevel);
        this.particles.emitDriftSparks(rRx, racer.y, rRz, sparkLevel);
      } else {
        this.skidMarks.stopSkid(racer.id);
      }

      // Nitro flames
      if (racer.turboTimer > 0) {
        _visFwd.set(Math.sin(racer.rotY), 0, Math.cos(racer.rotY));
        _visRight.set(_visFwd.z, 0, -_visFwd.x);
        const exY = racer.y + 0.45;
        const exLx = racer.x + _visFwd.x * -1.4 + _visRight.x * -0.45;
        const exLz = racer.z + _visFwd.z * -1.4 + _visRight.z * -0.45;
        const exRx = racer.x + _visFwd.x * -1.4 + _visRight.x * 0.45;
        const exRz = racer.z + _visFwd.z * -1.4 + _visRight.z * 0.45;

        this.particles.emitNitroFlame(exLx, exY, exLz, racer.rotY);
        this.particles.emitNitroFlame(exRx, exY, exRz, racer.rotY);
      } else if (Math.abs(racer.speed) > 12 && Math.random() < 0.22) {
        _visFwd.set(Math.sin(racer.rotY), 0, Math.cos(racer.rotY));
        const exPosX = racer.x + _visFwd.x * -1.4;
        const exPosY = racer.y + 0.35;
        const exPosZ = racer.z + _visFwd.z * -1.4;
        this.particles.emitExhaustSmoke(exPosX, exPosY, exPosZ, racer.rotY);
      }

      // Shield mesh visibility
      const shield = this.shieldMeshes.get(racer.id);
      if (shield) {
        shield.visible = racer.hasShield;
        if (shield.visible) {
          shield.rotation.y += dt * 3;
        }
      }
    });
  }

  private updateRacePositions() {
    // In-place sort to prevent creating new array garbage every frame
    this.racers.sort((a, b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      if (a.checkpointIndex !== b.checkpointIndex) return b.checkpointIndex - a.checkpointIndex;
      return b.totalDistance - a.totalDistance;
    });

    for (let idx = 0; idx < this.racers.length; idx++) {
      this.racers[idx].position = idx + 1;
    }
  }

  private updateCamera(dt: number) {
    const player = this.racers.find(r => r.id === this.localPlayerId);
    if (!player) return;

    const isLookingBack = !!this.localInput.lookBehind;
    _camFwd.set(Math.sin(player.rotY), 0, Math.cos(player.rotY)).normalize();
    if (isLookingBack) {
      _camDir.copy(_camFwd);
    } else {
      _camDir.copy(_camFwd).negate();
    }
    const camDist = 7.5 + (player.turboTimer > 0 ? 1.4 : 0);
    const camHeight = 3.6;

    _targetCamPos.set(player.x, player.y + camHeight, player.z)
      .addScaledVector(_camDir, camDist);

    // Completely rock-solid camera damping without any jitter or shaking
    this.cameraShake = 0;
    this.camera.position.lerp(_targetCamPos, Math.min(dt * 8.0, 0.35));

    const lookAheadDist = isLookingBack ? -8 : 5.0;
    _camLookTarget.set(player.x, player.y + 1.25, player.z).addScaledVector(_camFwd, lookAheadDist);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(_camLookTarget);

    // Dynamic FOV for speed sensation - smooth and comfortable without fish-eye dizziness
    const targetFOV = player.turboTimer > 0 ? 76 : (player.speed > 25 ? 70 : 64);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, dt * 5);
    this.camera.updateProjectionMatrix();
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public getMinimapData(): {
    curvePoints: { x: number; z: number }[];
    racers: { id: string; x: number; z: number; color: string; isPlayer: boolean; position: number }[];
  } {
    if (!this.cachedMinimapPoints) {
      this.cachedMinimapPoints = this.trackData.checkpoints.map(cp => ({ x: cp.x, z: cp.z }));
    }
    if (this.cachedMinimapRacers.length !== this.racers.length) {
      this.cachedMinimapRacers = this.racers.map(r => ({
        id: r.id,
        x: r.x,
        z: r.z,
        color: r.color,
        isPlayer: r.id === this.localPlayerId,
        position: r.position,
      }));
    } else {
      for (let i = 0; i < this.racers.length; i++) {
        const r = this.racers[i];
        const mr = this.cachedMinimapRacers[i];
        mr.id = r.id;
        mr.x = r.x;
        mr.z = r.z;
        mr.color = r.color;
        mr.isPlayer = r.id === this.localPlayerId;
        mr.position = r.position;
      }
    }
    return { curvePoints: this.cachedMinimapPoints, racers: this.cachedMinimapRacers };
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    soundManager.stopMusic();

    this.particles.clear();
    this.skidMarks.clear();

    this.shadowMeshes.forEach(s => {
      this.scene.remove(s);
      s.geometry.dispose();
      (s.material as THREE.Material).dispose();
    });
    this.shadowMeshes.clear();

    if (this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
