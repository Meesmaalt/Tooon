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
    name: 'Punane Rakett',
    icon: '🚀',
    description: 'Jälitav rakett! Tulistab ettepoole ja võtab sihikule lähima vastase ees.',
    rarityWeight: 25,
  },
  blue_rocket: {
    type: 'blue_rocket',
    name: 'Sinine Tiibrakett',
    icon: '🔷',
    description: 'Legendaarne liidrijahtija! Lendab väsimatult seni, kuni tabab esikoha liidrit mega-plahvatusega!',
    rarityWeight: 15,
  },
  thundercloud: {
    type: 'thundercloud',
    name: 'Äikesepilv',
    icon: '⛈️',
    description: 'Varitseb teel! Kui vastane satub lähedale, jälitab teda 3.5 sekundit ja virutab äikeselöögi!',
    rarityWeight: 20,
  },
  banana: {
    type: 'banana',
    name: 'Banaanikoor',
    icon: '🍌',
    description: 'Libe lõks teel! Otsasõitja teeb kontrollimatu 360° spinni ja kaotab hoogu.',
    rarityWeight: 25,
  },
  star: {
    type: 'star',
    name: 'Super Täht',
    icon: '⭐',
    description: 'Täielik vikerkaare võitmatus! Annab ülikiiruse ja pühib kõik vastased teelt minema.',
    rarityWeight: 15,
  },
  mine: {
    type: 'mine',
    name: 'TNT Miin',
    icon: '💣',
    description: 'Viskab taha tiksuva pommi. Otsasõitja lendab spinniga õhku!',
    rarityWeight: 20,
  },
  shield: {
    type: 'shield',
    name: 'Mullkilp',
    icon: '🛡️',
    description: 'Kaitsev energiamull, mis neelab rünnakud ja tõukab vastaseid.',
    rarityWeight: 15,
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
    description: 'Lööb korraga kõiki vastaseid välguga ja aeglustab neid 3 sekundiks!',
    rarityWeight: 10,
  },
  anvil: {
    type: 'anvil',
    name: '10T Alasi',
    icon: '🔨',
    description: 'Kukutab liidrile pähe tohutu koomiksialasi!',
    rarityWeight: 10,
  },
  repair: {
    type: 'repair',
    name: 'Kiirparandus',
    icon: '🔧',
    description: 'Taastab auto stabiilsuse ja annab väikese lisakiirenduse.',
    rarityWeight: 15,
  },
  trio_rockets: {
    type: 'trio_rockets',
    name: '3x Raketti',
    icon: '🎯',
    description: 'Kolm kiiret raketti laiali lehvikuna vastaste rivi purustamiseks!',
    rarityWeight: 10,
  },
};

/**
 * Weighted random power-up picker based on current race position (Rubber-banding!)
 * Trailing racers (4th-6th) get game-changing items: Blue Rocket, Thundercloud, Star, Red Rocket, Turbo.
 * Leader (1st) gets defensive items: Banana, Mine, Shield, Repair.
 */
export function getRandomPowerUp(position: number, totalRacers: number = 6): PowerUpType {
  const isLeader = position === 1;
  const isTrailing = position >= 4;

  const pool: { type: PowerUpType; weight: number }[] = [];

  if (isLeader) {
    pool.push({ type: 'banana', weight: 40 });
    pool.push({ type: 'mine', weight: 30 });
    pool.push({ type: 'shield', weight: 25 });
    pool.push({ type: 'repair', weight: 15 });
    pool.push({ type: 'turbo', weight: 10 });
  } else if (isTrailing) {
    pool.push({ type: 'blue_rocket', weight: 25 });
    pool.push({ type: 'thundercloud', weight: 25 });
    pool.push({ type: 'star', weight: 20 });
    pool.push({ type: 'rocket', weight: 25 });
    pool.push({ type: 'turbo', weight: 20 });
    pool.push({ type: 'lightning', weight: 10 });
  } else {
    // Midpack (2nd - 3rd)
    pool.push({ type: 'rocket', weight: 30 });
    pool.push({ type: 'thundercloud', weight: 20 });
    pool.push({ type: 'banana', weight: 20 });
    pool.push({ type: 'turbo', weight: 25 });
    pool.push({ type: 'shield', weight: 15 });
    pool.push({ type: 'mine', weight: 15 });
    pool.push({ type: 'blue_rocket', weight: 10 });
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

// Blue Rocket assets
const blueRocketBodyMat = new THREE.MeshStandardMaterial({
  color: 0x0284c7,
  metalness: 0.5,
  roughness: 0.25,
});
const blueRocketNoseMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0284c7,
  emissiveIntensity: 0.8,
});
const blueRocketWingMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  metalness: 0.2,
  roughness: 0.3,
});
const blueRocketFlameMat = new THREE.MeshBasicMaterial({
  color: 0x06b6d4,
});

// Thundercloud assets
const cloudPuffGeo = new THREE.SphereGeometry(0.55, 8, 8);
const cloudPuffDarkMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.9,
  metalness: 0.1,
});
const cloudPuffMidMat = new THREE.MeshStandardMaterial({
  color: 0x334155,
  roughness: 0.8,
});
const lightningCoreGeo = new THREE.ConeGeometry(0.16, 0.45, 4);
const lightningCoreMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
});

// Banana peel assets
const bananaCurveGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.7, 8);
const bananaMat = new THREE.MeshStandardMaterial({
  color: 0xfacc15,
  roughness: 0.4,
});
const bananaStemMat = new THREE.MeshStandardMaterial({
  color: 0x78350f,
  roughness: 0.7,
});
const bananaPeelGeo = new THREE.BoxGeometry(0.18, 0.04, 0.45);

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

export function createBlueRocketMesh(): THREE.Group {
  const group = new THREE.Group();

  // Vibrant Blue Body
  const body = new THREE.Mesh(rocketBodyGeo, blueRocketBodyMat);
  group.add(body);

  // Glowing Cyan Nose
  const nose = new THREE.Mesh(rocketNoseGeo, blueRocketNoseMat);
  nose.position.z = 0.85;
  group.add(nose);

  // Aerodynamic swept wings
  const wingLeft = new THREE.Mesh(rocketFinGeo, blueRocketWingMat);
  wingLeft.position.set(-0.5, 0, -0.2);
  wingLeft.rotation.y = 0.3;
  group.add(wingLeft);

  const wingRight = new THREE.Mesh(rocketFinGeo, blueRocketWingMat);
  wingRight.position.set(0.5, 0, -0.2);
  wingRight.rotation.y = -0.3;
  group.add(wingRight);

  // Top fin
  const topFin = new THREE.Mesh(rocketFinGeo, blueRocketWingMat);
  topFin.position.set(0, 0.4, -0.3);
  topFin.rotation.z = Math.PI / 2;
  group.add(topFin);

  // Twin Cyan Thruster Flames
  const flame = new THREE.Mesh(rocketFlameGeo, blueRocketFlameMat);
  flame.position.z = -0.75;
  flame.scale.set(1.3, 1.3, 1.3);
  group.add(flame);

  return group;
}

export function createThundercloudMesh(): THREE.Group {
  const group = new THREE.Group();

  // Stylized cluster of dark storm cloud puffs
  const offsets = [
    { x: 0, y: 0.1, z: 0, s: 1.1, dark: true },
    { x: -0.45, y: -0.05, z: 0.2, s: 0.85, dark: false },
    { x: 0.45, y: 0.05, z: -0.15, s: 0.9, dark: true },
    { x: -0.2, y: 0.2, z: -0.3, s: 0.8, dark: false },
    { x: 0.3, y: -0.1, z: 0.35, s: 0.85, dark: false },
    { x: 0, y: 0.25, z: 0.1, s: 0.75, dark: true },
  ];

  offsets.forEach(o => {
    const puff = new THREE.Mesh(cloudPuffGeo, o.dark ? cloudPuffDarkMat : cloudPuffMidMat);
    puff.position.set(o.x, o.y, o.z);
    puff.scale.set(o.s, o.s * 0.75, o.s);
    group.add(puff);
  });

  // Hanging glowing electric zap bolt underneath
  const bolt1 = new THREE.Mesh(lightningCoreGeo, lightningCoreMat);
  bolt1.position.set(-0.15, -0.35, 0.05);
  bolt1.rotation.z = 0.3;
  group.add(bolt1);

  const bolt2 = new THREE.Mesh(lightningCoreGeo, lightningCoreMat);
  bolt2.position.set(0.15, -0.38, -0.05);
  bolt2.rotation.z = -0.25;
  group.add(bolt2);

  return group;
}

export function createBananaMesh(): THREE.Group {
  const group = new THREE.Group();

  // Central banana core
  const core = new THREE.Mesh(bananaCurveGeo, bananaMat);
  core.rotation.x = Math.PI / 2;
  core.position.y = 0.15;
  group.add(core);

  // Brown stem tip
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 6), bananaStemMat);
  stem.position.set(0, 0.15, 0.42);
  stem.rotation.x = Math.PI / 2;
  group.add(stem);

  // Peels spread out flat on tarmac
  [-0.7, 0.7, 2.3].forEach(angle => {
    const peel = new THREE.Mesh(bananaPeelGeo, bananaMat);
    peel.position.set(Math.cos(angle) * 0.25, 0.03, Math.sin(angle) * 0.25);
    peel.rotation.y = angle;
    group.add(peel);
  });

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
