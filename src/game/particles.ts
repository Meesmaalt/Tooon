import * as THREE from 'three';

export interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rotSpeed: number;
  scaleSpeed: number;
  life: number;
  maxLife: number;
  initialScale: number;
  baseOpacity: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private activeParticles: Particle[] = [];
  private particlePool: THREE.Mesh[] = [];

  // Pre-instantiated shared geometries
  private sparkGeo: THREE.SphereGeometry;
  private starGeo: THREE.BufferGeometry;
  private smokeGeo: THREE.SphereGeometry;
  private flameGeo: THREE.ConeGeometry;

  // Pre-instantiated shared materials (avoids WebGL shader thrashing & GC stalls)
  private smokeMat: THREE.MeshBasicMaterial;
  private flameCyanMat: THREE.MeshBasicMaterial;
  private flameOrangeMat: THREE.MeshBasicMaterial;
  private sparkYellowMat: THREE.MeshBasicMaterial;
  private sparkOrangeMat: THREE.MeshBasicMaterial;
  private sparkBlueMat: THREE.MeshBasicMaterial;
  private sparkPurpleMat: THREE.MeshBasicMaterial;
  private starMats: THREE.MeshBasicMaterial[];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sparkGeo = new THREE.SphereGeometry(0.12, 6, 6);
    this.smokeGeo = new THREE.SphereGeometry(0.22, 6, 6);
    this.flameGeo = new THREE.ConeGeometry(0.2, 0.6, 6);
    this.flameGeo.rotateX(Math.PI / 2);

    // Create a 5-pointed cartoon comic star geometry
    const starShape = new THREE.Shape();
    const points = 5;
    const outerR = 0.28;
    const innerR = 0.12;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i / (points * 2)) * Math.PI * 2;
      const sx = Math.cos(a) * r;
      const sy = Math.sin(a) * r;
      if (i === 0) starShape.moveTo(sx, sy);
      else starShape.lineTo(sx, sy);
    }
    this.starGeo = new THREE.ShapeGeometry(starShape);

    // Shared materials with fixed depth settings
    this.smokeMat = new THREE.MeshBasicMaterial({
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    this.flameCyanMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.flameOrangeMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.sparkYellowMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    this.sparkOrangeMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    this.sparkBlueMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    this.sparkPurpleMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    this.starMats = [0xfacc15, 0xef4444, 0xf97316, 0xffffff, 0xa855f7].map(
      (c) =>
        new THREE.MeshBasicMaterial({
          color: c,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        })
    );
  }

  private acquireMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    let mesh: THREE.Mesh;
    if (this.particlePool.length > 0) {
      mesh = this.particlePool.pop()!;
      mesh.geometry = geometry;
      mesh.material = material;
      mesh.visible = true;
    } else {
      mesh = new THREE.Mesh(geometry, material);
    }
    this.scene.add(mesh);
    return mesh;
  }

  private releaseMesh(mesh: THREE.Mesh) {
    this.scene.remove(mesh);
    mesh.visible = false;
    if (this.particlePool.length < 250) {
      this.particlePool.push(mesh);
    }
  }

  /**
   * Spawns exhaust smoke puff
   */
  public emitExhaustSmoke(x: number, y: number, z: number, carRotY: number) {
    if (this.activeParticles.length > 200) return;
    const mesh = this.acquireMesh(this.smokeGeo, this.smokeMat);
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.1,
      y + (Math.random() - 0.5) * 0.05,
      z + (Math.random() - 0.5) * 0.1
    );

    const fwdX = Math.sin(carRotY);
    const fwdZ = Math.cos(carRotY);

    this.activeParticles.push({
      mesh,
      vx: -fwdX * 1.5 + (Math.random() - 0.5) * 0.6,
      vy: 0.5 + Math.random() * 0.4,
      vz: -fwdZ * 1.5 + (Math.random() - 0.5) * 0.6,
      rotSpeed: (Math.random() - 0.5) * 2,
      scaleSpeed: 1.5,
      life: 0.45,
      maxLife: 0.45,
      initialScale: 1.0,
      baseOpacity: 0.55,
    });
  }

  /**
   * Spawns nitro boost flame jet
   */
  public emitNitroFlame(x: number, y: number, z: number, carRotY: number) {
    if (this.activeParticles.length > 200) return;
    const isCyan = Math.random() > 0.35;
    const mat = isCyan ? this.flameCyanMat : this.flameOrangeMat;
    const mesh = this.acquireMesh(this.flameGeo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = carRotY;

    const fwdX = Math.sin(carRotY);
    const fwdZ = Math.cos(carRotY);

    this.activeParticles.push({
      mesh,
      vx: -fwdX * 6 + (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.3,
      vz: -fwdZ * 6 + (Math.random() - 0.5) * 0.6,
      rotSpeed: 0,
      scaleSpeed: 0.7,
      life: 0.18,
      maxLife: 0.18,
      initialScale: 1.0,
      baseOpacity: 0.85,
    });
  }

  /**
   * Spawns drift sparks (yellow, orange, blue, or purple based on tier)
   */
  public emitDriftSparks(x: number, y: number, z: number, level: 1 | 2 | 3) {
    if (this.activeParticles.length > 200) return;
    const count = 2;
    for (let i = 0; i < count; i++) {
      const mat =
        level === 3
          ? this.sparkPurpleMat
          : level === 2
          ? (Math.random() > 0.5 ? this.sparkOrangeMat : this.sparkYellowMat)
          : this.sparkBlueMat;

      const mesh = this.acquireMesh(this.sparkGeo, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.2,
        y + 0.1,
        z + (Math.random() - 0.5) * 0.2
      );

      this.activeParticles.push({
        mesh,
        vx: (Math.random() - 0.5) * 3.5,
        vy: 1.4 + Math.random() * 2.2,
        vz: (Math.random() - 0.5) * 3.5,
        rotSpeed: (Math.random() - 0.5) * 5,
        scaleSpeed: -0.5,
        life: 0.3,
        maxLife: 0.3,
        initialScale: 0.9,
        baseOpacity: 0.9,
      });
    }
  }

  /**
   * Spawns bump / collision sparks
   */
  public emitSparks(x: number, y: number, z: number, colorHex: number = 0xffd700, count: number = 6) {
    for (let i = 0; i < Math.min(count, 8); i++) {
      const mat = Math.random() > 0.5 ? this.sparkYellowMat : this.sparkOrangeMat;
      const mesh = this.acquireMesh(this.sparkGeo, mat);
      mesh.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4;

      this.activeParticles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 1.2 + Math.random() * 2.5,
        vz: Math.sin(angle) * speed,
        rotSpeed: 0,
        scaleSpeed: -0.4,
        life: 0.28,
        maxLife: 0.28,
        initialScale: 1.0,
        baseOpacity: 0.9,
      });
    }
  }

  /**
   * Spawns explosion burst of comic stars & smoke clouds
   */
  public emitExplosion(x: number, y: number, z: number) {
    // Stars
    for (let i = 0; i < 12; i++) {
      const mat = this.starMats[i % this.starMats.length];
      const mesh = this.acquireMesh(this.starGeo, mat);
      mesh.position.set(x, y + 0.5, z);

      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 5 + Math.random() * 6;

      this.activeParticles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 4,
        vz: Math.sin(angle) * speed,
        rotSpeed: (Math.random() - 0.5) * 8,
        scaleSpeed: -0.6,
        life: 0.45,
        maxLife: 0.45,
        initialScale: 1.2,
        baseOpacity: 0.95,
      });
    }

    // Accompanying smoke puffs
    for (let i = 0; i < 6; i++) {
      const mesh = this.acquireMesh(this.smokeGeo, this.smokeMat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.8,
        y + 0.4 + Math.random() * 0.5,
        z + (Math.random() - 0.5) * 0.8
      );

      this.activeParticles.push({
        mesh,
        vx: (Math.random() - 0.5) * 3,
        vy: 1.5 + Math.random() * 2,
        vz: (Math.random() - 0.5) * 3,
        rotSpeed: (Math.random() - 0.5) * 2,
        scaleSpeed: 2.2,
        life: 0.6,
        maxLife: 0.6,
        initialScale: 1.4,
        baseOpacity: 0.6,
      });
    }
  }

  /**
   * Spawns item box shatter celebration particles
   */
  public emitBoxBreak(x: number, y: number, z: number) {
    for (let i = 0; i < 10; i++) {
      const mat = this.starMats[i % this.starMats.length];
      const mesh = this.acquireMesh(this.starGeo, mat);
      mesh.position.set(x, y + 0.5, z);
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 3.5 + Math.random() * 3.5;

      this.activeParticles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 2.5 + Math.random() * 2.5,
        vz: Math.sin(angle) * speed,
        rotSpeed: (Math.random() - 0.5) * 6,
        scaleSpeed: -0.4,
        life: 0.4,
        maxLife: 0.4,
        initialScale: 0.8,
        baseOpacity: 0.95,
      });
    }
  }

  /**
   * Updates all active particles smoothly
   */
  public update(dt: number) {
    const alive: Particle[] = [];

    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.releaseMesh(p.mesh);
      } else {
        // Move
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;

        // Apply slight gravity
        p.vy -= 8.5 * dt * 0.6;

        // Rotate
        p.mesh.rotation.y += p.rotSpeed * dt;
        p.mesh.rotation.z += p.rotSpeed * dt;

        // Scale
        const lifeRatio = p.life / p.maxLife;
        const currentScale = Math.max(0.01, p.initialScale * (1 + (1 - lifeRatio) * p.scaleSpeed));
        p.mesh.scale.set(currentScale, currentScale, currentScale);

        alive.push(p);
      }
    }

    this.activeParticles = alive;
  }

  public clear() {
    this.activeParticles.forEach((p) => {
      this.releaseMesh(p.mesh);
    });
    this.activeParticles = [];
  }
}
