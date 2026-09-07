import * as THREE from 'three';
import { TrackDefinition } from '../types';

export const TRACK_DEFINITIONS: TrackDefinition[] = [
  {
    id: 'sunny_beach',
    name: 'Päikeserand (Sunny Beach Island)',
    theme: 'beach',
    difficulty: 'Easy',
    description: 'Troopiline paradiisisaar looklevate palmide, liivaluidete, puusildade ja rannavarjudega!',
    lengthMeters: 620,
    lapsDefault: 3,
    skyColor: 0x60a5fa,
    fogColor: 0x93c5fd,
    groundColor: 0xfde047,
    trackColor: 0x292524,
    curbColorA: 0xef4444,
    curbColorB: 0xf8fafc,
    points: [
      [0, 0, 0],
      [40, 1, 80],
      [90, 2, 140],
      [160, 1, 160],
      [220, 3, 110],
      [230, 4, 30],
      [190, 2, -50],
      [130, 1, -110],
      [50, 2, -130],
      [-30, 3, -110],
      [-100, 2, -60],
      [-140, 1, 10],
      [-120, 1, 80],
      [-60, 0, 40],
    ],
  },
  {
    id: 'spooky_castle',
    name: 'Kummitusloss (Spooky Graveyard)',
    theme: 'spooky',
    difficulty: 'Medium',
    description: 'Öine munakivirada läbi kummitusliku kalmistu, vanade lossimüüride ja hõõguvate kõrvitsate!',
    lengthMeters: 740,
    lapsDefault: 3,
    skyColor: 0x090d16,
    fogColor: 0x111827,
    groundColor: 0x1c1917,
    trackColor: 0x262626,
    curbColorA: 0x8b5cf6,
    curbColorB: 0x22c55e,
    points: [
      [0, 0, 0],
      [50, 0, 90],
      [120, 3, 130],
      [190, 6, 100],
      [210, 8, 20],
      [170, 5, -60],
      [110, 2, -100],
      [140, 4, -170],
      [80, 2, -220],
      [-20, 1, -210],
      [-80, 4, -150],
      [-140, 6, -80],
      [-160, 4, 20],
      [-110, 1, 100],
      [-40, 0, 60],
    ],
  },
  {
    id: 'cyber_canyon',
    name: 'Küberkanjon (Neon Cyber Canyon)',
    theme: 'cyber',
    difficulty: 'Hard',
    description: 'Futuristlik neoonrada kiirenduspatjade, laserite, hõljuvate rõngaste ja pulseerivate püramiididega!',
    lengthMeters: 850,
    lapsDefault: 3,
    skyColor: 0x030712,
    fogColor: 0x0f172a,
    groundColor: 0x020617,
    trackColor: 0x09090b,
    curbColorA: 0x06b6d4,
    curbColorB: 0xf43f5e,
    points: [
      [0, 0, 0],
      [60, 2, 70],
      [80, 4, 150],
      [150, 7, 200],
      [220, 5, 170],
      [250, 3, 70],
      [210, 5, -20],
      [240, 7, -110],
      [190, 8, -190],
      [100, 4, -220],
      [10, 2, -180],
      [-60, 5, -130],
      [-130, 8, -170],
      [-190, 6, -110],
      [-170, 3, -20],
      [-110, 1, 60],
      [-50, 0, 30],
    ],
  },
  {
    id: 'frozen_peak',
    name: 'Lumine Mäetipp (Frozen Peak)',
    theme: 'ice',
    difficulty: 'Medium',
    description: 'Lumme mattunud mäerada lumememmede, härmas kuuskede, jääkoobaste ja hiilgavate jääkristallidega!',
    lengthMeters: 790,
    lapsDefault: 3,
    skyColor: 0x93c5fd,
    fogColor: 0xdbeafe,
    groundColor: 0xf8fafc,
    trackColor: 0x475569,
    curbColorA: 0x38bdf8,
    curbColorB: 0xffffff,
    points: [
      [0, 0, 0],
      [45, 2, 75],
      [110, 5, 120],
      [180, 8, 90],
      [220, 6, 20],
      [190, 4, -50],
      [140, 7, -120],
      [80, 5, -180],
      [-10, 3, -200],
      [-90, 6, -170],
      [-150, 8, -100],
      [-180, 5, -20],
      [-150, 3, 50],
      [-80, 1, 80],
      [-30, 0, 40],
    ],
  },
];

export interface ItemBoxPosition {
  x: number;
  y: number;
  z: number;
  mesh: THREE.Group;
  active: boolean;
  respawnTime: number;
}

export interface BoostPadPosition {
  x: number;
  y: number;
  z: number;
  rotY: number;
  mesh?: THREE.Group;
}

export interface CenterlinePoint {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  t: number;
}

export interface TrackInfo {
  closestPoint: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  distanceToCenter: number;
  signedDistance: number;
  t: number;
  isOffroad: boolean;
  isOnCurb: boolean;
  isWallHit: boolean;
  wallNormal: THREE.Vector3;
}

export interface TrackData {
  curve: THREE.CatmullRomCurve3;
  trackWidth: number;
  checkpoints: THREE.Vector3[];
  centerlinePoints: CenterlinePoint[];
  getTrackInfo: (pos: THREE.Vector3) => TrackInfo;
  itemBoxes: ItemBoxPosition[];
  boostPads: BoostPadPosition[];
  decorations: THREE.Group;
  trackMesh: THREE.Mesh;
  curbsMesh: THREE.Group;
  wallsMesh: THREE.Group;
  startArch: THREE.Group;
  theme: TrackDefinition['theme'];
  waterMesh?: THREE.Mesh;
}

/**
 * Creates procedural high-res asphalt racetrack texture with lane lines
 */
function createAsphaltTexture(trackColor: number, theme: TrackDefinition['theme']): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const hexColor = '#' + trackColor.toString(16).padStart(6, '0');
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Outer solid boundary lines
  const edgeColor = theme === 'cyber' ? '#06b6d4' : (theme === 'ice' ? '#bae6fd' : '#ffffff');
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(32, 512);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(512 - 32, 0);
  ctx.lineTo(512 - 32, 512);
  ctx.stroke();

  // Center dashed dividing line
  const centerColor = theme === 'cyber' ? '#f43f5e' : (theme === 'spooky' ? '#a855f7' : '#facc15');
  ctx.strokeStyle = centerColor;
  ctx.lineWidth = 10;
  ctx.setLineDash([34, 30]);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 40);
  texture.anisotropy = 8;
  return texture;
}

/**
 * Creates alternating red/white or theme-colored curb rumble strip texture
 */
function createCurbTexture(colorA: number, colorB: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const hexA = '#' + colorA.toString(16).padStart(6, '0');
  const hexB = '#' + colorB.toString(16).padStart(6, '0');

  ctx.fillStyle = hexA;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = hexB;
  ctx.fillRect(0, 64, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 55);
  texture.anisotropy = 8;
  return texture;
}

/**
 * Creates a start/finish checkered line texture
 */
function createStartLineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const tileSize = 32;
  for (let x = 0; x < 256; x += tileSize) {
    for (let y = 0; y < 64; y += tileSize) {
      const isBlack = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
      ctx.fillStyle = isBlack ? '#18181b' : '#ffffff';
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

/**
 * Creates high-contrast yellow & black warning chevron arrow texture
 */
function createChevronTexture(direction: 'left' | 'right'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // High-contrast yellow background
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 256, 128);

  // Black chevron arrows
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 3; i++) {
    const startX = 40 + i * 75;
    ctx.beginPath();
    if (direction === 'right') {
      ctx.moveTo(startX, 15);
      ctx.lineTo(startX + 40, 64);
      ctx.lineTo(startX, 113);
      ctx.lineTo(startX + 22, 113);
      ctx.lineTo(startX + 62, 64);
      ctx.lineTo(startX + 22, 15);
    } else {
      ctx.moveTo(startX + 45, 15);
      ctx.lineTo(startX + 5, 64);
      ctx.lineTo(startX + 45, 113);
      ctx.lineTo(startX + 23, 113);
      ctx.lineTo(startX - 17, 64);
      ctx.lineTo(startX + 23, 15);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 120);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Creates high-contrast braking distance warning boards ("150m", "100m", "50m")
 */
function createDistanceSignTexture(distText: string, stripes: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // White reflective background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 128);

  // Red diagonal hazard stripes on the left
  ctx.fillStyle = '#ef4444';
  for (let s = 0; s < stripes; s++) {
    const sx = 20 + s * 24;
    ctx.beginPath();
    ctx.moveTo(sx, 120);
    ctx.lineTo(sx + 14, 8);
    ctx.lineTo(sx + 26, 8);
    ctx.lineTo(sx + 12, 120);
    ctx.closePath();
    ctx.fill();
  }

  // Black bold distance numerals
  ctx.fillStyle = '#09090b';
  ctx.font = '900 52px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(distText, 168, 64);

  // Dark border
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 120);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Builds the complete 3D racing track with rich scenery, asphalt markings, dense centerline, and robust collision detection
 */
export function buildTrack(trackDef: TrackDefinition): TrackData {
  const vectors = trackDef.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vectors, true, 'centripetal', 0.5);

  // Bulletproof safety wrapper for curve sampling to prevent out-of-range t or NaN from crashing CatmullRomCurve3
  const origGetPointAt = curve.getPointAt.bind(curve);
  const origGetTangentAt = curve.getTangentAt.bind(curve);

  curve.getPointAt = (u: number, optionalTarget?: THREE.Vector3) => {
    if (isNaN(u) || !isFinite(u)) return origGetPointAt(0, optionalTarget);
    const safeU = Math.min(0.99999, Math.max(0, ((u % 1.0) + 1.0) % 1.0));
    return origGetPointAt(safeU, optionalTarget);
  };

  curve.getTangentAt = (u: number, optionalTarget?: THREE.Vector3) => {
    if (isNaN(u) || !isFinite(u)) return origGetTangentAt(0, optionalTarget);
    const safeU = Math.min(0.99999, Math.max(0, ((u % 1.0) + 1.0) % 1.0));
    return origGetTangentAt(safeU, optionalTarget);
  };

  // Roomy track width for exciting high-speed cartoon racing
  const trackWidth = 16.0;
  const halfW = trackWidth * 0.5;
  const curbW = 1.6;

  // Build dense centerline (360 points along spline) for accurate physics
  const denseCount = 360;
  const centerlinePoints: CenterlinePoint[] = [];
  const upVec = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < denseCount; i++) {
    const t = i / denseCount;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
    centerlinePoints.push({
      point: pt,
      tangent,
      right,
      t,
    });
  }

  // Pre-allocated static temporary objects for high-performance zero-allocation track queries
  const _tmpSeg = new THREE.Vector3();
  const _tmpToPos = new THREE.Vector3();
  const _tmpCandidate = new THREE.Vector3();
  const _tmpToCar = new THREE.Vector3();

  // High-accuracy continuous track query helper
  const getTrackInfo = (pos: THREE.Vector3): TrackInfo => {
    const pX = pos.x;
    const pZ = pos.z;

    // 1. Fast coarse search (step 8)
    let bestDistSq = Infinity;
    let coarseBestIdx = 0;
    const step = 8;
    for (let i = 0; i < denseCount; i += step) {
      const cp = centerlinePoints[i].point;
      const dx = cp.x - pX;
      const dz = cp.z - pZ;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        coarseBestIdx = i;
      }
    }

    // Refine around coarse best within [-step, +step]
    let bestIdx = coarseBestIdx;
    const startSearch = coarseBestIdx - step;
    const endSearch = coarseBestIdx + step;
    for (let i = startSearch; i <= endSearch; i++) {
      const idx = (i + denseCount) % denseCount;
      const cp = centerlinePoints[idx].point;
      const dx = cp.x - pX;
      const dz = cp.z - pZ;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = idx;
      }
    }

    // 2. Project onto neighboring line segments for smooth sub-meter precision
    const prevIdx = (bestIdx - 1 + denseCount) % denseCount;
    const nextIdx = (bestIdx + 1) % denseCount;

    const testSegments = [
      [centerlinePoints[prevIdx], centerlinePoints[bestIdx]],
      [centerlinePoints[bestIdx], centerlinePoints[nextIdx]],
    ];

    let closestPt = centerlinePoints[bestIdx].point.clone();
    let bestSegmentDistSq = Infinity;
    let finalTangent = centerlinePoints[bestIdx].tangent.clone();
    let finalRight = centerlinePoints[bestIdx].right.clone();
    let finalT = centerlinePoints[bestIdx].t;

    for (let sIdx = 0; sIdx < 2; sIdx++) {
      const pA = testSegments[sIdx][0];
      const pB = testSegments[sIdx][1];
      _tmpSeg.subVectors(pB.point, pA.point);
      const segLenSq = _tmpSeg.lengthSq();
      if (segLenSq > 0.0001) {
        _tmpToPos.set(pX - pA.point.x, 0, pZ - pA.point.z);
        const s = THREE.MathUtils.clamp(_tmpToPos.dot(_tmpSeg) / segLenSq, 0, 1);
        _tmpCandidate.copy(pA.point).addScaledVector(_tmpSeg, s);
        const cDistSq = (_tmpCandidate.x - pX) * (_tmpCandidate.x - pX) + (_tmpCandidate.z - pZ) * (_tmpCandidate.z - pZ);
        if (cDistSq < bestSegmentDistSq) {
          bestSegmentDistSq = cDistSq;
          closestPt.copy(_tmpCandidate);
          finalTangent.lerpVectors(pA.tangent, pB.tangent, s).normalize();
          finalRight.lerpVectors(pA.right, pB.right, s).normalize();
          let diffT = pB.t - pA.t;
          while (diffT > 0.5) diffT -= 1.0;
          while (diffT < -0.5) diffT += 1.0;
          finalT = Math.min(0.99999, Math.max(0, ((pA.t + diffT * s) % 1.0 + 1.0) % 1.0));
        }
      }
    }

    const distToCenter = Math.sqrt(bestSegmentDistSq);
    _tmpToCar.set(pX - closestPt.x, 0, pZ - closestPt.z);
    const signedDistance = _tmpToCar.dot(finalRight);
    const wallNormal = finalRight.clone().multiplyScalar(signedDistance > 0 ? -1 : 1);

    // Zone boundaries:
    // 0 to halfW (8.0m): On Road
    // 8.0m to 9.6m: On Curbs
    // 9.6m to 16.0m: Offroad grass/sand/snow (slows car, no bounce!)
    // > 16.0m: Outer perimeter boundary (soft bounce)
    const isOnCurb = distToCenter > halfW && distToCenter <= halfW + curbW;
    const isOffroad = distToCenter > halfW + curbW && distToCenter <= halfW + 8.0;
    const isWallHit = distToCenter > halfW + 8.0;

    return {
      closestPoint: closestPt,
      tangent: finalTangent,
      right: finalRight,
      distanceToCenter: distToCenter,
      signedDistance,
      t: finalT,
      isOffroad,
      isOnCurb,
      isWallHit,
      wallNormal,
    };
  };

  // 1. Generate Road Ribbon Geometry with procedural markings texture
  const segments = 260;
  const roadGeo = new THREE.BufferGeometry();
  const roadVertices: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  const curbVerticesA: number[] = [];
  const curbIndicesA: number[] = [];
  const curbUvsA: number[] = [];

  const curbVerticesB: number[] = [];
  const curbIndicesB: number[] = [];
  const curbUvsB: number[] = [];

  const wallsGroup = new THREE.Group();

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) % 1;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();

    // Road vertices
    const leftPt = pt.clone().add(right.clone().multiplyScalar(-halfW));
    const rightPt = pt.clone().add(right.clone().multiplyScalar(halfW));

    roadVertices.push(leftPt.x, leftPt.y + 0.04, leftPt.z);
    roadVertices.push(rightPt.x, rightPt.y + 0.04, rightPt.z);

    const vCoord = (i / segments) * 45;
    roadUvs.push(0, vCoord);
    roadUvs.push(1, vCoord);

    if (i < segments) {
      const idx = i * 2;
      roadIndices.push(idx, idx + 1, idx + 2);
      roadIndices.push(idx + 1, idx + 3, idx + 2);
    }

    // Curbs on left and right edge
    const curbLeftOuter = leftPt.clone().add(right.clone().multiplyScalar(-curbW));
    const curbRightOuter = rightPt.clone().add(right.clone().multiplyScalar(curbW));

    // Left curb
    const cLIdx = i * 2;
    curbVerticesA.push(curbLeftOuter.x, curbLeftOuter.y + 0.14, curbLeftOuter.z);
    curbVerticesA.push(leftPt.x, leftPt.y + 0.08, leftPt.z);
    curbUvsA.push(0, vCoord);
    curbUvsA.push(1, vCoord);

    // Right curb
    curbVerticesB.push(rightPt.x, rightPt.y + 0.08, rightPt.z);
    curbVerticesB.push(curbRightOuter.x, curbRightOuter.y + 0.14, curbRightOuter.z);
    curbUvsB.push(0, vCoord);
    curbUvsB.push(1, vCoord);

    if (i < segments) {
      curbIndicesA.push(cLIdx, cLIdx + 1, cLIdx + 2);
      curbIndicesA.push(cLIdx + 1, cLIdx + 3, cLIdx + 2);

      curbIndicesB.push(cLIdx, cLIdx + 1, cLIdx + 2);
      curbIndicesB.push(cLIdx + 1, cLIdx + 3, cLIdx + 2);
    }
  }

  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();

  const roadTex = createAsphaltTexture(trackDef.trackColor, trackDef.theme);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: trackDef.theme === 'ice' ? 0.25 : 0.75,
    metalness: trackDef.theme === 'ice' ? 0.35 : 0.1,
  });
  const trackMesh = new THREE.Mesh(roadGeo, roadMat);
  trackMesh.receiveShadow = true;

  // Curbs mesh with alternating curb rumble texture
  const curbGeoA = new THREE.BufferGeometry();
  curbGeoA.setAttribute('position', new THREE.Float32BufferAttribute(curbVerticesA, 3));
  curbGeoA.setAttribute('uv', new THREE.Float32BufferAttribute(curbUvsA, 2));
  curbGeoA.setIndex(curbIndicesA);
  curbGeoA.computeVertexNormals();

  const curbGeoB = new THREE.BufferGeometry();
  curbGeoB.setAttribute('position', new THREE.Float32BufferAttribute(curbVerticesB, 3));
  curbGeoB.setAttribute('uv', new THREE.Float32BufferAttribute(curbUvsB, 2));
  curbGeoB.setIndex(curbIndicesB);
  curbGeoB.computeVertexNormals();

  const curbTex = createCurbTexture(trackDef.curbColorA, trackDef.curbColorB);
  const curbMat = new THREE.MeshStandardMaterial({
    map: curbTex,
    roughness: 0.45,
    metalness: 0.15,
  });
  const curbMeshA = new THREE.Mesh(curbGeoA, curbMat);
  const curbMeshB = new THREE.Mesh(curbGeoB, curbMat);
  curbMeshA.receiveShadow = true;
  curbMeshB.receiveShadow = true;

  const curbsGroup = new THREE.Group();
  curbsGroup.add(curbMeshA);
  curbsGroup.add(curbMeshB);

  // 2. Checkpoints along spline for lap progress (32 checkpoints, spaced ~20-25m)
  const numCheckpoints = 32;
  const checkpoints: THREE.Vector3[] = [];
  for (let i = 0; i < numCheckpoints; i++) {
    const pt = curve.getPointAt(i / numCheckpoints);
    checkpoints.push(pt);
  }

  // 3. Start / Finish Line Banner & Checkered Asphalt Strip
  const startArch = new THREE.Group();
  const startPt = curve.getPointAt(0);
  const startTangent = curve.getTangentAt(0).normalize();
  const startRight = new THREE.Vector3().crossVectors(startTangent, upVec).normalize();

  startArch.position.copy(startPt);
  const angle = Math.atan2(startTangent.x, startTangent.z);
  startArch.rotation.y = angle;

  // Checkered start/finish asphalt strip
  const startStripGeo = new THREE.PlaneGeometry(trackWidth, 3.2);
  const startStripTex = createStartLineTexture();
  const startStripMat = new THREE.MeshStandardMaterial({
    map: startStripTex,
    roughness: 0.5,
  });
  const startStrip = new THREE.Mesh(startStripGeo, startStripMat);
  startStrip.rotation.x = -Math.PI / 2;
  startStrip.position.set(0, 0.06, 0);
  startArch.add(startStrip);

  // Starting grid boxes on road behind the start line
  const gridBoxGeo = new THREE.PlaneGeometry(3.0, 4.5);
  const gridBoxMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const gBox = new THREE.Mesh(gridBoxGeo, gridBoxMat);
      const sideX = (col === 0 ? -1 : 1) * 3.4;
      const backZ = -(row * 7.5 + 4.5);
      gBox.rotation.x = -Math.PI / 2;
      gBox.position.set(sideX, 0.07, backZ);
      startArch.add(gBox);
    }
  }

  // Grand Start Gantry Overhead Arch
  const pillarGeo = new THREE.CylinderGeometry(0.55, 0.7, 8, 16);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.2 });
  const pL = new THREE.Mesh(pillarGeo, pillarMat);
  pL.position.set(-trackWidth * 0.58, 4, 0);
  pL.castShadow = true;
  startArch.add(pL);

  const pR = new THREE.Mesh(pillarGeo, pillarMat);
  pR.position.set(trackWidth * 0.58, 4, 0);
  pR.castShadow = true;
  startArch.add(pR);

  // Top overhead truss
  const trussGeo = new THREE.BoxGeometry(trackWidth + 3, 1.4, 1.2);
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
  const truss = new THREE.Mesh(trussGeo, trussMat);
  truss.position.set(0, 7.8, 0);
  truss.castShadow = true;
  startArch.add(truss);

  // Start banner sign
  const bannerGeo = new THREE.BoxGeometry(trackWidth * 0.7, 1.6, 0.25);
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 7.8, 0.65);
  startArch.add(banner);

  // Traffic lights on arch (Red, Yellow, Green)
  [-1.5, 0, 1.5].forEach((offsetX, idx) => {
    const lightHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    lightHousing.position.set(offsetX * 2.2, 6.4, 0.6);

    const colors = [0xef4444, 0xeab308, 0x22c55e];
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({
        color: colors[idx],
        emissive: colors[idx],
        emissiveIntensity: 0.8,
      })
    );
    bulb.position.set(0, 0, 0.22);
    lightHousing.add(bulb);
    startArch.add(lightHousing);
  });

  // 4. Item Boxes distributed at 4 balanced race stations
  const itemBoxes: ItemBoxPosition[] = [];
  const itemStations = [0.12, 0.38, 0.62, 0.88];

  itemStations.forEach(t => {
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();

    // 4 boxes across track width
    [-4.5, -1.5, 1.5, 4.5].forEach(offset => {
      const boxPos = pt.clone().add(right.clone().multiplyScalar(offset));
      boxPos.y = pt.y + 1.35;

      const boxGroup = new THREE.Group();
      boxGroup.position.copy(boxPos);

      // Outer crystal cube with iridescent translucent glow
      const cubeGeo = new THREE.BoxGeometry(1.35, 1.35, 1.35);
      const cubeMat = new THREE.MeshPhysicalMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.7,
        roughness: 0.08,
        transmission: 0.75,
        transparent: true,
        opacity: 0.88,
        ior: 1.4,
      });
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      boxGroup.add(cube);

      // Inner spinning golden prize gem
      const gemGeo = new THREE.OctahedronGeometry(0.52, 0);
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfef08a,
        emissiveIntensity: 1.2,
        metalness: 0.85,
        roughness: 0.1,
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      boxGroup.add(gem);

      // Orbiting sparkle ring
      for (let orb = 0; orb < 4; orb++) {
        const star = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.12),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        const orbAngle = (orb / 4) * Math.PI * 2;
        star.position.set(Math.cos(orbAngle) * 0.95, 0, Math.sin(orbAngle) * 0.95);
        boxGroup.add(star);
      }

      // Soft ambient light
      const boxLight = new THREE.PointLight(0xfbbf24, 0.8, 3.5);
      boxGroup.add(boxLight);

      itemBoxes.push({
        x: boxPos.x,
        y: boxPos.y,
        z: boxPos.z,
        mesh: boxGroup,
        active: true,
        respawnTime: 0,
      });
    });
  });

  // 5. Speed Boost Pads on Track with pulsing chevron arrows & neon borders
  const boostPads: BoostPadPosition[] = [];
  const boostStations = [0.24, 0.52, 0.78];

  boostStations.forEach(t => {
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const rotY = Math.atan2(tangent.x, tangent.z);

    const padGroup = new THREE.Group();
    padGroup.position.set(pt.x, pt.y + 0.08, pt.z);
    padGroup.rotation.y = rotY;

    // Glowing base pad
    const padGeo = new THREE.PlaneGeometry(6.2, 3.6);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0xc2410c,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.rotation.x = -Math.PI / 2;
    padGroup.add(padMesh);

    // Neon cyan side guide rails
    [-3.0, 3.0].forEach(sideX => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.15, 3.6),
        new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.2 })
      );
      rail.position.set(sideX, 0.08, 0);
      padGroup.add(rail);
    });

    // 3 Pulsing chevron arrowheads
    for (let c = -1; c <= 1; c++) {
      const arrowGeo = new THREE.ConeGeometry(0.88, 1.35, 3);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.set(0, 0.03, c * 1.05);
      padGroup.add(arrow);
    }

    // Soft warm boost glow light
    const padLight = new THREE.PointLight(0xf97316, 1.2, 5.5);
    padLight.position.set(0, 0.6, 0);
    padGroup.add(padLight);

    boostPads.push({
      x: pt.x,
      y: pt.y + 0.1,
      z: pt.z,
      rotY,
      mesh: padGroup,
    });
  });

  // 6. Rich Themed Scenery Props
  const decorations = new THREE.Group();
  let waterMesh: THREE.Mesh | undefined;

  if (trackDef.theme === 'beach') {
    // Large Animated Tropical Ocean
    const oceanGeo = new THREE.PlaneGeometry(1200, 1200, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    waterMesh = new THREE.Mesh(oceanGeo, oceanMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -0.4;
    waterMesh.receiveShadow = true;
    decorations.add(waterMesh);

    // Palm trees, beach umbrellas, deck chairs, tiki torches, and a grand lighthouse
    for (let i = 0; i < 50; i++) {
      const t = (i / 50 + Math.sin(i * 99) * 0.015 + 1) % 1;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const side = i % 2 === 0 ? 1 : -1;
      const dist = side * (halfW + 5 + Math.random() * 26);

      const propPos = pt.clone().add(right.multiplyScalar(dist));
      propPos.y = Math.max(0, pt.y);

      if (i % 3 === 0) {
        // Detailed Cartoon Palm Tree
        const tree = new THREE.Group();
        tree.position.copy(propPos);

        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.6, 7.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 })
        );
        trunk.position.y = 3.75;
        trunk.rotation.z = side * 0.15;
        trunk.castShadow = true;
        tree.add(trunk);

        // Coconut bunch
        for (let c = 0; c < 3; c++) {
          const coconut = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x451a03 })
          );
          coconut.position.set((c - 1) * 0.35, 7.2, 0.2);
          tree.add(coconut);
        }

        // Lush arched palm fronds
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
        for (let l = 0; l < 7; l++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 5), leafMat);
          leaf.position.set(0, 7.4, 0);
          leaf.rotation.y = (l / 7) * Math.PI * 2;
          leaf.rotation.z = 0.55;
          leaf.castShadow = true;
          tree.add(leaf);
        }
        decorations.add(tree);
      } else if (i % 3 === 1) {
        // Beach Umbrella & Deck Chair Set
        const beachSet = new THREE.Group();
        beachSet.position.copy(propPos);

        // Umbrella pole & canopy
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7 })
        );
        pole.position.y = 1.75;
        beachSet.add(pole);

        const canopyColor = i % 2 === 0 ? 0xef4444 : 0x0284c7;
        const canopy = new THREE.Mesh(
          new THREE.ConeGeometry(2.2, 1.2, 8),
          new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.5 })
        );
        canopy.position.y = 3.2;
        canopy.castShadow = true;
        beachSet.add(canopy);

        // Beach chair
        const chair = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.4, 0.8),
          new THREE.MeshStandardMaterial({ color: 0xfef08a })
        );
        chair.position.set(1.0, 0.2, 0);
        chair.rotation.y = Math.random() * Math.PI;
        beachSet.add(chair);

        decorations.add(beachSet);
      } else {
        // Tiki Torch with glowing flame
        const torch = new THREE.Group();
        torch.position.copy(propPos);

        const stick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.15, 3.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x78350f })
        );
        stick.position.y = 1.6;
        torch.add(stick);

        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 0.7, 6),
          new THREE.MeshStandardMaterial({
            color: 0xf97316,
            emissive: 0xea580c,
            emissiveIntensity: 0.9,
          })
        );
        flame.position.y = 3.3;
        torch.add(flame);

        decorations.add(torch);
      }
    }

    // Grand Cape Lighthouse
    const lighthouse = new THREE.Group();
    lighthouse.position.set(150, 0, -180);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 7.5, 26, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    base.position.y = 13;
    base.castShadow = true;
    lighthouse.add(base);

    // Red bands
    for (let b = 0; b < 2; b++) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(6.1 - b * 0.8, 6.7 - b * 0.8, 4.5, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      band.position.y = 8 + b * 9;
      lighthouse.add(band);
    }

    const lampDome = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 1.0,
      })
    );
    lampDome.position.y = 27;
    lighthouse.add(lampDome);

    decorations.add(lighthouse);

  } else if (trackDef.theme === 'spooky') {
    // Castle Gateway Towers spanning OVER track
    const gateGroup = new THREE.Group();
    const gateT = 0.45;
    const gatePt = curve.getPointAt(gateT);
    const gateTangent = curve.getTangentAt(gateT).normalize();
    const gateRight = new THREE.Vector3().crossVectors(gateTangent, upVec).normalize();
    gateGroup.position.copy(gatePt);
    gateGroup.rotation.y = Math.atan2(gateTangent.x, gateTangent.z);

    const towerGeo = new THREE.CylinderGeometry(2.6, 3.2, 18, 12);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const tLeft = new THREE.Mesh(towerGeo, stoneMat);
    tLeft.position.set(-halfW - 2.5, 9, 0);
    gateGroup.add(tLeft);

    const tRight = new THREE.Mesh(towerGeo, stoneMat);
    tRight.position.set(halfW + 2.5, 9, 0);
    gateGroup.add(tRight);

    // Stone Arch Bridge
    const bridgeGeo = new THREE.BoxGeometry(trackWidth + 8, 3.2, 4.5);
    const bridge = new THREE.Mesh(bridgeGeo, stoneMat);
    bridge.position.set(0, 14, 0);
    gateGroup.add(bridge);

    decorations.add(gateGroup);

    // Spooky Cemetery Props: Jack-o'-Lanterns, Tombstones, Crypts, Dead Trees
    for (let i = 0; i < 45; i++) {
      const t = (i / 45) % 1;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const side = i % 2 === 0 ? 1 : -1;
      const dist = side * (halfW + 5 + Math.random() * 22);

      const propPos = pt.clone().add(right.multiplyScalar(dist));
      propPos.y = pt.y;

      const propGroup = new THREE.Group();
      propGroup.position.copy(propPos);

      if (i % 3 === 0) {
        // Glowing Jack-o'-Lantern
        const pumpkin = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 12, 12),
          new THREE.MeshStandardMaterial({
            color: 0xea580c,
            emissive: 0xc2410c,
            emissiveIntensity: 0.75,
            roughness: 0.6,
          })
        );
        pumpkin.scale.set(1.3, 0.95, 1.3);
        pumpkin.position.y = 0.9;
        propGroup.add(pumpkin);

        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6),
          new THREE.MeshStandardMaterial({ color: 0x15803d })
        );
        stem.position.y = 1.8;
        propGroup.add(stem);
      } else if (i % 3 === 1) {
        // Weathered Tombstone / Cross
        const tomb = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 2.8, 0.45),
          new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
        );
        tomb.position.y = 1.4;
        tomb.rotation.y = (Math.random() - 0.5) * 0.6;
        propGroup.add(tomb);
      } else {
        // Twisted Dead Tree
        const deadTree = new THREE.Group();
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.7, 7, 7),
          new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.95 })
        );
        trunk.position.y = 3.5;
        trunk.rotation.z = (Math.random() - 0.5) * 0.4;
        deadTree.add(trunk);

        for (let b = 0; b < 3; b++) {
          const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.25, 3.5, 5),
            new THREE.MeshStandardMaterial({ color: 0x18181b })
          );
          branch.position.set((b - 1) * 0.8, 5.5 + b * 0.6, 0);
          branch.rotation.z = (b - 1) * 0.7;
          deadTree.add(branch);
        }
        propGroup.add(deadTree);
      }

      decorations.add(propGroup);
    }

  } else if (trackDef.theme === 'cyber') {
    // Glowing Floating Holographic Neon Rings over track
    for (let r = 0; r < 8; r++) {
      const ringT = (r / 8 + 0.05) % 1;
      const pt = curve.getPointAt(ringT);
      const tangent = curve.getTangentAt(ringT).normalize();
      const ringRotY = Math.atan2(tangent.x, tangent.z);

      const ringGroup = new THREE.Group();
      ringGroup.position.set(pt.x, pt.y + 6.5, pt.z);
      ringGroup.rotation.y = ringRotY;

      const ringColor = r % 2 === 0 ? 0x06b6d4 : 0xf43f5e;
      const ringGeo = new THREE.TorusGeometry(8.5, 0.4, 12, 24);
      const ringMat = new THREE.MeshStandardMaterial({
        color: ringColor,
        emissive: ringColor,
        emissiveIntensity: 0.95,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringGroup.add(ringMesh);

      decorations.add(ringGroup);
    }

    // Cyber Billboards & Neon Pylons
    for (let i = 0; i < 35; i++) {
      const t = (i / 35) % 1;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const side = i % 2 === 0 ? 1 : -1;
      const dist = side * (halfW + 7 + Math.random() * 20);

      const pPos = pt.clone().add(right.multiplyScalar(dist));
      pPos.y = pt.y;

      const pGroup = new THREE.Group();
      pGroup.position.copy(pPos);

      // Cyber Tower with Neon Light Streaks
      const towerHeight = 16 + Math.random() * 18;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, towerHeight, 3.5),
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4, metalness: 0.8 })
      );
      tower.position.y = towerHeight * 0.5;
      pGroup.add(tower);

      // Emissive Neon Billboard Banner
      const signGeo = new THREE.BoxGeometry(4.5, 2.5, 0.3);
      const signColor = i % 2 === 0 ? 0x06b6d4 : 0xf43f5e;
      const signMat = new THREE.MeshStandardMaterial({
        color: signColor,
        emissive: signColor,
        emissiveIntensity: 0.9,
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, towerHeight - 3, 2.0);
      pGroup.add(sign);

      decorations.add(pGroup);
    }

  } else if (trackDef.theme === 'ice') {
    // Frozen Peak: Snowy Mountain Pines, Snowmen with hats, and Crystalline Ice Arches
    for (let i = 0; i < 45; i++) {
      const t = (i / 45) % 1;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const side = i % 2 === 0 ? 1 : -1;
      const dist = side * (halfW + 5 + Math.random() * 24);

      const propPos = pt.clone().add(right.multiplyScalar(dist));
      propPos.y = pt.y;

      const propGroup = new THREE.Group();
      propGroup.position.copy(propPos);

      if (i % 3 === 0) {
        // Cute Snowman with top hat and carrot nose
        const snowman = new THREE.Group();
        const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });

        const b1 = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 12), snowMat);
        b1.position.y = 1.1;
        b1.castShadow = true;
        snowman.add(b1);

        const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), snowMat);
        b2.position.y = 2.7;
        b2.castShadow = true;
        snowman.add(b2);

        const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), snowMat);
        b3.position.y = 3.8;
        b3.castShadow = true;
        snowman.add(b3);

        // Carrot nose
        const carrot = new THREE.Mesh(
          new THREE.ConeGeometry(0.15, 0.6, 8),
          new THREE.MeshStandardMaterial({ color: 0xf97316 })
        );
        carrot.rotation.x = Math.PI / 2;
        carrot.position.set(0, 3.8, 0.65);
        snowman.add(carrot);

        // Top hat
        const hat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.55, 0.7, 10),
          new THREE.MeshStandardMaterial({ color: 0x1e293b })
        );
        hat.position.y = 4.5;
        snowman.add(hat);

        propGroup.add(snowman);
      } else if (i % 3 === 1) {
        // Multi-tiered Frosted Pine Tree with Snow Caps
        const pine = new THREE.Group();
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.45, 2.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x78350f })
        );
        trunk.position.y = 1.25;
        pine.add(trunk);

        const needleMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });
        const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

        for (let tier = 0; tier < 3; tier++) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6 - tier * 0.6, 2.2, 7), needleMat);
          cone.position.y = 2.8 + tier * 1.5;
          cone.castShadow = true;
          pine.add(cone);

          const snowRim = new THREE.Mesh(new THREE.ConeGeometry(1.8 - tier * 0.4, 0.7, 7), snowMat);
          snowRim.position.y = 3.6 + tier * 1.5;
          pine.add(snowRim);
        }
        propGroup.add(pine);
      } else {
        // Glowing Cyan Ice Crystal Cluster
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.6,
          roughness: 0.15,
          metalness: 0.4,
          transparent: true,
          opacity: 0.88,
        });

        for (let c = 0; c < 3; c++) {
          const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2 - c * 0.25, 0), crystalMat);
          crystal.scale.set(0.6, 2.6, 0.6);
          crystal.position.set((c - 1) * 0.8, 1.4, 0);
          crystal.rotation.set((c - 1) * 0.25, c * 0.6, 0);
          propGroup.add(crystal);
        }
      }

      decorations.add(propGroup);
    }
  }

  // 7. Start/Finish Grandstand with Cheering Crowds & Pennant Flags
  const grandstandGroup = new THREE.Group();
  const gsT = 0.98;
  const gsPt = curve.getPointAt(gsT);
  const gsTangent = curve.getTangentAt(gsT).normalize();
  const gsRight = new THREE.Vector3().crossVectors(gsTangent, upVec).normalize();
  const gsRotY = Math.atan2(gsTangent.x, gsTangent.z);

  grandstandGroup.position.copy(gsPt).add(gsRight.clone().multiplyScalar(halfW + 6.5));
  grandstandGroup.position.y = gsPt.y;
  grandstandGroup.rotation.y = gsRotY + Math.PI; // Face inward towards the track

  // Tiered Grandstand Structure
  const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const seatColors = [0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899];

  // 3 Tiers of Bleachers
  for (let tier = 0; tier < 3; tier++) {
    const tierMesh = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.8, 2.2),
      standMat
    );
    tierMesh.position.set(0, 0.4 + tier * 0.9, -tier * 1.8);
    grandstandGroup.add(tierMesh);

    // Cheering Cartoon Spectators
    for (let s = -4; s <= 4; s++) {
      const spectator = new THREE.Group();
      spectator.position.set(s * 2.2 + (Math.random() - 0.5) * 0.4, 0.8 + tier * 0.9, -tier * 1.8);

      // Body (colorful shirt)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: seatColors[Math.abs(s + tier) % seatColors.length],
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.8, 8), bodyMat);
      body.position.y = 0.4;
      spectator.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfde047 })
      );
      head.position.y = 0.95;
      spectator.add(head);

      // Hat
      const hat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.35, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0x0284c7 })
      );
      hat.position.y = 1.15;
      spectator.add(hat);

      grandstandGroup.add(spectator);
    }
  }

  // Grandstand Canopy Roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.3, 7.5),
    roofMat
  );
  roof.position.set(0, 4.8, -1.8);
  roof.rotation.x = 0.15;
  grandstandGroup.add(roof);

  // Roof Support Pillars
  [-11, 11].forEach(x => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 4.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
    );
    post.position.set(x, 2.4, 1.2);
    grandstandGroup.add(post);
  });

  // Fluttering Race Pennant Flags along the Straight
  for (let f = -3; f <= 3; f++) {
    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 6.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7 })
    );
    flagPole.position.set(f * 3.8, 3.25, 2.4);
    grandstandGroup.add(flagPole);

    const flagMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.4, 3),
      new THREE.MeshStandardMaterial({
        color: f % 2 === 0 ? 0xfacc15 : 0xef4444,
        side: THREE.DoubleSide,
      })
    );
    flagMesh.position.set(f * 3.8 + 0.6, 6.0, 2.4);
    flagMesh.rotation.z = -Math.PI / 2;
    grandstandGroup.add(flagMesh);
  }

  decorations.add(grandstandGroup);

  // 8. Turn Warning Chevrons & Corner Tire Stacks
  const leftChevronTex = createChevronTexture('left');
  const rightChevronTex = createChevronTexture('right');
  const chevronGeo = new THREE.PlaneGeometry(3.6, 1.8);
  const chevronSignMatL = new THREE.MeshStandardMaterial({ map: leftChevronTex, roughness: 0.3 });
  const chevronSignMatR = new THREE.MeshStandardMaterial({ map: rightChevronTex, roughness: 0.3 });

  // Reusable Tire Stack for Apexes
  const tireGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.35, 10);
  const tireMatDark = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const tireMatWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });

  const sampleCount = 60;
  for (let s = 0; s < sampleCount; s++) {
    const tA = s / sampleCount;
    const tB = ((s + 2) % sampleCount) / sampleCount;
    const ptA = curve.getPointAt(tA);
    const tanA = curve.getTangentAt(tA).normalize();
    const tanB = curve.getTangentAt(tB).normalize();
    const crossY = tanA.x * tanB.z - tanA.z * tanB.x;

    // Detect sharp corners
    if (Math.abs(crossY) > 0.05) {
      const rightA = new THREE.Vector3().crossVectors(tanA, upVec).normalize();
      const rotY = Math.atan2(tanA.x, tanA.z);

      // Outside of the turn gets the chevron arrow warning board
      const isCurvingRight = crossY > 0;
      const outsideSide = isCurvingRight ? -1 : 1; // Left side is outside if curving right
      const chevronPos = ptA.clone().add(rightA.clone().multiplyScalar(outsideSide * (halfW + 3.8)));
      chevronPos.y = ptA.y + 1.6;

      const signPost = new THREE.Group();
      signPost.position.copy(chevronPos);
      signPost.rotation.y = rotY + (outsideSide < 0 ? -0.2 : 0.2);

      // Post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x64748b })
      );
      post.position.y = -0.4;
      signPost.add(post);

      // Board
      const board = new THREE.Mesh(chevronGeo, isCurvingRight ? chevronSignMatR : chevronSignMatL);
      board.position.y = 0.6;
      signPost.add(board);

      decorations.add(signPost);

      // Inside apex gets a 3-tire protective crash barrier stack
      const insideSide = -outsideSide;
      const tireStackPos = ptA.clone().add(rightA.clone().multiplyScalar(insideSide * (halfW + curbW + 0.6)));
      tireStackPos.y = ptA.y;

      const tireStack = new THREE.Group();
      tireStack.position.copy(tireStackPos);

      for (let tr = 0; tr < 3; tr++) {
        const tire = new THREE.Mesh(tireGeo, tr % 2 === 0 ? tireMatDark : tireMatWhite);
        tire.position.y = 0.18 + tr * 0.35;
        tire.castShadow = true;
        tireStack.add(tire);
      }
      decorations.add(tireStack);

      // Real rubber tire skid marks on the asphalt apex
      const skidGeo = new THREE.PlaneGeometry(0.75, 4.2);
      const skidMat = new THREE.MeshBasicMaterial({
        color: 0x09090b,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      });
      const skid = new THREE.Mesh(skidGeo, skidMat);
      skid.rotation.x = -Math.PI / 2;
      skid.rotation.z = Math.PI / 2;
      const skidPos = ptA.clone().add(rightA.clone().multiplyScalar(insideSide * (halfW * 0.42)));
      skid.position.set(skidPos.x, ptA.y + 0.05, skidPos.z);
      decorations.add(skid);

      // Braking distance countdown warning boards (100m, 50m) approaching the turn
      const distBoardGeo = new THREE.PlaneGeometry(2.4, 1.3);
      const distTex100 = createDistanceSignTexture('100m', 2);
      const distTex50 = createDistanceSignTexture('50m', 1);

      [
        { dtFrac: -0.032, tex: distTex100 },
        { dtFrac: -0.016, tex: distTex50 },
      ].forEach(db => {
        const dbT = ((tA + db.dtFrac) % 1.0 + 1.0) % 1.0;
        const dbPt = curve.getPointAt(dbT);
        const dbTan = curve.getTangentAt(dbT).normalize();
        const dbRight = new THREE.Vector3().crossVectors(dbTan, upVec).normalize();
        const dbRotY = Math.atan2(dbTan.x, dbTan.z);

        const dbGroup = new THREE.Group();
        const dbPos = dbPt.clone().add(dbRight.clone().multiplyScalar(outsideSide * (halfW + 3.2)));
        dbGroup.position.set(dbPos.x, dbPt.y + 1.2, dbPos.z);
        dbGroup.rotation.y = dbRotY;

        const dbMesh = new THREE.Mesh(distBoardGeo, new THREE.MeshStandardMaterial({ map: db.tex, roughness: 0.3 }));
        dbGroup.add(dbMesh);

        const dbPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x475569 })
        );
        dbPost.position.y = -0.6;
        dbGroup.add(dbPost);

        decorations.add(dbGroup);
      });
    }
  }

  // 9. Majestic Sky Centerpieces (Theme Atmosphere)
  if (trackDef.theme === 'beach') {
    // 2 Floating Tropical Hot Air Balloons
    [
      { pos: new THREE.Vector3(80, 62, 100), colorA: 0xef4444, colorB: 0xfacc15 },
      { pos: new THREE.Vector3(-110, 75, -80), colorA: 0x0284c7, colorB: 0xf8fafc },
    ].forEach(balloon => {
      const bGroup = new THREE.Group();
      bGroup.position.copy(balloon.pos);

      // Balloon Envelope
      const envelope = new THREE.Mesh(
        new THREE.SphereGeometry(9, 16, 16),
        new THREE.MeshStandardMaterial({ color: balloon.colorA, roughness: 0.4 })
      );
      envelope.scale.set(1.0, 1.35, 1.0);
      bGroup.add(envelope);

      // Mid Stripe
      const stripe = new THREE.Mesh(
        new THREE.TorusGeometry(8.9, 0.6, 8, 24),
        new THREE.MeshStandardMaterial({ color: balloon.colorB })
      );
      stripe.rotation.x = Math.PI / 2;
      bGroup.add(stripe);

      // Wicker Basket
      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 2.2, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
      );
      basket.position.y = -15;
      bGroup.add(basket);

      // Burner glow
      const burner = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.0 })
      );
      burner.position.y = -12.5;
      bGroup.add(burner);

      decorations.add(bGroup);
    });
  } else if (trackDef.theme === 'spooky') {
    // Giant Luminous Full Moon
    const moonGroup = new THREE.Group();
    moonGroup.position.set(-60, 80, -220);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(18, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xfef9c3,
        emissive: 0xfacc15,
        emissiveIntensity: 0.75,
        roughness: 0.8,
      })
    );
    moonGroup.add(moon);

    // Darker Crater Details on Moon Surface
    for (let c = 0; c < 5; c++) {
      const crater = new THREE.Mesh(
        new THREE.SphereGeometry(2.5 - c * 0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.9 })
      );
      const angle = c * 1.3;
      crater.position.set(Math.cos(angle) * 11, Math.sin(angle) * 8, 14);
      moonGroup.add(crater);
    }

    decorations.add(moonGroup);
  } else if (trackDef.theme === 'cyber') {
    // Floating Futuristic Holographic Sponsor Blimp
    const blimpGroup = new THREE.Group();
    blimpGroup.position.set(40, 70, 60);
    blimpGroup.rotation.y = 0.45;

    const hull = new THREE.Mesh(
      new THREE.SphereGeometry(14, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
    );
    hull.scale.set(1.0, 0.75, 2.8);
    blimpGroup.add(hull);

    // Glowing Neon Hologram Banner on Blimp
    const blimpSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 5, 28),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 1.0,
      })
    );
    blimpSign.position.set(14.2, 0, 0);
    blimpGroup.add(blimpSign);

    decorations.add(blimpGroup);
  } else if (trackDef.theme === 'ice') {
    // Giant Snowy Mountain Peaks along horizon
    const peakGeo = new THREE.ConeGeometry(55, 110, 6);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const snowCapGeo = new THREE.ConeGeometry(24, 45, 6);
    const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

    for (let m = 0; m < 8; m++) {
      const angle = (m / 8) * Math.PI * 2;
      const dist = 360 + (m % 2) * 50;
      const mGroup = new THREE.Group();
      mGroup.position.set(Math.cos(angle) * dist, -5, Math.sin(angle) * dist);

      const mountain = new THREE.Mesh(peakGeo, rockMat);
      mountain.position.y = 55;
      mGroup.add(mountain);

      const snowCap = new THREE.Mesh(snowCapGeo, snowCapMat);
      snowCap.position.y = 88;
      mGroup.add(snowCap);

      decorations.add(mGroup);
    }
  }

  // 10. Outer Guard Rails (placed comfortably at halfW + 4.8m so racers can drift with wide arcs)
  const railSegments = 160;
  for (let i = 0; i < railSegments; i += 2) {
    const t = i / railSegments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
    const rotY = Math.atan2(tangent.x, tangent.z);

    const railGeo = new THREE.BoxGeometry(0.4, 1.2, 4.4);
    const railColor = trackDef.theme === 'cyber' ? 0x06b6d4 : (trackDef.theme === 'ice' ? 0x38bdf8 : 0x94a3b8);
    const railMat = new THREE.MeshStandardMaterial({
      color: railColor,
      metalness: 0.6,
      roughness: 0.3,
    });

    // Left guard rail (placed at halfW + 4.8m)
    const leftWall = new THREE.Mesh(railGeo, railMat);
    leftWall.position.copy(pt).add(right.clone().multiplyScalar(-halfW - 4.8));
    leftWall.position.y += 0.6;
    leftWall.rotation.y = rotY;
    wallsGroup.add(leftWall);

    // Right guard rail (placed at halfW + 4.8m)
    const rightWall = new THREE.Mesh(railGeo, railMat);
    rightWall.position.copy(pt).add(right.clone().multiplyScalar(halfW + 4.8));
    rightWall.position.y += 0.6;
    rightWall.rotation.y = rotY;
    wallsGroup.add(rightWall);
  }

  return {
    curve,
    trackWidth,
    checkpoints,
    centerlinePoints,
    getTrackInfo,
    itemBoxes,
    boostPads,
    decorations,
    trackMesh,
    curbsMesh: curbsGroup,
    wallsMesh: wallsGroup,
    startArch,
    theme: trackDef.theme,
    waterMesh,
  };
}
