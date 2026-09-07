import * as THREE from 'three';
import { RacerState, PlayerInput, Projectile, CarDefinition } from '../types';
import { TrackData } from './tracks';
import { CAR_DEFINITIONS } from './cars';
import { getRandomPowerUp } from './powerups';
import { soundManager } from '../audio/soundManager';

// Pre-allocated static scratch vectors for zero-allocation physics updates
const _physCarPos = new THREE.Vector3();
const _physCarFwd = new THREE.Vector3();
const _physForwardDir = new THREE.Vector3();

export interface CollisionEvent {
  type: 'car_bump' | 'wall_hit' | 'item_box' | 'rocket_hit' | 'blue_rocket_hit' | 'thundercloud_strike' | 'banana_hit' | 'mine_hit' | 'boost_pad';
  racerId: string;
  targetId?: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Updates physics for a single racer over delta time
 */
export function updateRacerPhysics(
  racer: RacerState,
  input: PlayerInput,
  track: TrackData,
  dt: number,
  onCollision?: (event: CollisionEvent) => void,
  speedFactor: number = 1.0
) {
  // Prefer cached def on racer if present (avoids Array.find every frame)
  const carDef = (racer as any)._carDef || CAR_DEFINITIONS.find(c => c.id === racer.carId) || CAR_DEFINITIONS[0];
  (racer as any)._carDef = carDef;
  const isIceTrack = track.theme === 'ice';
  
  // Tuned for polished, realistic arcade racing: satisfying sense of speed, full control, and zero twitchiness
  const maxBaseSpeed = (23.0 + carDef.stats.speed * 0.85) * speedFactor;
  const accelPower = (16.0 + carDef.stats.accel * 1.2) * speedFactor;
  const handlingPower = (2.1 + carDef.stats.handling * 0.15) * (isIceTrack ? 0.90 : 1.0);

  // Handle respawn / reset
  if (input.respawn) {
    input.respawn = false;
    const cp = track.checkpoints[racer.checkpointIndex];
    const nextCp = track.checkpoints[(racer.checkpointIndex + 1) % track.checkpoints.length];
    _physForwardDir.subVectors(nextCp, cp).normalize();
    racer.x = cp.x;
    racer.y = cp.y + 0.3;
    racer.z = cp.z;
    racer.rotY = Math.atan2(_physForwardDir.x, _physForwardDir.z);
    racer.speed = 0;
    racer.spinTimer = 0;
    racer.frozenTimer = 0;
    racer.driftChargeTime = 0;
    racer.rotX = 0;
    soundManager.playRespawn();
    return;
  }

  // Handle spinout (e.g. hit by rocket or mine)
  if (racer.spinTimer > 0) {
    racer.spinTimer -= dt;
    racer.rotY += Math.PI * 5 * dt; // Spin out
    racer.speed = Math.max(0, racer.speed - 24 * dt);

    // Apply motion
    racer.x += Math.sin(racer.rotY) * racer.speed * dt * 0.3;
    racer.z += Math.cos(racer.rotY) * racer.speed * dt * 0.3;
    return;
  }

  // Handle frozen / zap
  if (racer.frozenTimer > 0) {
    racer.frozenTimer -= dt;
  }

  // Handle turbo & star
  let speedMultiplier = 1.0;
  if (racer.turboTimer > 0) {
    racer.turboTimer -= dt;
    speedMultiplier = Math.max(speedMultiplier, 1.36);
  }
  if (racer.starTimer > 0) {
    racer.starTimer -= dt;
    speedMultiplier = Math.max(speedMultiplier, 1.45);
  }
  if (racer.frozenTimer > 0 && !(racer.starTimer > 0)) {
    speedMultiplier *= 0.58;
  }

  // Acceleration & Braking
  const topSpeed = maxBaseSpeed * speedMultiplier;
  if (input.throttle > 0) {
    if (racer.speed < topSpeed) {
      racer.speed = Math.min(topSpeed, racer.speed + accelPower * input.throttle * dt);
    } else {
      racer.speed = THREE.MathUtils.lerp(racer.speed, topSpeed, dt * 3.0);
    }
  } else if (input.brake > 0) {
    if (racer.speed > -10) {
      racer.speed -= accelPower * 1.5 * input.brake * dt;
    }
  } else {
    // Natural rolling friction & aerodynamic drag
    const dragRate = isIceTrack ? 3.8 : 6.8;
    if (racer.speed > 0) {
      racer.speed = Math.max(0, racer.speed - dragRate * dt);
    } else if (racer.speed < 0) {
      racer.speed = Math.min(0, racer.speed + dragRate * dt);
    }
  }

  // Drifting mechanic & 3-Tier Mini-Turbo Charging
  racer.isDrifting = (input.drift || (isIceTrack && Math.abs(input.steer) > 0.85)) && Math.abs(racer.speed) > 7;
  if (racer.isDrifting) {
    racer.driftFactor = Math.min(1.4, racer.driftFactor + dt * (isIceTrack ? 1.5 : 1.2));
    racer.driftChargeTime = (racer.driftChargeTime || 0) + dt;
    // Controlled drift friction
    racer.speed = Math.max(9, racer.speed - (isIceTrack ? 1.0 : 2.0) * dt);
  } else {
    // Check if player just released a charged drift! (Classic 3 tiers)
    if (racer.driftChargeTime >= 0.75) {
      if (racer.driftChargeTime >= 2.6) {
        // Tier 3: Ultra Mini-Turbo (Purple sparks)
        racer.turboTimer = 2.4;
        racer.speed = Math.max(racer.speed + 13, maxBaseSpeed * 1.32);
        soundManager.playTurbo();
      } else if (racer.driftChargeTime >= 1.6) {
        // Tier 2: Super Mini-Turbo (Orange sparks)
        racer.turboTimer = 1.7;
        racer.speed = Math.max(racer.speed + 8.5, maxBaseSpeed * 1.22);
        soundManager.playTurbo();
      } else {
        // Tier 1: Standard Mini-Turbo (Blue sparks)
        racer.turboTimer = 1.0;
        racer.speed = Math.max(racer.speed + 5.5, maxBaseSpeed * 1.12);
        soundManager.playMiniTurbo();
      }
    }
    racer.driftChargeTime = 0;
    racer.driftFactor = Math.max(0, racer.driftFactor - dt * 2.5);
  }

  // Progressive, weighted steering damping (Left = -1, Right = +1)
  const targetSteerAngle = input.steer * 0.38;
  const steerLerpSpeed = Math.abs(input.steer) > 0.05 ? 12.0 : 16.0;
  racer.steerAngle = THREE.MathUtils.lerp(racer.steerAngle, targetSteerAngle, dt * steerLerpSpeed);

  if (Math.abs(racer.speed) > 0.5) {
    const speedSteerFactor = THREE.MathUtils.clamp(Math.abs(racer.speed) / 14, 0.45, 1.0);
    const driftSteerBonus = racer.isDrifting ? 1.32 : 1.0;
    const direction = racer.speed >= 0 ? 1 : -1;
    racer.rotY += racer.steerAngle * handlingPower * speedSteerFactor * driftSteerBonus * dt * direction;
  }

  // Position movement with authentic drift lateral slip
  const moveSpeed = racer.speed * dt;
  const driftSlip = racer.isDrifting ? racer.steerAngle * 0.26 : 0;
  const moveHeading = racer.rotY + driftSlip;
  racer.x += Math.sin(moveHeading) * moveSpeed;
  racer.z += Math.cos(moveHeading) * moveSpeed;

  // Accurate track centerline query using the continuous spline helper
  _physCarPos.set(racer.x, racer.y, racer.z);
  const trackInfo = track.getTrackInfo(_physCarPos, racer.centerlineIndex);
  racer.centerlineIndex = trackInfo.closestIndex;
  racer.trackT = trackInfo.t;
  racer.currentSurface = trackInfo.surface || 'asphalt';
  racer.surfaceName = trackInfo.surfaceName || 'Rannatee';
  racer.surfaceIcon = trackInfo.surfaceIcon || '🛣️';

  // Height adherence
  const targetY = trackInfo.closestPoint.y;
  if (Math.abs(racer.y - targetY) < 0.02) {
    racer.y = targetY;
  } else {
    racer.y = THREE.MathUtils.lerp(racer.y, targetY, Math.min(1.0, dt * 18.0));
  }

  // Authentic road slope pitch (tilt up on uphills, down on downhills smoothly)
  const slopePitch = Math.asin(THREE.MathUtils.clamp(trackInfo.tangent.y, -0.65, 0.65));
  let targetRotX = -slopePitch;
  if (input.brake > 0 && racer.speed > 5) {
    targetRotX += 0.03;
  }
  racer.rotX = THREE.MathUtils.lerp(racer.rotX || 0, targetRotX, Math.min(1.0, dt * 8.0));

  // Wrong-Way orientation check against track tangent
  _physCarFwd.set(Math.sin(racer.rotY), 0, Math.cos(racer.rotY));
  const dot = _physCarFwd.dot(trackInfo.tangent);
  racer.isWrongWay = dot < -0.35 && racer.speed > 8;

  // Update racer surface states from track info
  racer.currentSurface = trackInfo.surface || 'asphalt';
  racer.surfaceName = trackInfo.surfaceName || 'Rannatee';
  racer.surfaceIcon = trackInfo.surfaceIcon || '🛣️';

  // Off-road terrain and surface-specific handling
  if (trackInfo.isOffroad) {
    // Off-road decelerates car to a moderate safe speed, but doesn't bounce or teleport!
    // Turbo bypasses offroad slowdown (just like Mario Kart mushroom cutting corners!)
    if (racer.turboTimer <= 0) {
      const offroadMax = 22;
      if (racer.speed > offroadMax) {
        racer.speed = Math.max(offroadMax, racer.speed - 28 * dt);
      }
    }
  } else if (trackInfo.isOnCurb) {
    // Subtle curb drag
    if (racer.turboTimer <= 0 && racer.speed > 36) {
      racer.speed -= 4.0 * dt;
    }
  } else {
    // Dynamic Road Surface Modifiers
    switch (racer.currentSurface) {
      case 'sand':
        // Soft beach sand causes slight drag unless in turbo
        if (racer.turboTimer <= 0 && racer.speed > 35) {
          racer.speed -= 7.0 * dt;
        }
        break;
      case 'ice':
        // Ice maintains momentum with minimal friction, slips in turns
        if (Math.abs(input.steer) > 0.4) {
          racer.rotY += racer.steerAngle * 0.4 * dt;
        }
        break;
      case 'wood':
        // Pier planks: rhythmic gentle rolling resistance
        if (racer.turboTimer <= 0 && racer.speed > 39) {
          racer.speed -= 3.0 * dt;
        }
        break;
      case 'cobblestone':
        // Cobblestone gives great feedback and faster mini-turbo charging
        if (racer.isDrifting) {
          racer.driftChargeTime = (racer.driftChargeTime || 0) + dt * 0.25;
        }
        break;
      case 'dirt':
        // Rally dirt: easily initiates power-slides
        if (Math.abs(input.steer) > 0.6 && racer.speed > 16) {
          racer.isDrifting = true;
        }
        break;
      case 'glass':
      case 'cyber_grid':
        // Ultra smooth high-tech surface gives a slight top speed boost
        if (racer.speed > 25 && input.throttle > 0) {
          racer.speed += 2.2 * dt;
        }
        break;
      case 'magma_rock':
        // Basalt rock: intense traction
        break;
    }
  }

  // Outer track boundary collision (soft barrier bounce)
  if (trackInfo.isWallHit) {
    const maxPlayableRadius = (track.trackWidth * 0.5) + 10.0;
    const excess = trackInfo.distanceToCenter - maxPlayableRadius;

    if (excess > 0) {
      // Gently push car back toward track centerline without sudden teleportation
      racer.x += trackInfo.wallNormal.x * Math.min(excess, 0.4);
      racer.z += trackInfo.wallNormal.z * Math.min(excess, 0.4);

      // Dampen velocity
      racer.speed *= 0.88;

      if (Math.abs(racer.speed) > 18) {
        if (onCollision) {
          onCollision({
            type: 'wall_hit',
            racerId: racer.id,
            x: racer.x,
            y: racer.y,
            z: racer.z,
          });
        }
      }
    }
  }

  // Checkpoint & Lap progression
  const numCp = track.checkpoints.length;
  for (let offset = 1; offset <= 3; offset++) {
    const candidateIdx = (racer.checkpointIndex + offset) % numCp;
    const distToCp = _physCarPos.distanceTo(track.checkpoints[candidateIdx]);

    if (distToCp < 34) {
      // Crossed start/finish line to finish a lap
      if (candidateIdx === 0 && racer.checkpointIndex > numCp - 10) {
        racer.lap += 1;
        const now = Date.now();
        if (racer.currentLapStartTime > 0) {
          const lapDuration = (now - racer.currentLapStartTime) / 1000;
          racer.lapTimes.push(lapDuration);
          if (!racer.bestLapTime || lapDuration < racer.bestLapTime) {
            racer.bestLapTime = lapDuration;
          }
        }
        racer.currentLapStartTime = now;
      }
      racer.checkpointIndex = candidateIdx;
      racer.totalDistance += 20 * offset;
      break;
    }
  }

  // Item box pickups — HARD rule: max 1 item held; never pick while holding or on cooldown
  if (racer.itemBoxCooldown && racer.itemBoxCooldown > 0) {
    racer.itemBoxCooldown -= dt;
  }

  // Must not already hold an item (strict)
  if (racer.currentItem == null && (!racer.itemBoxCooldown || racer.itemBoxCooldown <= 0)) {
    // Horizontal-only distance (Y weighting caused missed pickups on hills/bumps)
    // Slightly larger radius + swept check so high speed doesn't skip boxes
    const hitR = 3.4;
    const hitRSq = hitR * hitR;
    let bestBox: typeof track.itemBoxes[0] | null = null;
    let bestD = hitRSq;

    for (const box of track.itemBoxes) {
      if (!box.active) continue;
      const dx = racer.x - box.x;
      const dz = racer.z - box.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestD) {
        bestD = dSq;
        bestBox = box;
      }
    }

    if (bestBox) {
      // Clear WHOLE station (all boxes near this one) — one car, one grant
      for (const other of track.itemBoxes) {
        if (!other.active) continue;
        const near = Math.hypot(other.x - bestBox.x, other.z - bestBox.z);
        if (near < 14) {
          other.active = false;
          other.respawnTime = 6;
          other.mesh.visible = false;
        }
      }
      // Lock out further pickups until item is used + short extra cooldown after use is separate
      racer.itemBoxCooldown = 5.0;
      racer.currentItem = getRandomPowerUp(Math.max(1, racer.position || 1), 6);

      if (onCollision) {
        onCollision({
          type: 'item_box',
          racerId: racer.id,
          x: bestBox.x,
          y: bestBox.y,
          z: bestBox.z,
        });
      }
    }
  }

  // Boost pad trigger (3D distance check)
  track.boostPads.forEach(pad => {
    const padDist = Math.hypot(racer.x - pad.x, (racer.y - pad.y) * 1.5, racer.z - pad.z);
    if (padDist < 4.8) {
      racer.turboTimer = 2.2;
      racer.speed = Math.max(racer.speed + 10, maxBaseSpeed * 1.34);

      if (onCollision) {
        onCollision({
          type: 'boost_pad',
          racerId: racer.id,
          x: pad.x,
          y: pad.y,
          z: pad.z,
        });
      }
    }
  });

  // Shield timer decay
  if (racer.shieldTimer > 0) {
    racer.shieldTimer -= dt;
    if (racer.shieldTimer <= 0) {
      racer.hasShield = false;
    }
  }

  // Speech bubble decay
  if (racer.speechTimer && racer.speechTimer > 0) {
    racer.speechTimer -= dt;
    if (racer.speechTimer <= 0) {
      racer.speechText = undefined;
    }
  }

  // Animation values
  racer.wheelRot += (racer.speed / 0.38) * dt;
  racer.bounceOffset = 0;
}

/**
 * Handles elastic collision between two cartoon cars (Smooth Bumping!)
 */
export function resolveCarCarCollisions(racers: RacerState[], dt: number, onCollision?: (event: CollisionEvent) => void) {
  const carRadius = 1.35;

  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i];
      const b = racers[j];

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);

      if (dist < carRadius * 2 && dist > 0.001) {
        const overlap = (carRadius * 2) - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        // Smooth non-jittery separation
        const pushDist = Math.min(overlap * 0.5, 0.25);
        a.x -= nx * pushDist;
        a.z -= nz * pushDist;
        b.x += nx * pushDist;
        b.z += nz * pushDist;

        // Bounce relative speeds
        const relSpeed = a.speed - b.speed;
        a.speed -= relSpeed * 0.2;
        b.speed += relSpeed * 0.2;

        // Star & Shield ramming bonus!
        if (a.starTimer > 0 && !(b.starTimer > 0)) {
          b.spinTimer = 1.6;
          b.speed *= 0.15;
        } else if (b.starTimer > 0 && !(a.starTimer > 0)) {
          a.spinTimer = 1.6;
          a.speed *= 0.15;
        } else if (a.hasShield && !b.hasShield) {
          b.spinTimer = 1.2;
          b.speed *= 0.2;
        } else if (b.hasShield && !a.hasShield) {
          a.spinTimer = 1.2;
          a.speed *= 0.2;
        }

        if (onCollision && (Math.abs(relSpeed) > 6 || Math.abs(a.speed) > 15)) {
          onCollision({
            type: 'car_bump',
            racerId: a.id,
            targetId: b.id,
            x: (a.x + b.x) * 0.5,
            y: (a.y + b.y) * 0.5,
            z: (a.z + b.z) * 0.5,
          });
        }
      }
    }
  }
}

/**
 * Updates projectiles (Rockets, Blue Rockets, Thunderclouds, Bananas, Mines)
 */
export function updateProjectiles(
  projectiles: Projectile[],
  racers: RacerState[],
  dt: number,
  onCollision: (event: CollisionEvent) => void
) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.active) continue;

    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }

    if (p.type === 'rocket') {
      // Red Rocket: short-range homing — retarget nearest non-owner if needed
      let target = p.targetId ? racers.find(r => r.id === p.targetId && !r.finished) : undefined;
      if (!target) {
        let bestD = 55;
        for (const r of racers) {
          if (r.id === p.ownerId || r.finished) continue;
          const d = Math.hypot(r.x - p.x, r.z - p.z);
          if (d < bestD) { bestD = d; target = r; }
        }
        if (target) p.targetId = target.id;
      }
      if (target) {
        const dx = target.x - p.x;
        const dz = target.z - p.z;
        const targetDist = Math.hypot(dx, dz);
        if (targetDist > 0.1) {
          const spd = 58;
          const steerX = (dx / targetDist) * spd;
          const steerZ = (dz / targetDist) * spd;
          p.vx = THREE.MathUtils.lerp(p.vx, steerX, dt * 9);
          p.vz = THREE.MathUtils.lerp(p.vz, steerZ, dt * 9);
          p.y = THREE.MathUtils.lerp(p.y, target.y + 0.45, dt * 6);
        }
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;

      // Collision (owner grace ~0.45s based on remaining life when spawned at 4.2)
      for (const racer of racers) {
        if (racer.id === p.ownerId && p.life > 3.75) continue;

        const dist = Math.hypot(racer.x - p.x, racer.z - p.z);
        if (dist < 2.35) {
          p.active = false;

          if (racer.starTimer > 0) {
            // Star invincibility deflects rocket!
          } else if (racer.hasShield) {
            racer.hasShield = false;
            racer.shieldTimer = 0;
          } else {
            racer.spinTimer = 1.8;
            racer.speed *= 0.1;
          }

          onCollision({
            type: 'rocket_hit',
            racerId: p.ownerId,
            targetId: racer.id,
            x: p.x,
            y: p.y,
            z: p.z,
          });
          break;
        }
      }
    } else if (p.type === 'blue_rocket') {
      // Blue Rocket: relentless leader hunter! Flies until it catches 1st place!
      let target = racers.find(r => r.position === 1 && r.id !== p.ownerId);
      if (!target) {
        // If owner is 1st place, target 2nd place
        target = racers.find(r => r.position === 2 && r.id !== p.ownerId);
      }
      if (!target) {
        target = racers.find(r => r.id !== p.ownerId);
      }

      if (target) {
        p.targetId = target.id;
        const dx = target.x - p.x;
        const dz = target.z - p.z;
        const targetDist = Math.hypot(dx, dz);

        if (targetDist > 0.1) {
          const chaseSpeed = 88;
          const steerX = (dx / targetDist) * chaseSpeed;
          const steerZ = (dz / targetDist) * chaseSpeed;
          p.vx = THREE.MathUtils.lerp(p.vx, steerX, dt * 10);
          p.vz = THREE.MathUtils.lerp(p.vz, steerZ, dt * 10);
          p.y = THREE.MathUtils.lerp(p.y, target.y + 0.6, dt * 6);
        }

        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.y += p.vy * dt;

        // Check distance to target or any car in the way
        if (targetDist < 2.6) {
          p.active = false;

          // Mega explosion blast on leader!
          if (!(target.starTimer > 0)) {
            if (target.hasShield) {
              target.hasShield = false;
              target.shieldTimer = 0;
            } else {
              target.spinTimer = 2.8;
              target.speed = 0;
            }
          }

          // Also splash damage nearby cars
          for (const other of racers) {
            if (other.id === target.id) continue;
            const splashDist = Math.hypot(other.x - p.x, other.z - p.z);
            if (splashDist < 7.5 && !(other.starTimer > 0)) {
              other.spinTimer = 1.6;
              other.speed *= 0.3;
            }
          }

          onCollision({
            type: 'blue_rocket_hit',
            racerId: p.ownerId,
            targetId: target.id,
            x: target.x,
            y: target.y + 0.6,
            z: target.z,
          });
        }
      } else {
        // Fallback forward movement
        p.x += p.vx * dt;
        p.z += p.vz * dt;
      }
    } else if (p.type === 'thundercloud') {
      // Thundercloud: stays stationary until opponent is near, then chases for ~3.5s and strikes!
      p.state = p.state || 'idle';

      if (p.state === 'idle') {
        // Bob height while waiting (visual handled in mesh sync too)
        p.y += Math.sin((60 - p.life) * 3) * 0.002;
        for (const racer of racers) {
          if (racer.id === p.ownerId && p.life > 57.5) continue; // brief owner grace

          const dist = Math.hypot(racer.x - p.x, racer.z - p.z);
          if (dist < 11) {
            p.state = 'chasing';
            p.targetId = racer.id;
            p.timer = 3.2;
            break;
          }
        }
      } else if (p.state === 'chasing') {
        let target = racers.find(r => r.id === p.targetId && !r.finished);
        // If original target finished, chase nearest
        if (!target) {
          let best = 40;
          for (const r of racers) {
            if (r.id === p.ownerId || r.finished) continue;
            const d = Math.hypot(r.x - p.x, r.z - p.z);
            if (d < best) { best = d; target = r; }
          }
          if (target) p.targetId = target.id;
        }
        if (target) {
          p.x = THREE.MathUtils.lerp(p.x, target.x, dt * 12);
          p.y = THREE.MathUtils.lerp(p.y, target.y + 2.5, dt * 10);
          p.z = THREE.MathUtils.lerp(p.z, target.z, dt * 12);

          p.timer = (p.timer || 3.2) - dt;

          if (p.timer <= 0) {
            // THUNDERBOLT STRIKE!
            p.active = false;

            if (target.starTimer > 0) {
              // Immune with star
            } else if (target.hasShield) {
              target.hasShield = false;
              target.shieldTimer = 0;
            } else {
              target.spinTimer = 2.4;
              target.frozenTimer = 3.2;
              target.speed *= 0.25;
            }

            onCollision({
              type: 'thundercloud_strike',
              racerId: p.ownerId,
              targetId: target.id,
              x: target.x,
              y: target.y,
              z: target.z,
            });
          }
        } else {
          p.active = false;
        }
      }
    } else if (p.type === 'banana') {
      // Stationary banana peel trap: triggers spinout on anyone who runs over it
      for (const racer of racers) {
        if (racer.id === p.ownerId && p.life > 28.5) continue; // 1.5s grace for dropper

        const dist = Math.hypot(racer.x - p.x, racer.z - p.z);
        if (dist < 2.0) {
          p.active = false;

          if (racer.starTimer > 0) {
            // Squashed harmlessly
          } else if (racer.hasShield) {
            racer.hasShield = false;
            racer.shieldTimer = 0;
          } else {
            racer.spinTimer = 1.7; // 360 degree spinout
            racer.speed *= 0.35;
          }

          onCollision({
            type: 'banana_hit',
            racerId: p.ownerId,
            targetId: racer.id,
            x: p.x,
            y: p.y,
            z: p.z,
          });
          break;
        }
      }
    } else if (p.type === 'mine') {
      // Explosive TNT bomb
      for (const racer of racers) {
        if (racer.id === p.ownerId && p.life > 14.5) continue;

        const dist = Math.hypot(racer.x - p.x, racer.z - p.z);
        if (dist < 2.2) {
          p.active = false;

          if (racer.starTimer > 0) {
            // Immune
          } else if (racer.hasShield) {
            racer.hasShield = false;
            racer.shieldTimer = 0;
          } else {
            racer.spinTimer = 2.0;
            racer.speed *= 0.1;
          }

          onCollision({
            type: 'mine_hit',
            racerId: p.ownerId,
            targetId: racer.id,
            x: p.x,
            y: p.y,
            z: p.z,
          });
          break;
        }
      }
    }
  }
}


/**
 * Arcade slipstream: slight speed bonus when drafting behind another car
 */
export function applySlipstream(racers: RacerState[], dt: number) {
  for (let i = 0; i < racers.length; i++) {
    const r = racers[i];
    if (r.finished || r.spinTimer > 0) continue;
    let best = 0;
    for (let j = 0; j < racers.length; j++) {
      if (i === j) continue;
      const o = racers[j];
      const dx = o.x - r.x;
      const dz = o.z - r.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3.5 || dist > 14) continue;
      // Other should be roughly ahead of us
      const fwdX = Math.sin(r.rotY);
      const fwdZ = Math.cos(r.rotY);
      const dot = (dx * fwdX + dz * fwdZ) / dist;
      if (dot < 0.65) continue; // not in front cone
      best = Math.max(best, 1 - (dist - 3.5) / 10.5);
    }
    if (best > 0.05) {
      r.speed += 6.5 * best * dt;
      (r as any).inSlipstream = true;
    } else {
      (r as any).inSlipstream = false;
    }
  }
}
