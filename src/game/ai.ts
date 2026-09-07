import * as THREE from 'three';
import { RacerState, PlayerInput } from '../types';
import { TrackData } from './tracks';

const AI_TAUNTS = [
  "Söö mu tolmu! 💨",
  "Vaata ja õpi! 😎",
  "Puhas kiirus! ⚡",
  "Ei saa kätte! 😜",
  "Võta see! 🚀",
  "Hoia alt! 💥",
  "Ops, vabandust! 😈",
];

const AI_OUCHES = [
  "Ai kurja! 😵",
  "Kes selle siia pani?! 💣",
  "Küll ma sulle veel näitan! 😡",
  "Mu ilus värv! 💥",
  "Pöörab pea ringi! 💫",
];

export interface AIOpponentController {
  racerId: string;
  laneOffset: number; // -4.0 to +4.0 across track width
  targetLane: number;
  aggression: number;
  itemCooldown: number;
  tauntCooldown: number;
  reactionTimer: number;
}

export function createAIControllers(racers: RacerState[]): Map<string, AIOpponentController> {
  const map = new Map<string, AIOpponentController>();
  const aiRacers = racers.filter(r => r.isAI);

  aiRacers.forEach((r, idx) => {
    // Spread AI racers across distinct driving lines (-4.0, -1.5, 0, 1.5, 4.0)
    const laneOptions = [-3.8, -1.8, 0, 1.8, 3.8];
    const chosenLane = laneOptions[idx % laneOptions.length];

    map.set(r.id, {
      racerId: r.id,
      laneOffset: chosenLane,
      targetLane: chosenLane,
      aggression: 0.65 + Math.random() * 0.35,
      itemCooldown: 1.5 + Math.random() * 2.5,
      tauntCooldown: 6 + Math.random() * 8,
      reactionTimer: 0,
    });
  });

  return map;
}

/**
 * Calculates smooth, intelligent AI inputs (throttle, steer, drift, useItem, overtaking)
 */
export function computeAIInput(
  racer: RacerState,
  aiCtrl: AIOpponentController,
  track: TrackData,
  allRacers: RacerState[],
  dt: number,
  onUseItem?: (racerId: string) => void
): PlayerInput {
  aiCtrl.itemCooldown -= dt;
  aiCtrl.tauntCooldown -= dt;
  aiCtrl.reactionTimer -= dt;

  const carPos = new THREE.Vector3(racer.x, 0, racer.z);
  const trackInfo = track.getTrackInfo(carPos);

  // 1. Check if car is pointing backwards or in wrong direction
  let trackTangent = track.curve.getTangentAt(trackInfo.t).normalize();
  let trackHeading = Math.atan2(trackTangent.x, trackTangent.z);
  let headingDiff = trackHeading - racer.rotY;
  while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
  while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

  // If severely spun around (> 110 degrees), quickly steer towards track heading
  if (Math.abs(headingDiff) > 1.95 || racer.isWrongWay) {
    // Steer in direction that minimizes headingDiff
    const recoverySteer = headingDiff > 0 ? 1.0 : -1.0;
    return {
      throttle: racer.speed < 12 ? 0.9 : 0.4,
      brake: racer.speed > 20 ? 0.3 : 0,
      steer: recoverySteer,
      drift: false,
      useItem: false,
      honk: false,
    };
  }

  // 2. Dynamic Lane & Overtaking Logic
  if (aiCtrl.reactionTimer <= 0) {
    aiCtrl.reactionTimer = 0.35 + Math.random() * 0.3;

    // Check if another racer is blocking directly ahead (within 9m)
    const carAhead = allRacers.find(other => {
      if (other.id === racer.id) return false;
      const dx = other.x - racer.x;
      const dz = other.z - racer.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 9.0) {
        const angle = Math.atan2(dx, dz);
        let diff = Math.abs(angle - racer.rotY);
        while (diff > Math.PI) diff = Math.PI * 2 - diff;
        return diff < 0.4;
      }
      return false;
    });

    if (carAhead) {
      // Switch lane to slipstream and overtake
      aiCtrl.targetLane = aiCtrl.laneOffset > 0 ? -2.6 : 2.6;
    }
  }

  // Smoothly blend lane offset
  aiCtrl.laneOffset = THREE.MathUtils.lerp(aiCtrl.laneOffset, aiCtrl.targetLane, dt * 2.8);

  // 3. Smooth Lookahead Point along Continuous Spline
  // Scales with current vehicle speed (14m to 32m ahead)
  const lookaheadDist = THREE.MathUtils.clamp(racer.speed * 0.45 + 14, 15, 32);
  const totalLength = track.curve.getLength() || 700;
  const lookaheadFraction = lookaheadDist / totalLength;
  const safeBaseT = isNaN(trackInfo.t) ? 0 : ((trackInfo.t % 1.0) + 1.0) % 1.0;
  const lookaheadT = ((safeBaseT + lookaheadFraction) % 1.0 + 1.0) % 1.0;

  const targetPt = track.curve.getPointAt(lookaheadT);
  const targetTangent = track.curve.getTangentAt(lookaheadT).normalize();
  const upVec = new THREE.Vector3(0, 1, 0);
  const targetRight = new THREE.Vector3().crossVectors(targetTangent, upVec).normalize();

  // Offset along the track cross-section (stay safely inside road width)
  const safeLane = THREE.MathUtils.clamp(aiCtrl.laneOffset, -4.5, 4.5);
  const desiredTarget = targetPt.clone().addScaledVector(targetRight, safeLane);

  // 4. Compute Steering Angle
  // Left = -1, Right = +1
  const toTarget = new THREE.Vector3().subVectors(desiredTarget, carPos);
  const targetAngle = Math.atan2(toTarget.x, toTarget.z);

  let angleDiff = targetAngle - racer.rotY;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  // Steer towards target: positive when target is right, negative when target is left
  const steer = THREE.MathUtils.clamp(angleDiff * 2.6, -1, 1);

  // 5. Corner Anticipation & Throttle / Drift Control
  // Look slightly further ahead to detect sharp turns before entering them
  const curveAheadT = ((lookaheadT + 0.04) % 1.0 + 1.0) % 1.0;
  const curveAheadTangent = track.curve.getTangentAt(curveAheadT).normalize();
  const turnDot = targetTangent.dot(curveAheadTangent);
  const turnSharpness = Math.max(0, 1.0 - turnDot);

  let throttle = 1.0;
  let brake = 0.0;

  // Corner entry speed regulation
  if (turnSharpness > 0.08 && racer.speed > 24) {
    // Ease off throttle into curves to stay planted
    throttle = THREE.MathUtils.lerp(1.0, 0.45, (racer.speed - 24) / 12);
    if (racer.speed > 30) {
      brake = 0.25;
    }
  }

  // Drift through medium-to-sharp corners
  const isSharpTurn = (turnSharpness > 0.06 || Math.abs(angleDiff) > 0.32) && racer.speed > 16;
  const drift = isSharpTurn && (aiCtrl.aggression > 0.4 || Math.random() < 0.75);

  // 6. Intelligent Item Usage
  let useItem = false;
  if (racer.currentItem && aiCtrl.itemCooldown <= 0) {
    const item = racer.currentItem;

    if (item === 'turbo') {
      // Use turbo on straights
      if (Math.abs(angleDiff) < 0.25) {
        useItem = true;
        aiCtrl.itemCooldown = 2.0;
      }
    } else if (item === 'rocket' || item === 'trio_rockets') {
      // Fire if a rival is in forward target cone
      const rivalAhead = allRacers.find(other => {
        if (other.id === racer.id) return false;
        const dx = other.x - racer.x;
        const dz = other.z - racer.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 6 && dist < 55) {
          const angleToRival = Math.atan2(dx, dz);
          let diff = Math.abs(angleToRival - racer.rotY);
          while (diff > Math.PI) diff = Math.PI * 2 - diff;
          return diff < 0.55;
        }
        return false;
      });

      if (rivalAhead) {
        useItem = true;
        aiCtrl.itemCooldown = 3.0;
        if (Math.random() < 0.5) {
          racer.speechText = "Võta see! 🚀";
          racer.speechTimer = 2.0;
        }
      }
    } else if (item === 'mine') {
      // Drop if someone is trailing close behind
      const rivalBehind = allRacers.find(other => {
        if (other.id === racer.id) return false;
        const dist = Math.hypot(other.x - racer.x, other.z - racer.z);
        return dist < 18;
      });

      if (rivalBehind || Math.random() < 0.35) {
        useItem = true;
        aiCtrl.itemCooldown = 2.5;
        racer.speechText = "Vaata ette! 💣";
        racer.speechTimer = 2.0;
      }
    } else if (item === 'shield') {
      useItem = true;
      aiCtrl.itemCooldown = 4.0;
    } else if (item === 'lightning' || item === 'anvil') {
      useItem = true;
      aiCtrl.itemCooldown = 4.0;
    }
  }

  if (useItem && onUseItem) {
    onUseItem(racer.id);
  }

  // 7. Occasional Random Taunts
  if (aiCtrl.tauntCooldown <= 0 && !racer.speechText && Math.random() < 0.25) {
    aiCtrl.tauntCooldown = 12 + Math.random() * 10;
    racer.speechText = AI_TAUNTS[Math.floor(Math.random() * AI_TAUNTS.length)];
    racer.speechTimer = 2.2;
  }

  return {
    throttle,
    brake,
    steer,
    drift,
    useItem,
    honk: false,
  };
}
