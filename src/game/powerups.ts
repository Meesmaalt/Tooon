import * as THREE from 'three';
import { PowerUpType } from '../types';

export interface PowerUpInfo {
  type: PowerUpType;
  name: string;
  icon: string;
  description: string;
  rarityWeight: number; // Higher = more common when trailing behind
}

export const POWER_UPS: Record<PowerUpType, PowerUpInfo> = {
  rocket: {
    type: 'rocket',
    name: 'Rakett',
    icon: '🚀',
    description: 'Jälitav rakett! Tulistab ettepoole ja tabab lähimat vastast.',
    rarityWeight: 30,
  },
  trio_rockets: {
    type: 'trio_rockets',
    name: '3x Raketti',
    icon: '🎯',
    description: 'Kolm kiiret raketti laiali lehvikuna vastaste rivi purustamiseks!',
    rarityWeight: 15,
  },
  mine: {
    type: 'mine',
    name: 'TNT Miin',
    icon: '💣',
    description: 'Viskab taha tiksuva pommi. Otsasõitja lendab spinniga õhku!',
    rarityWeight: 25,
  },
  shield: {
    type: 'shield',
    name: 'Mullkilp',
    icon: '🛡️',
    description: 'Kaitsev energiamull, mis neelab rünnakud ja tõukab vastaseid.',
    rarityWeight: 20,
  },
  turbo: {
    type: 'turbo',
    name: 'Super Nitro',
    icon: '⚡',
    description: 'Võimas kiirussööst ja leegid summutist!',
    rarityWeight: 25,
  },
  lightning: {
    type: 'lightning',
    name: 'Välk',
    icon: '🌩️',
    description: 'Lööb kõiki teisi sõitjaid välguga ja aeglustab neid 3 sekundiks!',
    rarityWeight: 10,
  },
  anvil: {
    type: 'anvil',
    name: '10T Alasi',
    icon: '🔨',
    description: 'Kukutab võistluse liidrile pähe tohutu koomiksialasi!',
    rarityWeight: 10,
  },
  repair: {
    type: 'repair',
    name: 'Kiirparandus',
    icon: '🔧',
    description: 'Taastab auto stabiilsuse ja annab väikese lisakiirenduse.',
    rarityWeight: 15,
  },
};

/**
 * Weighted random power-up picker based on current race position (Rubber-banding!)
 * Trailing racers (4th-6th) get better offensive & speed items like Rocket, Turbo, Lightning.
 * Leader (1st) gets defensive items like Mine or Shield.
 */
export function getRandomPowerUp(position: number, totalRacers: number = 6): PowerUpType {
  const isLeader = position === 1;
  const isTrailing = position >= 4;

  const pool: { type: PowerUpType; weight: number }[] = [];

  if (isLeader) {
    pool.push({ type: 'mine', weight: 45 });
    pool.push({ type: 'shield', weight: 35 });
    pool.push({ type: 'repair', weight: 15 });
    pool.push({ type: 'turbo', weight: 5 });
  } else if (isTrailing) {
    pool.push({ type: 'rocket', weight: 30 });
    pool.push({ type: 'turbo', weight: 25 });
    pool.push({ type: 'lightning', weight: 15 });
    pool.push({ type: 'anvil', weight: 15 });
    pool.push({ type: 'trio_rockets', weight: 15 });
  } else {
    // Midpack
    pool.push({ type: 'rocket', weight: 25 });
    pool.push({ type: 'turbo', weight: 25 });
    pool.push({ type: 'mine', weight: 20 });
    pool.push({ type: 'shield', weight: 15 });
    pool.push({ type: 'repair', weight: 15 });
  }

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const item of pool) {
    if (rand < item.weight) {
      return item.type;
    }
    rand -= item.weight;
  }

  return 'turbo';
}

// Static shared geometries & materials for projectiles to prevent memory allocations and shader compile freezes
const rocketBodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 10);
rocketBodyGeo.rotateX(Math.PI / 2);
const rocketBodyMat = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  metalness: 0.4,
  roughness: 0.3,
});

const rocketNoseGeo = new THREE.ConeGeometry(0.22, 0.5, 10);
rocketNoseGeo.rotateX(Math.PI / 2);
const rocketNoseMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });

const rocketFinGeo = new THREE.BoxGeometry(0.7, 0.05, 0.3);
const rocketFinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });

const rocketFlameGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
rocketFlameGeo.rotateX(-Math.PI / 2);
const rocketFlameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

const mineSphereGeo = new THREE.SphereGeometry(0.45, 12, 12);
const mineBombMat = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.6,
});

const mineFuseGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6);
const mineFuseMat = new THREE.MeshStandardMaterial({ color: 0x78350f });

const mineSparkGeo = new THREE.SphereGeometry(0.09, 6, 6);
const mineSparkMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

const mineSpikeGeo = new THREE.ConeGeometry(0.12, 0.3, 6);
const mineSpikeMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });

const sharedShieldGeo = new THREE.SphereGeometry(1.6, 16, 16);
const sharedShieldMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0284c7,
  emissiveIntensity: 0.6,
  transparent: true,
  opacity: 0.4,
  roughness: 0.1,
  wireframe: false,
});

/**
 * 3D Projectile Mesh Generator (Uses pre-cached assets)
 */
export function createRocketMesh(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(rocketBodyGeo, rocketBodyMat);
  group.add(body);

  const nose = new THREE.Mesh(rocketNoseGeo, rocketNoseMat);
  nose.position.z = 0.8;
  group.add(nose);

  const fin1 = new THREE.Mesh(rocketFinGeo, rocketFinMat);
  fin1.position.z = -0.4;
  group.add(fin1);

  const fin2 = new THREE.Mesh(rocketFinGeo, rocketFinMat);
  fin2.position.z = -0.4;
  fin2.rotation.z = Math.PI / 2;
  group.add(fin2);

  const flame = new THREE.Mesh(rocketFlameGeo, rocketFlameMat);
  flame.position.z = -0.7;
  group.add(flame);

  return group;
}

export function createMineMesh(): THREE.Group {
  const group = new THREE.Group();

  const bomb = new THREE.Mesh(mineSphereGeo, mineBombMat);
  group.add(bomb);

  const fuse = new THREE.Mesh(mineFuseGeo, mineFuseMat);
  fuse.position.y = 0.5;
  group.add(fuse);

  const spark = new THREE.Mesh(mineSparkGeo, mineSparkMat);
  spark.position.y = 0.65;
  group.add(spark);

  const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  angles.forEach(a => {
    const s = new THREE.Mesh(mineSpikeGeo, mineSpikeMat);
    s.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
    s.rotation.z = -Math.PI / 2;
    s.rotation.y = a;
    group.add(s);
  });

  return group;
}

export function createShieldMesh(): THREE.Mesh {
  return new THREE.Mesh(sharedShieldGeo, sharedShieldMat);
}
