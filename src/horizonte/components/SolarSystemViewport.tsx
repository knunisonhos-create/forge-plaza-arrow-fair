import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  ActiveEnemy,
  Mission,
  PlanetData,
  PlayerCampaignState,
  StarSystemFull,
  SystemPhenomenon,
  WeaponDamageType,
} from '../types/game';
import { FACTIONS_BY_ID } from '../data/lifeforms';
import { HULLS_BY_ID, WEAPONS_BY_ID } from '../data/items';
import { createRadialGlowTexture, getDestroyedPlanetTexture, getPlanetTexture } from '../engine/proceduralTextures';
import { soundEngine } from '../engine/audio';
import { canvasPixelRatio } from '../utils/mobileLandscape';

export interface SolarSystemViewportProps {
  system: StarSystemFull;
  campaign: PlayerCampaignState;
  timeScale: number;
  selectedPlanetId: string | null;
  selectedPhenomenonId: string | null;
  rightPanelOpen: boolean;
  rightPanelHalfScreen?: boolean;
  travelTargetPlanetId: string | null;
  travelTargetPhenomenonId: string | null;
  miningTargetId: string | null;
  landingPulse?: { planetId: string; nonce: number } | null;
  dockedPlanetId?: string | null;
  activeEnemies: ActiveEnemy[];
  isFleeing?: boolean;
  combatMissionTarget: Mission | null;
  onSelectPlanet: (planetId: string) => void;
  onSelectPhenomenon: (phenId: string) => void;
  onArrivedAtPlanetOrbit: (planetId: string) => void;
  onArrivedAtPhenomenon: (phenId: string) => void;
  onShipMoveUpdate: (pos: { x: number; z: number }, orbitingPlanetId: string | null) => void;
  onStartMissionCombat: (mission: Mission) => void;
  onCombatTick: (updatedEnemies: ActiveEnemy[], playerDamageTaken: number, reflectedDamage: number, enemyKilledIds: string[]) => void;
  onPlanetDevastated?: (planetId: string, causeLabel: string) => void;
  onHazardCleared?: (hazardId: string) => void;
  onPlayerMessage?: (text: string) => void;
}

interface TangentPoint {
  x: number;
  z: number;
}

interface ObstacleCircle {
  x: number;
  z: number;
  radius: number;
  id?: string;
}

function createVolcanicDestroyedMaterial(seed: number, maxAnisotropy: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: getPlanetTexture('TX04', seed, maxAnisotropy),
    emissive: new THREE.Color('#ea580c'),
    emissiveIntensity: 0.62,
    roughness: 0.58,
    metalness: 0.06,
  });
}

// Compute tangent-routed path around star exclusion & planetary spheres so ships steer around obstacles
function computeSafeTrajectory(
  start: TangentPoint,
  rawEnd: TangentPoint,
  exclusionRadius: number,
  obstacles: ObstacleCircle[] = []
): TangentPoint[] {
  let endX = rawEnd.x;
  let endZ = rawEnd.z;

  if (exclusionRadius > 0.5) {
    const endDist = Math.hypot(endX, endZ);
    if (endDist < exclusionRadius + 1.6) {
      const angle = endDist > 0.001 ? Math.atan2(endZ, endX) : 0;
      endX = Math.cos(angle) * (exclusionRadius + 2.2);
      endZ = Math.sin(angle) * (exclusionRadius + 2.2);
    }
  }

  // Push destination out of any planet/solid obstacle buffer
  for (const obs of obstacles) {
    const dx = endX - obs.x;
    const dz = endZ - obs.z;
    const d = Math.hypot(dx, dz);
    if (d < obs.radius + 1.2) {
      const a = d > 0.001 ? Math.atan2(dz, dx) : 0;
      endX = obs.x + Math.cos(a) * (obs.radius + 1.4);
      endZ = obs.z + Math.sin(a) * (obs.radius + 1.4);
    }
  }

  const end: TangentPoint = { x: endX, z: endZ };
  const pts: TangentPoint[] = [];

  if (exclusionRadius > 0.5) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const segLenSq = dx * dx + dz * dz;
    if (segLenSq > 0.01) {
      const t = Math.max(0, Math.min(1, -(start.x * dx + start.z * dz) / segLenSq));
      const closestDist = Math.hypot(start.x + t * dx, start.z + t * dz);
      if (closestDist < exclusionRadius + 0.6) {
        const a1 = Math.atan2(start.z, start.x);
        const a2 = Math.atan2(end.z, end.x);
        let diff = a2 - a1;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const arcRadius = exclusionRadius + 2.6;
        const steps = 6;
        for (let i = 1; i < steps; i++) {
          const a = a1 + (diff * i) / steps;
          pts.push({ x: Math.cos(a) * arcRadius, z: Math.sin(a) * arcRadius });
        }
      }
    }
  }

  // Insert lateral detour point if a planet blocks the chord
  const anchor = pts.length > 0 ? pts[pts.length - 1] : start;
  const sdx = end.x - anchor.x;
  const sdz = end.z - anchor.z;
  const sLenSq = sdx * sdx + sdz * sdz;
  if (sLenSq > 0.5 && obstacles.length > 0) {
    let bestT = 2;
    let blocking: ObstacleCircle | null = null;
    for (const obs of obstacles) {
      const t = Math.max(0, Math.min(1, ((obs.x - anchor.x) * sdx + (obs.z - anchor.z) * sdz) / sLenSq));
      if (t <= 0.05 || t >= 0.95) continue;
      const cx = anchor.x + t * sdx;
      const cz = anchor.z + t * sdz;
      const dist = Math.hypot(cx - obs.x, cz - obs.z);
      if (dist < obs.radius + 1.1 && t < bestT) {
        bestT = t;
        blocking = obs;
      }
    }
    if (blocking) {
      const segLen = Math.sqrt(sLenSq);
      const ux = sdx / segLen;
      const uz = sdz / segLen;
      const px = -uz;
      const pz = ux;
      const sideSign =
        (blocking.x - anchor.x) * px + (blocking.z - anchor.z) * pz >= 0 ? -1 : 1;
      const detourDist = blocking.radius + 2.8;
      pts.push({
        x: blocking.x + px * sideSign * detourDist,
        z: blocking.z + pz * sideSign * detourDist,
      });
    }
  }

  pts.push(end);
  return pts;
}

// Smooth real-time tangential deflection around nearby planets and exclusion zone.
// Keep-out is only the solid hull. Orbit altitude (radius + ~3.8) stays reachable,
// and the destination planet is ignored so a ship can enter and leave orbit.
function steerAroundObstacles(
  posX: number,
  posZ: number,
  desiredDirX: number,
  desiredDirZ: number,
  obstacles: ObstacleCircle[],
  starExclusion: number,
  outDir: THREE.Vector3,
  ignoreId?: string | null
): void {
  let sx = desiredDirX;
  let sz = desiredDirZ;
  const lookAhead = 4.4;

  // Star avoidance
  if (starExclusion > 0.5) {
    const starDist = Math.hypot(posX, posZ);
    const starSafe = starExclusion + 2.2;
    if (starDist < starSafe + 6.5 && starDist > 0.01) {
      const nx = posX / starDist;
      const nz = posZ / starDist;
      const dot = desiredDirX * (-nx) + desiredDirZ * (-nz);
      if (dot > 0 || starDist < starSafe) {
        const w = starDist < starSafe ? 2.8 : ((starSafe + 6.5 - starDist) / 6.5) * 1.4;
        const tx = -nz;
        const tz = nx;
        const side = tx * desiredDirX + tz * desiredDirZ >= 0 ? 1 : -1;
        sx += (nx * 0.9 + tx * side * 1.1) * w;
        sz += (nz * 0.9 + tz * side * 1.1) * w;
      }
    }
  }

  // Planet & solid obstacle tangential avoidance
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (ignoreId && obs.id && obs.id === ignoreId) continue;
    const rx = obs.x - posX;
    const rz = obs.z - posZ;
    const dist = Math.hypot(rx, rz);
    const avoidRad = obs.radius + 1.05;
    if (dist >= avoidRad + lookAhead || dist <= 0.01) continue;

    const outX = (posX - obs.x) / dist;
    const outZ = (posZ - obs.z) / dist;
    const proj = rx * desiredDirX + rz * desiredDirZ;
    // Already clear and heading away: do not trap the ship in a tangent orbit.
    if (proj <= 0 && dist > avoidRad + 0.45) continue;

    const ahead = Math.max(0, Math.min(proj, lookAhead));
    const closestX = posX + desiredDirX * ahead;
    const closestZ = posZ + desiredDirZ * ahead;
    const perpDist = Math.hypot(closestX - obs.x, closestZ - obs.z);
    if (perpDist >= avoidRad && dist >= avoidRad + 0.35) continue;

    const penetration = Math.max(0, avoidRad - Math.min(dist, perpDist));
    const urgency = THREE.MathUtils.clamp(0.25 + penetration / Math.max(0.85, obs.radius * 0.4), 0.25, 1.35);
    const tangX = -outZ;
    const tangZ = outX;
    const side = tangX * desiredDirX + tangZ * desiredDirZ >= 0 ? 1 : -1;
    const outWeight = dist < avoidRad ? 1.45 : 0.22;
    sx += (tangX * side * 1.25 + outX * outWeight) * urgency;
    sz += (tangZ * side * 1.25 + outZ * outWeight) * urgency;
  }

  outDir.set(sx, 0, sz);
  if (outDir.lengthSq() > 0.0001) {
    outDir.normalize();
  } else {
    outDir.set(desiredDirX, 0, desiredDirZ);
  }
}

function buildCompositeShipMesh(colorHex: string, scale = 1, isWarship = false): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.65,
    roughness: 0.3,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.8,
    roughness: 0.45,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
  });

  // 1. Primary Hull Fuselage
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.65 * scale, 2.4 * scale, 6),
    hullMat
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // 2. Cockpit Canopy
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.32 * scale, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#bae6fd', metalness: 0.2, roughness: 0.1 })
  );
  canopy.scale.set(0.8, 0.55, 1.3);
  canopy.position.set(0, 0.28 * scale, 0.3 * scale);
  group.add(canopy);

  // 3. Port & Starboard Wings
  const wingGeo = new THREE.BoxGeometry(isWarship ? 2.8 * scale : 2.1 * scale, 0.1 * scale, 0.9 * scale);
  const wings = new THREE.Mesh(wingGeo, trimMat);
  wings.position.set(0, -0.05 * scale, -0.35 * scale);
  group.add(wings);

  // 4. Dual Engine Thrusters
  [-0.45 * scale, 0.45 * scale].forEach((ox) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.22 * scale, 0.8 * scale, 8), trimMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(ox, 0, -0.85 * scale);
    group.add(pod);

    const nozzle = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 8, 8), glowMat);
    nozzle.position.set(ox, 0, -1.25 * scale);
    group.add(nozzle);
  });

  // 5. Dorsal Accent Fin
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.5 * scale, 0.8 * scale), hullMat);
  fin.position.set(0, 0.35 * scale, -0.7 * scale);
  group.add(fin);

  return group;
}

export const SolarSystemViewport: React.FC<SolarSystemViewportProps> = (props) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Store mutable simulation state across renders without tearing down WebGL
  const simRef = useRef<{
    shipPos: THREE.Vector3;
    shipRotY: number;
    shipSpeed: number;
    waypoints: TangentPoint[];
    manualTarget: TangentPoint | null;
    orbitingPlanetId: string | null;
    travelPlanetId: string | null;
    travelPhenomenonId: string | null;
    travelMissionTarget: Mission | null;
    playerFireCooldown: number;
    enemyFireCooldowns: Record<string, number>;
    liveEnemies: Map<string, ActiveEnemy>;
    seenEnemyIds: Set<string>;
    accPlayerDmg: number;
    accReflectedDmg: number;
    pendingKilledIds: Set<string>;
    combatDirty: boolean;
    combatSyncTimer: number;
    lastPosSyncTime: number;
    systemId: string;
    simTime: number;
    orbitAngle: number;
    landingPlanetId: string | null;
    landingProgress: number;
    landingHoldTimer: number;
    lastLandingNonce: number;
    fleeWaypoints: TangentPoint[];
    fleeIndex: number;
  }>({
    shipPos: new THREE.Vector3(props.campaign.playerPos.x, 0, props.campaign.playerPos.z),
    shipRotY: 0,
    shipSpeed: 0,
    waypoints: [],
    manualTarget: null,
    orbitingPlanetId: props.campaign.orbitingPlanetId,
    travelPlanetId: props.travelTargetPlanetId,
    travelPhenomenonId: props.travelTargetPhenomenonId,
    travelMissionTarget: null,
    playerFireCooldown: 0,
    enemyFireCooldowns: {},
    liveEnemies: new Map(),
    seenEnemyIds: new Set(),
    accPlayerDmg: 0,
    accReflectedDmg: 0,
    pendingKilledIds: new Set(),
    combatDirty: false,
    combatSyncTimer: 0,
    lastPosSyncTime: 0,
    systemId: props.system.id,
    simTime: props.campaign.gameTimeSeconds,
    orbitAngle: 0,
    landingPlanetId: null,
    landingProgress: 0,
    landingHoldTimer: 0,
    lastLandingNonce: 0,
    fleeWaypoints: [],
    fleeIndex: 0,
  });

  // Sync incoming system changes & explicit planet/phenomenon travel buttons
  useEffect(() => {
    if (simRef.current.systemId !== props.system.id) {
      simRef.current.systemId = props.system.id;
      simRef.current.shipPos.set(props.campaign.playerPos.x, 0, props.campaign.playerPos.z);
      simRef.current.waypoints = [];
      simRef.current.manualTarget = null;
      simRef.current.orbitingPlanetId = props.campaign.orbitingPlanetId;
      simRef.current.travelPlanetId = props.travelTargetPlanetId;
      simRef.current.travelPhenomenonId = props.travelTargetPhenomenonId;
      simRef.current.travelMissionTarget = null;
      simRef.current.liveEnemies.clear();
      simRef.current.seenEnemyIds.clear();
      simRef.current.simTime = props.campaign.gameTimeSeconds;
    }
  }, [
    props.system.id,
    props.campaign.playerPos.x,
    props.campaign.playerPos.z,
    props.campaign.orbitingPlanetId,
    props.travelTargetPlanetId,
    props.travelTargetPhenomenonId,
    props.campaign.gameTimeSeconds,
  ]);

  useEffect(() => {
    if (props.travelTargetPlanetId) {
      simRef.current.travelPlanetId = props.travelTargetPlanetId;
      simRef.current.travelPhenomenonId = null;
      simRef.current.orbitingPlanetId = null;
      simRef.current.manualTarget = null;
      simRef.current.travelMissionTarget = null;
    }
  }, [props.travelTargetPlanetId]);

  useEffect(() => {
    if (props.travelTargetPhenomenonId) {
      simRef.current.travelPhenomenonId = props.travelTargetPhenomenonId;
      simRef.current.travelPlanetId = null;
      simRef.current.orbitingPlanetId = null;
      simRef.current.manualTarget = null;
      simRef.current.travelMissionTarget = null;
      simRef.current.waypoints = [];
    }
  }, [props.travelTargetPhenomenonId]);

  useEffect(() => {
    if (!props.campaign.orbitingPlanetId && !props.travelTargetPlanetId && simRef.current.orbitingPlanetId) {
      const oldPlanetId = simRef.current.orbitingPlanetId;
      simRef.current.orbitingPlanetId = null;
      const orbPlanet = props.system.planets.find((p) => p.id === oldPlanetId);
      if (orbPlanet) {
        const len = Math.hypot(simRef.current.shipPos.x, simRef.current.shipPos.z);
        if (len > 0.1) {
          simRef.current.shipPos.x += (simRef.current.shipPos.x / len) * 2.5;
          simRef.current.shipPos.z += (simRef.current.shipPos.z / len) * 2.5;
        }
      }
    }
  }, [props.campaign.orbitingPlanetId, props.travelTargetPlanetId, props.system.planets]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : canvasPixelRatio(width, height));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040710');
    scene.fog = new THREE.FogExp2('#040710', 0.0014);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 1200);
    camera.position.set(simRef.current.shipPos.x, 48, simRef.current.shipPos.z + 44);

    const controls = new OrbitControls(camera, renderer.domElement);
    // Section 20.1: Camera ALWAYS centered & locked on ship, rotation + zoom only, NO pan/drag map
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 16;
    controls.maxDistance = 240;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.12;
    controls.target.copy(simRef.current.shipPos);

    // Ambient + Hemisphere + Star PointLight
    const hemiLight = new THREE.HemisphereLight('#93c5fd', '#0f172a', 0.65);
    scene.add(hemiLight);
    const starLight = new THREE.PointLight(propsRef.current.system.starColor, 4.5, 500, 0.4);
    starLight.position.set(0, 0, 0);
    scene.add(starLight);

    // Deep Starfield Background
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 260 + (i % 140) * 1.5;
      const theta = i * 2.39996;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) * 0.6 - 30;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const bgStars = new THREE.Points(
      bgGeo,
      new THREE.PointsMaterial({ color: '#cbd5e1', size: 1.1, sizeAttenuation: true })
    );
    scene.add(bgStars);

    // System-scoped object group so switching systems rebuilds cleanly
    const sysGroup = new THREE.Group();
    scene.add(sysGroup);

    const planetMeshes = new Map<string, { group: THREE.Group; sphere: THREE.Mesh; data: PlanetData; isDestroyed: boolean }>();
    const phenomenonMeshes = new Map<string, { group: THREE.Group; data: SystemPhenomenon }>();
    const clickableMeshes: THREE.Object3D[] = [];
    const enemyMeshes = new Map<string, THREE.Group>();
    const npcTraffic: Array<{
      mesh: THREE.Group;
      pos: THREE.Vector3;
      fromPlanetId: string;
      toPlanetId: string;
      speed: number;
      factionId: string;
      phase: 'leave' | 'cruise' | 'enter' | 'berthed';
      anim: number;
      wait: number;
      baseScale: number;
    }> = [];
    const rogueAsteroids: Array<{
      mesh: THREE.Group;
      orbitRadius: number;
      orbitSpeed: number;
      orbitPhase: number;
      eccentricity: number;
      cooldown: number;
      id: string;
    }> = [];
    const devastatedPlanetIds = new Set<string>();
    const obstaclePool: ObstacleCircle[] = [];
    let sceneAge = 0;

    // Projectile / beam / cataclysm transient VFX pool
    const vfxList: Array<{ mesh: THREE.Object3D; age: number; maxAge: number; vel?: THREE.Vector3; growRate?: number }> = [];

    // Player Ship Composite 3D Group (rebuilt dynamically when active ship/faction color changes)
    const initShip =
      propsRef.current.campaign.ships.find((s) => s.uid === propsRef.current.campaign.activeShipUid) ??
      propsRef.current.campaign.ships[0];
    const initHull = initShip ? HULLS_BY_ID[initShip.hullId] : null;
    const initFac = FACTIONS_BY_ID[initShip?.factionId ?? propsRef.current.campaign.chosenFactionId];
    const initColor = initShip?.color ?? initHull?.color ?? initFac?.color ?? '#38bdf8';
    let currentShipVisualKey = `${initShip?.uid ?? ''}_${initShip?.hullId ?? ''}_${initColor}`;
    let playerShipGroup = buildCompositeShipMesh(
      initColor,
      1.15,
      Boolean(initHull && (initHull.armor >= 18 || initHull.hullShape === 'cruzador' || initHull.hullShape === 'fragata'))
    );
    playerShipGroup.position.copy(simRef.current.shipPos);
    scene.add(playerShipGroup);

    // Destination Marker & Trajectory Line
    const destMarker = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.5, 24),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    destMarker.rotation.x = -Math.PI / 2;
    destMarker.visible = false;
    scene.add(destMarker);

    const trajectoryLineMat = new THREE.LineDashedMaterial({
      color: '#38bdf8',
      dashSize: 1.4,
      gapSize: 0.9,
      transparent: true,
      opacity: 0.75,
    });
    const trajectoryLine = new THREE.Line(new THREE.BufferGeometry(), trajectoryLineMat);
    trajectoryLine.visible = false;
    scene.add(trajectoryLine);

    // Selected Planet Highlight Ring
    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.52, 48),
      new THREE.MeshBasicMaterial({ color: '#facc15', side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.visible = false;
    scene.add(selectionRing);

    // Combat Auto-Target 3D Ring
    const targetRing = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.0, 32),
      new THREE.MeshBasicMaterial({ color: '#ef4444', side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
    );
    targetRing.rotation.x = -Math.PI / 2;
    targetRing.visible = false;
    scene.add(targetRing);

    // Mining Beam & Spiral Particles
    const miningBeamGeo = new THREE.CylinderGeometry(0.14, 0.35, 1, 8);
    miningBeamGeo.translate(0, 0.5, 0);
    miningBeamGeo.rotateX(Math.PI / 2);
    const miningBeam = new THREE.Mesh(
      miningBeamGeo,
      new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.85 })
    );
    miningBeam.visible = false;
    scene.add(miningBeam);

    const miningImpactRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.9, 24),
      new THREE.MeshBasicMaterial({ color: '#67e8f9', side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    miningImpactRing.visible = false;
    scene.add(miningImpactRing);

    // Combat Mission Target Ship (Section 16.6)
    let missionTargetMesh: THREE.Group | null = null;
    let missionTargetRing: THREE.Mesh | null = null;

    // Build / Rebuild Solar System 3D objects
    let currentBuiltSystemId = '';
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const rebuildSystemScene = (sys: StarSystemFull) => {
      currentBuiltSystemId = sys.id;
      while (sysGroup.children.length > 0) {
        sysGroup.remove(sysGroup.children[0]);
      }
      planetMeshes.clear();
      phenomenonMeshes.clear();
      clickableMeshes.length = 0;
      npcTraffic.length = 0;
      rogueAsteroids.length = 0;
      devastatedPlanetIds.clear();
      sceneAge = 0;
      missionTargetMesh = null;
      missionTargetRing = null;

      starLight.color.set(sys.starColor);

      // 1. Star or Black Hole
      if (sys.isBlackHole) {
        const bhCore = new THREE.Mesh(
          new THREE.SphereGeometry(sys.starRadius * 0.72, 32, 32),
          new THREE.MeshBasicMaterial({ color: '#000000' })
        );
        sysGroup.add(bhCore);

        const accretion = new THREE.Mesh(
          new THREE.RingGeometry(sys.starRadius * 0.95, sys.starRadius * 2.4, 64),
          new THREE.MeshBasicMaterial({
            color: sys.isSupermassive ? '#f59e0b' : '#a855f7',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.78,
          })
        );
        accretion.rotation.x = -Math.PI / 2 + 0.16;
        sysGroup.add(accretion);

        const lensRing = new THREE.Mesh(
          new THREE.TorusGeometry(sys.starRadius * 1.15, 0.25, 16, 64),
          new THREE.MeshBasicMaterial({ color: '#e879f9', transparent: true, opacity: 0.6 })
        );
        sysGroup.add(lensRing);

        if (sys.isSupermassive) {
          const jetGeo = new THREE.ConeGeometry(1.4, 38, 16, 1, true);
          const jetMat = new THREE.MeshBasicMaterial({
            color: '#c084fc',
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
          });
          const jetN = new THREE.Mesh(jetGeo, jetMat);
          jetN.position.y = 19;
          jetN.rotation.x = Math.PI;
          const jetS = new THREE.Mesh(jetGeo, jetMat);
          jetS.position.y = -19;
          sysGroup.add(jetN, jetS);
        }
      } else {
        const starMesh = new THREE.Mesh(
          new THREE.SphereGeometry(sys.starRadius, 32, 32),
          new THREE.MeshBasicMaterial({ color: sys.starColor })
        );
        sysGroup.add(starMesh);

        const spriteMat = new THREE.SpriteMaterial({
          map: createRadialGlowTexture(sys.starColor),
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const halo = new THREE.Sprite(spriteMat);
        halo.scale.set(sys.starRadius * 4.5, sys.starRadius * 4.5, 1);
        sysGroup.add(halo);
      }

      // 2. Star Gravitational Exclusion Zone (Visible Halo + Dashed Perimeter)
      const exclHalo = new THREE.Mesh(
        new THREE.RingGeometry(sys.starExclusionRadius - 0.6, sys.starExclusionRadius, 64),
        new THREE.MeshBasicMaterial({ color: '#f97316', side: THREE.DoubleSide, transparent: true, opacity: 0.2 })
      );
      exclHalo.rotation.x = -Math.PI / 2;
      sysGroup.add(exclHalo);

      const exclPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        exclPts.push(new THREE.Vector3(Math.cos(a) * sys.starExclusionRadius, 0.05, Math.sin(a) * sys.starExclusionRadius));
      }
      const exclGeo = new THREE.BufferGeometry().setFromPoints(exclPts);
      const exclLine = new THREE.Line(
        exclGeo,
        new THREE.LineDashedMaterial({ color: '#fb923c', dashSize: 1.5, gapSize: 1.2, transparent: true, opacity: 0.75 })
      );
      exclLine.computeLineDistances();
      sysGroup.add(exclLine);

      // 3. System Nebula Backdrop (only inside nebula systems)
      if (sys.inNebula && sys.nebulaColor) {
        for (let i = 0; i < 6; i++) {
          const sp = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: createRadialGlowTexture(sys.nebulaColor),
              transparent: true,
              opacity: 0.22,
              depthWrite: false,
            })
          );
          const a = (i / 6) * Math.PI * 2;
          sp.position.set(Math.cos(a) * 90, -18, Math.sin(a) * 90);
          sp.scale.set(160, 160, 1);
          sysGroup.add(sp);
        }
      }

      // 4. Asteroid Belts
      sys.asteroidBeltRadii.forEach((beltR) => {
        const rockCount = 90;
        const inst = new THREE.InstancedMesh(
          new THREE.DodecahedronGeometry(0.42, 0),
          new THREE.MeshStandardMaterial({ color: '#78716c', roughness: 0.9, metalness: 0.2 }),
          rockCount
        );
        const dummy = new THREE.Object3D();
        for (let k = 0; k < rockCount; k++) {
          const a = (k / rockCount) * Math.PI * 2 + (k % 5) * 0.08;
          const rr = beltR + ((k % 7) - 3) * 0.65;
          dummy.position.set(Math.cos(a) * rr, ((k % 3) - 1) * 0.4, Math.sin(a) * rr);
          dummy.rotation.set(k * 0.5, k * 0.9, 0);
          const sc = 0.6 + (k % 4) * 0.25;
          dummy.scale.set(sc, sc, sc);
          dummy.updateMatrix();
          inst.setMatrixAt(k, dummy.matrix);
        }
        inst.computeBoundingSphere();
        sysGroup.add(inst);
      });

      // 5. Planets + Orbit Lines + Moons + Rings (supports irregular lava level -1 & eccentricity)
      const camOverrides = propsRef.current.campaign.planetOverrides;
      sys.planets.forEach((p) => {
        const effLevel = camOverrides[p.id]?.level ?? p.level;
        const isDestroyed = effLevel === -1;
        if (isDestroyed) devastatedPlanetIds.add(p.id);
        const ecc = p.eccentricity ?? 0;

        const orbitPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * Math.PI * 2;
          orbitPts.push(new THREE.Vector3(Math.cos(a) * p.orbitRadius, -0.05, Math.sin(a) * p.orbitRadius * (1 - ecc)));
        }
        const orbitLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(orbitPts),
          new THREE.LineBasicMaterial({
            color: isDestroyed ? '#7c2d12' : '#334155',
            transparent: true,
            opacity: isDestroyed ? 0.55 : 0.45,
          })
        );
        sysGroup.add(orbitLine);

        const pGroup = new THREE.Group();
        const sphereGeo = new THREE.SphereGeometry(p.radius, 28, 28);
        const sphereMat = isDestroyed
          ? createVolcanicDestroyedMaterial(p.seed, maxAniso)
          : new THREE.MeshStandardMaterial({
              map: getPlanetTexture(p.typeCode, p.seed, maxAniso),
              roughness: 0.72,
              metalness: p.typeCode === 'TX09' || p.typeCode === 'TX22' ? 0.65 : 0.08,
            });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.userData = { clickKind: 'planet', planetId: p.id };
        pGroup.add(sphere);
        clickableMeshes.push(sphere);

        if (isDestroyed) {
          // Orbiting shattered basalt crust fragments around devastated world
          for (let f = 0; f < 5; f++) {
            const frag = new THREE.Mesh(
              new THREE.DodecahedronGeometry(p.radius * 0.14, 0),
              new THREE.MeshStandardMaterial({ color: '#272024', emissive: '#9a3412', emissiveIntensity: 0.45, roughness: 0.9 })
            );
            const fa = (f / 5) * Math.PI * 2;
            const fr = p.radius * 1.48 + (f % 2) * 0.45;
            frag.position.set(Math.cos(fa) * fr, ((f % 3) - 1) * 0.35, Math.sin(fa) * fr);
            frag.rotation.set(f * 0.8, f * 1.3, 0);
            pGroup.add(frag);
          }
        } else {
          if (p.hasRings) {
            const ring = new THREE.Mesh(
              new THREE.RingGeometry(p.radius * 1.35, p.radius * 2.1, 48),
              new THREE.MeshBasicMaterial({
                color: p.ringColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.52,
              })
            );
            ring.rotation.x = Math.PI / 2 - 0.3;
            pGroup.add(ring);
          }

          for (let m = 0; m < p.moonsCount; m++) {
            const moon = new THREE.Mesh(
              new THREE.SphereGeometry(0.32 + m * 0.06, 12, 12),
              new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.85 })
            );
            const ma = (m / Math.max(1, p.moonsCount)) * Math.PI * 2;
            const mr = p.radius * 1.65 + m * 0.9;
            moon.position.set(Math.cos(ma) * mr, 0.25 * (m - 1), Math.sin(ma) * mr);
            pGroup.add(moon);
          }
        }

        const t = propsRef.current.campaign.gameTimeSeconds;
        const a = p.orbitPhase + t * p.orbitSpeed;
        pGroup.position.set(Math.cos(a) * p.orbitRadius, 0, Math.sin(a) * p.orbitRadius * (1 - ecc));

        sysGroup.add(pGroup);
        planetMeshes.set(p.id, { group: pGroup, sphere, data: p, isDestroyed });
      });

      // 6. System Phenomena (Nebula pocket, Errant Comet, Meteor Field, Shipwreck, Black Hole)
      sys.phenomena.forEach((ph) => {
        if ((propsRef.current.campaign.clearedHazards ?? []).includes(ph.id)) return;
        const phGroup = new THREE.Group();
        phGroup.position.set(ph.position.x, 0, ph.position.z);

        let hitProxy: THREE.Object3D;
        if (ph.kind === 'nebulosa_sistema') {
          const cloud = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: createRadialGlowTexture(sys.nebulaColor ?? '#22d3ee'),
              transparent: true,
              opacity: 0.72,
              depthWrite: false,
            })
          );
          cloud.scale.set(11, 11, 1);
          phGroup.add(cloud);
          hitProxy = new THREE.Mesh(
            new THREE.SphereGeometry(3.2, 12, 12),
            new THREE.MeshBasicMaterial({ visible: false })
          );
        } else if (ph.kind === 'cometa_errante') {
          const head = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.2, 1),
            new THREE.MeshStandardMaterial({ color: '#bae6fd', emissive: '#0284c7', emissiveIntensity: 0.4 })
          );
          const tail = new THREE.Mesh(
            new THREE.ConeGeometry(1.1, 6.5, 10, 1, true),
            new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.45 })
          );
          tail.rotation.x = Math.PI / 2;
          tail.position.z = -3.4;
          phGroup.add(head, tail);
          hitProxy = head;
        } else if (ph.kind === 'destrocos_nave') {
          const hullPart = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.8, 3.2),
            new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.7, roughness: 0.5 })
          );
          hullPart.rotation.set(0.2, 0.5, 0.35);
          const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 8, 8),
            new THREE.MeshBasicMaterial({ color: '#f59e0b' })
          );
          beacon.position.y = 0.9;
          phGroup.add(hullPart, beacon);
          hitProxy = hullPart;
        } else if (ph.kind === 'buraco_negro') {
          const probeRing = new THREE.Mesh(
            new THREE.TorusGeometry(Math.max(3.5, sys.starRadius * 1.45), 0.16, 10, 48),
            new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.75 })
          );
          probeRing.rotation.x = Math.PI / 2;
          phGroup.add(probeRing);
          hitProxy = new THREE.Mesh(
            new THREE.SphereGeometry(Math.max(5.5, sys.starRadius * 1.55), 14, 14),
            new THREE.MeshBasicMaterial({ visible: false })
          );
        } else {
          // Campo de Meteoros: pelo menos 14 meteoros menores em movimento
          const meteorCount = 14;
          const colors = ['#a8a29e', '#78716c', '#94a3b8', '#64748b'];
          for (let m = 0; m < meteorCount; m++) {
            const angle = (m / meteorCount) * Math.PI * 2 + (m % 3) * 0.45;
            const ringR = 0.8 + ((m * 1.37) % 4.4);
            const size = 0.36 + (m % 4) * 0.14;
            const rock = new THREE.Mesh(
              new THREE.DodecahedronGeometry(size, 0),
              new THREE.MeshStandardMaterial({
                color: colors[m % colors.length],
                roughness: 0.88,
                metalness: m % 3 === 0 ? 0.35 : 0.1,
              })
            );
            rock.position.set(
              Math.cos(angle) * ringR,
              ((m % 5) - 2) * 0.32,
              Math.sin(angle) * ringR
            );
            rock.rotation.set(m * 0.6, m * 1.1, m * 0.3);
            rock.userData = { rotSpeed: 0.35 + (m % 4) * 0.22 };
            phGroup.add(rock);
          }
          hitProxy = new THREE.Mesh(
            new THREE.SphereGeometry(4.8, 12, 12),
            new THREE.MeshBasicMaterial({ visible: false })
          );
        }

        hitProxy.userData = { clickKind: 'phenomenon', phenomenonId: ph.id };
        phGroup.add(hitProxy);
        clickableMeshes.push(hitProxy);
        sysGroup.add(phGroup);
        phenomenonMeshes.set(ph.id, { group: phGroup, data: ph });
      });

      // 7. Ambient NPC Ship Traffic departing lvl 3/4/5 planets (Section 16.5) with obstacle-aware steering
      const livingWorld = (planet: PlanetData) => (camOverrides[planet.id]?.level ?? planet.level) !== -1;
      const busyPlanets = sys.planets.filter((planet) => livingWorld(planet) && (camOverrides[planet.id]?.level ?? planet.level) >= 3);
      if (busyPlanets.length > 0 && sys.planets.length >= 2) {
        const trafficCount = busyPlanets.some((planet) => (camOverrides[planet.id]?.level ?? planet.level) >= 4) ? 5 : 3;
        for (let i = 0; i < trafficCount; i++) {
          const fromP = busyPlanets[i % busyPlanets.length];
          const destinations = sys.planets.filter((candidate) => candidate.id !== fromP.id && livingWorld(candidate));
          if (destinations.length === 0) continue;
          const toP = destinations[i % destinations.length];
          const facColor = fromP.factionId ? FACTIONS_BY_ID[fromP.factionId]?.color ?? '#94a3b8' : '#94a3b8';
          const baseScale = fromP.level >= 4 ? 0.9 : 0.72;
          const npcMesh = buildCompositeShipMesh(facColor, 1, false);
          const startPm = planetMeshes.get(fromP.id);
          const startPos = startPm ? startPm.group.position.clone() : new THREE.Vector3(fromP.orbitRadius, 0, 0);
          const departs = i % 2 === 0;
          const standoffAngle = fromP.orbitPhase + i * 1.1;
          const spawnRadius = departs ? fromP.radius * 0.72 : fromP.radius + 8 + (i % 3) * 3;
          const spawnPos = new THREE.Vector3(
            startPos.x + Math.cos(standoffAngle) * spawnRadius,
            0,
            startPos.z + Math.sin(standoffAngle) * spawnRadius
          );
          if (!departs) {
            const destPm = planetMeshes.get(toP.id);
            if (destPm) {
              spawnPos.lerp(destPm.group.position, 0.35);
            }
          }
          npcMesh.position.copy(spawnPos);
          npcMesh.scale.setScalar(departs ? baseScale * 0.2 : baseScale);
          sysGroup.add(npcMesh);
          npcTraffic.push({
            mesh: npcMesh,
            pos: spawnPos,
            fromPlanetId: fromP.id,
            toPlanetId: toP.id,
            speed: (fromP.level >= 4 ? 11.5 : 8.5) / 5,
            factionId: fromP.factionId ?? sys.controllingFactionId ?? 'neutral',
            phase: departs ? 'leave' : 'cruise',
            anim: 0,
            wait: 0,
            baseScale,
          });
        }
      }

      // 8. Rogue Crossing Asteroids on elliptical crossing orbits (can collide with planets in-scene)
      const rogueId = `${sys.id}_rogue_0`;
      if (
        !sys.isBlackHole &&
        sys.planets.length > 0 &&
        sys.seed % 5 === 0 &&
        sys.seed % 2 !== 0 &&
        !(propsRef.current.campaign.clearedHazards ?? []).includes(rogueId)
      ) {
        const maxOrbitR = sys.planets[sys.planets.length - 1].orbitRadius;
        const astGroup = new THREE.Group();
        astGroup.userData = { clickKind: 'hazard', hazardId: rogueId };
        const coreRock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.05, 0),
          new THREE.MeshStandardMaterial({
            color: '#57534e',
            emissive: '#7c2d12',
            emissiveIntensity: 0.28,
            roughness: 0.92,
            metalness: 0.18,
          })
        );
        astGroup.add(coreRock);
        const chip = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.35, 0),
          new THREE.MeshStandardMaterial({ color: '#78716c', roughness: 0.9 })
        );
        chip.position.set(1.05, 0.2, -0.55);
        astGroup.add(chip);
        const targetPlanet = sys.planets[1 % sys.planets.length];
        const orbR = Math.max(sys.starExclusionRadius + 10, Math.min(maxOrbitR + 8, targetPlanet.orbitRadius * 1.12));
        const ecc = 0.46;
        const phase = targetPlanet.orbitPhase + 1.35;
        astGroup.position.set(Math.cos(phase) * orbR, 0, Math.sin(phase) * orbR * (1 - ecc));
        sysGroup.add(astGroup);
        clickableMeshes.push(astGroup);
        rogueAsteroids.push({
          mesh: astGroup,
          orbitRadius: orbR,
          orbitSpeed: 0.05,
          orbitPhase: phase,
          eccentricity: ecc,
          cooldown: 0,
          id: rogueId,
        });
      }
    };

    rebuildSystemScene(propsRef.current.system);

    // Raycasting & Pointer Click Handling (differentiating drag vs click)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const distMoved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (distMoved > 6) return; // Dragged to rotate camera

      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (!Number.isFinite(mouse.x) || !Number.isFinite(mouse.y)) return;

      raycaster.setFromCamera(mouse, camera);

      // Check clickable 3D objects first
      const targets = [...clickableMeshes];
      if (missionTargetMesh) targets.push(missionTargetMesh);
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.clickKind) {
          obj = obj.parent;
        }
        if (obj?.userData?.clickKind === 'planet') {
          soundEngine.playClick();
          propsRef.current.onSelectPlanet(obj.userData.planetId);
          return;
        }
        if (obj?.userData?.clickKind === 'hazard') {
          soundEngine.playClick();
          const hazardId = String(obj.userData.hazardId ?? '');
          const ship =
            propsRef.current.campaign.ships.find((s) => s.uid === propsRef.current.campaign.activeShipUid) ??
            propsRef.current.campaign.ships[0];
          const weapon = ship?.weaponId ? WEAPONS_BY_ID[ship.weaponId] : null;
          if (weapon?.canBombard && weapon.attackLevel >= 2) {
            obj.visible = false;
            propsRef.current.onHazardCleared?.(hazardId);
            propsRef.current.onPlayerMessage?.('O tiro parte o asteroide. Ele se desfaz antes de chegar a qualquer mundo.');
          } else {
            propsRef.current.onPlayerMessage?.('Esse corpo não cede a um canhão comum. É preciso uma arma de bombardeio de nível dois ou mais.');
          }
          return;
        }
        if (obj?.userData?.clickKind === 'phenomenon') {
          soundEngine.playClick();
          propsRef.current.onSelectPhenomenon(obj.userData.phenomenonId);
          return;
        }
        if (obj?.userData?.clickKind === 'mission_target' && propsRef.current.combatMissionTarget && missionTargetMesh) {
          soundEngine.playClick();
          simRef.current.travelMissionTarget = propsRef.current.combatMissionTarget;
          simRef.current.travelPlanetId = null;
          simRef.current.orbitingPlanetId = null;
          const mPos = missionTargetMesh.position;
          const obs: ObstacleCircle[] = [];
          planetMeshes.forEach((pm) => {
            obs.push({ x: pm.group.position.x, z: pm.group.position.z, radius: pm.data.radius, id: pm.data.id });
          });
          simRef.current.waypoints = computeSafeTrajectory(
            { x: simRef.current.shipPos.x, z: simRef.current.shipPos.z },
            { x: mPos.x, z: mPos.z },
            propsRef.current.system.starExclusionRadius,
            obs
          );
          return;
        }
      }

      // Click empty space on orbital plane -> Click-to-move (Section 2.1 + Section 14 tangent routing around star & planets)
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        if (!Number.isFinite(hitPoint.x) || !Number.isFinite(hitPoint.z)) return;
        const hitDist = Math.hypot(hitPoint.x, hitPoint.z);
        if (hitDist > 260) {
          const clampScale = 260 / hitDist;
          hitPoint.x *= clampScale;
          hitPoint.z *= clampScale;
        }
        const obs: ObstacleCircle[] = [];
        planetMeshes.forEach((pm) => {
          obs.push({ x: pm.group.position.x, z: pm.group.position.z, radius: pm.data.radius, id: pm.data.id });
        });
        const safePath = computeSafeTrajectory(
          { x: simRef.current.shipPos.x, z: simRef.current.shipPos.z },
          { x: hitPoint.x, z: hitPoint.z },
          propsRef.current.system.starExclusionRadius,
          obs
        );
        simRef.current.waypoints = safePath;
        simRef.current.manualTarget = safePath[safePath.length - 1];
        simRef.current.orbitingPlanetId = null;
        simRef.current.travelPlanetId = null;
        simRef.current.travelPhenomenonId = null;
        simRef.current.travelMissionTarget = null;
        simRef.current.landingProgress = 0;
        simRef.current.landingHoldTimer = 0;
        simRef.current.landingPlanetId = null;
        propsRef.current.onShipMoveUpdate(
          { x: simRef.current.shipPos.x, z: simRef.current.shipPos.z },
          null
        );
      }
    };

    let contextLost = false;
    let lastViewOffsetKey = '';

    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
      lastViewOffsetKey = '';
      currentBuiltSystemId = '';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      if (propsRef.current.rightPanelOpen && w >= 640) {
        const shift = propsRef.current.rightPanelHalfScreen ? 0.22 : 0.16;
        camera.setViewOffset(w, h, w * shift, 0, w, h);
      } else {
        camera.clearViewOffset();
      }
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(isSoftwareGl ? 1 : canvasPixelRatio(w, h));
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Main Game Loop
    const clock = new THREE.Clock();
    const _vec = new THREE.Vector3();
    const _dir = new THREE.Vector3();
    const _steer = new THREE.Vector3();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 16);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 4);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 16);
          }
        };
        frameId = window.setTimeout(poll, 4);
      } catch {
        frameId = window.setTimeout(cb, 16);
      }
    };

    const spawnShotVfx = (from: THREE.Vector3, to: THREE.Vector3, type: WeaponDamageType, customColor?: string) => {
      const color =
        customColor ??
        (type === 'laser'
          ? '#38bdf8'
          : type === 'cinetica'
          ? '#fbbf24'
          : type === 'plasma'
          ? '#c084fc'
          : '#fb923c');
      if (type === 'laser') {
        const dist = from.distanceTo(to);
        const geo = new THREE.CylinderGeometry(0.08, 0.08, dist, 6);
        geo.translate(0, dist / 2, 0);
        geo.rotateX(Math.PI / 2);
        const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
        beam.position.copy(from);
        beam.lookAt(to);
        scene.add(beam);
        vfxList.push({ mesh: beam, age: 0, maxAge: 0.14 });
      } else {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(type === 'missil' ? 0.35 : 0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color })
        );
        orb.position.copy(from);
        const vel = to.clone().sub(from).normalize().multiplyScalar(type === 'missil' ? 32 : 46);
        scene.add(orb);
        vfxList.push({ mesh: orb, age: 0, maxAge: 0.55, vel });
      }
      // Impact spark
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 })
      );
      spark.position.copy(to);
      scene.add(spark);
      vfxList.push({ mesh: spark, age: 0, maxAge: 0.12 });
    };

    const convertPlanetToDestroyedMesh = (pm: { group: THREE.Group; sphere: THREE.Mesh; data: PlanetData; isDestroyed: boolean }) => {
      if (pm.isDestroyed) return;
      pm.isDestroyed = true;

      // Remove old rings/moons
      for (let idx = pm.group.children.length - 1; idx >= 0; idx--) {
        const ch = pm.group.children[idx];
        if (ch !== pm.sphere) {
          pm.group.remove(ch);
        }
      }

      // Swap sphere geometry + material to irregular cracked molten basalt
      pm.sphere.geometry.dispose();
      if (Array.isArray(pm.sphere.material)) {
        pm.sphere.material.forEach((m) => m.dispose());
      } else {
        pm.sphere.material.dispose();
      }
      pm.sphere.geometry = new THREE.SphereGeometry(pm.data.radius, 28, 28);
      pm.sphere.material = createVolcanicDestroyedMaterial(pm.data.seed, maxAniso);

      for (let f = 0; f < 5; f++) {
        const frag = new THREE.Mesh(
          new THREE.DodecahedronGeometry(pm.data.radius * 0.14, 0),
          new THREE.MeshStandardMaterial({ color: '#272024', emissive: '#9a3412', emissiveIntensity: 0.45, roughness: 0.9 })
        );
        const fa = (f / 5) * Math.PI * 2;
        const fr = pm.data.radius * 1.48 + (f % 2) * 0.45;
        frag.position.set(Math.cos(fa) * fr, ((f % 3) - 1) * 0.35, Math.sin(fa) * fr);
        frag.rotation.set(f * 0.8, f * 1.3, 0);
        pm.group.add(frag);
      }
    };

    const triggerPlanetCataclysm = (
      pm: { group: THREE.Group; sphere: THREE.Mesh; data: PlanetData; isDestroyed: boolean },
      causeLabel: string
    ) => {
      const effLv = propsRef.current.campaign.planetOverrides[pm.data.id]?.level ?? pm.data.level;
      if (pm.isDestroyed || devastatedPlanetIds.has(pm.data.id) || effLv === -1) return;
      devastatedPlanetIds.add(pm.data.id);

      const impactOrigin = pm.group.position.clone();
      const rad = pm.data.radius;

      // Expanding thermal fireball + shockwave ring + flying magma shards
      const fireball = new THREE.Mesh(
        new THREE.SphereGeometry(rad * 0.9, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.85 })
      );
      fireball.position.copy(impactOrigin);
      scene.add(fireball);
      vfxList.push({ mesh: fireball, age: 0, maxAge: 0.85, growRate: 3.6 });

      const shockRing = new THREE.Mesh(
        new THREE.RingGeometry(rad * 0.85, rad * 1.3, 36),
        new THREE.MeshBasicMaterial({ color: '#fde047', side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
      );
      shockRing.rotation.x = -Math.PI / 2;
      shockRing.position.copy(impactOrigin);
      scene.add(shockRing);
      vfxList.push({ mesh: shockRing, age: 0, maxAge: 1.05, growRate: 5.5 });

      for (let d = 0; d < 16; d++) {
        const theta = (d / 16) * Math.PI * 2;
        const elev = ((d % 5) - 2) * 0.35;
        const shard = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.28 + (d % 3) * 0.14, 0),
          new THREE.MeshBasicMaterial({ color: d % 2 === 0 ? '#f97316' : '#fef08a' })
        );
        shard.position.copy(impactOrigin);
        const speed = 10 + (d % 4) * 4.5;
        scene.add(shard);
        vfxList.push({
          mesh: shard,
          age: 0,
          maxAge: 1.2,
          vel: new THREE.Vector3(Math.cos(theta) * speed, elev * speed * 0.5, Math.sin(theta) * speed),
        });
      }

      soundEngine.playExplosion();
      convertPlanetToDestroyedMesh(pm);
      propsRef.current.onPlanetDevastated?.(pm.data.id, causeLabel);
    };

    const tick = () => {
      if (disposed) return;
      const rawDelta = Math.min(0.05, Math.max(0.001, clock.getDelta()));
      const p = propsRef.current;
      const dt = rawDelta * p.timeScale;
      const sim = simRef.current;

      if (currentBuiltSystemId !== p.system.id) {
        sim.simTime = p.campaign.gameTimeSeconds;
        rebuildSystemScene(p.system);
      }

      // Smoothly advance orbital simulation time every frame (eliminates 250ms React interval stutter)
      sim.simTime += dt;
      const timeDiff = p.campaign.gameTimeSeconds - sim.simTime;
      if (Math.abs(timeDiff) > 15) {
        // Hard snap only on major timeline jump (warp/load)
        sim.simTime = p.campaign.gameTimeSeconds;
      } else if (Math.abs(timeDiff) > 0.25) {
        // Softly drift toward authoritative time without visual jumps
        sim.simTime += timeDiff * Math.min(1, rawDelta * 0.35);
      }

      // Self-heal NaN guards on simulation state
      if (!Number.isFinite(sim.shipPos.x) || !Number.isFinite(sim.shipPos.z)) {
        sim.shipPos.set(p.system.starExclusionRadius + 14, 0, 10);
        sim.waypoints = [];
        sim.manualTarget = null;
      }
      if (!Number.isFinite(sim.shipPos.y)) sim.shipPos.y = 0;
      if (!Number.isFinite(sim.shipSpeed)) sim.shipSpeed = 0;
      if (!Number.isFinite(sim.shipRotY)) sim.shipRotY = 0;
      if (!Number.isFinite(sim.simTime)) sim.simTime = p.campaign.gameTimeSeconds;

      // View offset only updated when drawer open state or dimensions actually change
      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || window.innerHeight;
      if (cw > 0 && ch > 0) {
        const useSplitOffset = p.rightPanelOpen && cw >= 640;
        const viewKey = `${useSplitOffset}_${Boolean(p.rightPanelHalfScreen)}_${cw}_${ch}`;
        if (viewKey !== lastViewOffsetKey) {
          lastViewOffsetKey = viewKey;
          camera.aspect = cw / ch;
          if (useSplitOffset) {
            const shift = p.rightPanelHalfScreen ? 0.22 : 0.16;
            camera.setViewOffset(cw, ch, cw * shift, 0, cw, ch);
          } else {
            camera.clearViewOffset();
          }
          camera.updateProjectionMatrix();
        }
      }

      // 1. Update Planet Orbits, Rogue Crossing Asteroids & Phenomena smoothly at full frame rate
      sceneAge += rawDelta;
      const t = sim.simTime;
      obstaclePool.length = 0;

      planetMeshes.forEach((pm) => {
        const { group, sphere, data } = pm;
        const ecc = data.eccentricity ?? 0;
        const a = data.orbitPhase + t * data.orbitSpeed;
        group.position.set(Math.cos(a) * data.orbitRadius, 0, Math.sin(a) * data.orbitRadius * (1 - ecc));
        sphere.rotation.y += rawDelta * (pm.isDestroyed ? 0.14 : 0.25);

        // Live sync if campaign override converted a planet to -1 outside viewport
        const ovLevel = p.campaign.planetOverrides[data.id]?.level;
        if (ovLevel === -1 && !pm.isDestroyed) {
          convertPlanetToDestroyedMesh(pm);
        }

        obstaclePool.push({
          x: group.position.x,
          z: group.position.z,
          radius: data.radius,
          id: data.id,
        });
      });

      phenomenonMeshes.forEach(({ group, data }) => {
        if ((p.campaign.clearedHazards ?? []).includes(data.id)) {
          group.visible = false;
          return;
        }
        if (data.kind === 'cometa_errante' && data.orbitRadius) {
          const a = (data.orbitPhase ?? 0) + t * (data.orbitSpeed ?? 0.03);
          const ecc = data.eccentricity ?? 0.4;
          group.position.set(
            Math.cos(a) * data.orbitRadius,
            0,
            Math.sin(a) * data.orbitRadius * (1 - ecc)
          );
          group.rotation.y = -a;
        } else if (data.kind === 'destrocos_nave') {
          group.rotation.y += rawDelta * 0.3;
          obstaclePool.push({ x: group.position.x, z: group.position.z, radius: 1.8 });
        } else if (data.kind === 'campo_meteoros') {
          group.rotation.y += rawDelta * 0.12;
          group.children.forEach((ch) => {
            const rs = ch.userData?.rotSpeed;
            if (typeof rs === 'number') {
              ch.rotation.x += rawDelta * rs;
              ch.rotation.y += rawDelta * rs * 0.7;
            }
          });
        }
      });

      for (const ast of rogueAsteroids) {
        if ((p.campaign.clearedHazards ?? []).includes(ast.id)) {
          ast.mesh.visible = false;
          continue;
        }
        if (ast.cooldown > 0) ast.cooldown = Math.max(0, ast.cooldown - rawDelta);
        const a = ast.orbitPhase + t * ast.orbitSpeed;
        ast.mesh.position.set(
          Math.cos(a) * ast.orbitRadius,
          0,
          Math.sin(a) * ast.orbitRadius * (1 - ast.eccentricity)
        );
        ast.mesh.rotation.x += rawDelta * 0.9;
        ast.mesh.rotation.y += rawDelta * 1.25;
      }

      // Cosmic Cataclysm Collision Detection (while player is present inside solar system scene)
      if (sceneAge > 3.5 && dt > 0) {
        const pmArray = Array.from(planetMeshes.values());
        const levelOf = (pm: { data: PlanetData }) =>
          propsRef.current.campaign.planetOverrides[pm.data.id]?.level ?? pm.data.level;

        const burstBody = (mesh: THREE.Object3D, id: string, line: string) => {
          if (!mesh.visible) return;
          if ((propsRef.current.campaign.clearedHazards ?? []).includes(id)) {
            mesh.visible = false;
            return;
          }
          mesh.visible = false;
          const burst = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 10, 10),
            new THREE.MeshBasicMaterial({ color: '#fdba74', transparent: true, opacity: 0.9 })
          );
          burst.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
          scene.add(burst);
          vfxList.push({ mesh: burst, age: 0, maxAge: 0.55, growRate: 4.2 });
          propsRef.current.onHazardCleared?.(id);
          if (line) propsRef.current.onPlayerMessage?.(line);
        };

        phenomenonMeshes.forEach(({ group, data }) => {
          if (data.kind !== 'cometa_errante' || !group.visible) return;
          for (const pm of pmArray) {
            if (pm.isDestroyed) continue;
            const dist = Math.hypot(group.position.x - pm.group.position.x, group.position.z - pm.group.position.z);
            const prime = levelOf(pm) === 5;
            if (prime && dist <= pm.data.radius + 7.5) {
              burstBody(group, data.id, `As defesas de ${pm.data.name} abrem fogo. O cometa se desfaz antes da crosta.`);
              break;
            }
            if (!prime && dist <= pm.data.radius + 1.7) {
              burstBody(group, data.id, '');
              triggerPlanetCataclysm(pm, 'Impacto de cometa');
              break;
            }
          }
        });

        for (const ast of rogueAsteroids) {
          if (!ast.mesh.visible) continue;
          if (ast.cooldown > 0) ast.cooldown = Math.max(0, ast.cooldown - rawDelta);
          for (const pm of pmArray) {
            if (pm.isDestroyed || ast.cooldown > 0) continue;
            const dist = Math.hypot(ast.mesh.position.x - pm.group.position.x, ast.mesh.position.z - pm.group.position.z);
            const prime = levelOf(pm) === 5;
            if (prime && dist <= pm.data.radius + 7.5) {
              burstBody(ast.mesh, ast.id, `As defesas de ${pm.data.name} interceptam o asteroide. Ele se desfaz no céu.`);
              break;
            }
            if (!prime && dist <= pm.data.radius + 1.7) {
              burstBody(ast.mesh, ast.id, '');
              triggerPlanetCataclysm(pm, 'Colisão de asteroide');
              break;
            }
          }
        }

        for (let i = 0; i < pmArray.length; i++) {
          for (let j = i + 1; j < pmArray.length; j++) {
            const pA = pmArray[i];
            const pB = pmArray[j];
            if (pA.isDestroyed && pB.isDestroyed) continue;
            const dist = Math.hypot(pA.group.position.x - pB.group.position.x, pA.group.position.z - pB.group.position.z);
            if (dist > pA.data.radius + pB.data.radius + 0.45) continue;
            const primeA = levelOf(pA) === 5;
            const primeB = levelOf(pB) === 5;
            pB.data.orbitPhase += 0.22;
            if (primeA && primeB) continue;
            if (primeA && !pB.isDestroyed) triggerPlanetCataclysm(pB, `Encontro com ${pA.data.name}`);
            else if (primeB && !pA.isDestroyed) triggerPlanetCataclysm(pA, `Encontro com ${pB.data.name}`);
            else {
              if (!pA.isDestroyed) triggerPlanetCataclysm(pA, `Colisão com ${pB.data.name}`);
              if (!pB.isDestroyed) triggerPlanetCataclysm(pB, `Colisão com ${pA.data.name}`);
            }
          }
        }
      }

      // Selection ring on planet or phenomenon
      if (p.selectedPlanetId && planetMeshes.has(p.selectedPlanetId)) {
        const pm = planetMeshes.get(p.selectedPlanetId)!;
        selectionRing.visible = true;
        selectionRing.position.copy(pm.group.position);
        const s = pm.data.radius * 1.15;
        selectionRing.scale.set(s, s, 1);
      } else if (p.selectedPhenomenonId && phenomenonMeshes.has(p.selectedPhenomenonId)) {
        const phm = phenomenonMeshes.get(p.selectedPhenomenonId)!;
        selectionRing.visible = true;
        selectionRing.position.copy(phm.group.position);
        selectionRing.scale.set(phm.data.kind === 'campo_meteoros' ? 4.2 : 2.6, phm.data.kind === 'campo_meteoros' ? 4.2 : 2.6, 1);
      } else {
        selectionRing.visible = false;
      }

      // Combat Mission Target Marker in System (Section 16.6)
      if (p.combatMissionTarget && p.combatMissionTarget.targetSystemId === p.system.id && !p.combatMissionTarget.targetEnemyDefeated && p.activeEnemies.length === 0) {
        if (!missionTargetMesh) {
          missionTargetMesh = buildCompositeShipMesh('#ef4444', 1.25, true);
          missionTargetMesh.position.set(p.system.starExclusionRadius + 28, 0, -24);
          missionTargetMesh.userData = { clickKind: 'mission_target' };
          sysGroup.add(missionTargetMesh);

          missionTargetRing = new THREE.Mesh(
            new THREE.RingGeometry(2.2, 2.7, 32),
            new THREE.MeshBasicMaterial({ color: '#ef4444', side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
          );
          missionTargetRing.rotation.x = -Math.PI / 2;
          missionTargetRing.position.copy(missionTargetMesh.position);
          sysGroup.add(missionTargetRing);
        }
      } else if (missionTargetMesh) {
        sysGroup.remove(missionTargetMesh);
        if (missionTargetRing) sysGroup.remove(missionTargetRing);
        missionTargetMesh = null;
        missionTargetRing = null;
      }

      // 2. Authoritative Combat Enemies Sync (never let stale React props overwrite live damage!)
      if (p.activeEnemies.length === 0) {
        sim.liveEnemies.clear();
        sim.seenEnemyIds.clear();
        sim.accPlayerDmg = 0;
        sim.accReflectedDmg = 0;
        sim.pendingKilledIds.clear();
        sim.combatDirty = false;
      } else {
        const incomingIds = new Set(p.activeEnemies.map((e) => e.id));
        for (const key of Array.from(sim.liveEnemies.keys())) {
          if (!incomingIds.has(key)) {
            sim.liveEnemies.delete(key);
          }
        }
        for (const ae of p.activeEnemies) {
          if (!sim.seenEnemyIds.has(ae.id)) {
            sim.seenEnemyIds.add(ae.id);
            sim.liveEnemies.set(ae.id, { ...ae });
          }
        }
      }

      enemyMeshes.forEach((mesh, id) => {
        if (!sim.liveEnemies.has(id)) {
          scene.remove(mesh);
          enemyMeshes.delete(id);
        }
      });

      const enemyUpdates = Array.from(sim.liveEnemies.values());
      let lowestEnemy: ActiveEnemy | null = null;
      let lowestHp = Infinity;

      for (const e of enemyUpdates) {
        let em = enemyMeshes.get(e.id);
        if (!em) {
          const facColor = FACTIONS_BY_ID[e.factionId]?.color ?? '#ef4444';
          em = buildCompositeShipMesh(facColor, 1.15, true);
          em.position.set(e.x, 0, e.z);
          scene.add(em);
          enemyMeshes.set(e.id, em);
        }

        // Enemies pursue player relentlessly & strafe dynamically while steering around planets (Section 16.2)
        _vec.set(sim.shipPos.x - e.x, 0, sim.shipPos.z - e.z);
        const d = _vec.length();
        const enemyChaseSpeed = (14 + e.techLevel * 1.2) / 5;
        if (d > 11.5) {
          _vec.normalize();
          steerAroundObstacles(e.x, e.z, _vec.x, _vec.z, obstaclePool, p.system.starExclusionRadius, _steer);
          e.x += _steer.x * enemyChaseSpeed * dt;
          e.z += _steer.z * enemyChaseSpeed * dt;
        } else {
          e.angle += e.orbitDir * 0.42 * dt;
          const tx = sim.shipPos.x + Math.cos(e.angle) * 9.5;
          const tz = sim.shipPos.z + Math.sin(e.angle) * 9.5;
          _vec.set(tx - e.x, 0, tz - e.z);
          if (_vec.lengthSq() > 0.01) {
            _vec.normalize();
            steerAroundObstacles(e.x, e.z, _vec.x, _vec.z, obstaclePool, p.system.starExclusionRadius, _steer);
            const strafeStep = Math.min(enemyChaseSpeed * dt, Math.hypot(tx - e.x, tz - e.z));
            e.x += _steer.x * strafeStep;
            e.z += _steer.z * strafeStep;
          }
        }

        // Solid zero-collision pushout against star + all planets
        const distStar = Math.hypot(e.x, e.z);
        if (distStar < p.system.starExclusionRadius + 1.5 && distStar > 0.01) {
          const scale = (p.system.starExclusionRadius + 1.5) / distStar;
          e.x *= scale;
          e.z *= scale;
        }
        for (let oi = 0; oi < obstaclePool.length; oi++) {
          const obs = obstaclePool[oi];
          const dxo = e.x - obs.x;
          const dzo = e.z - obs.z;
          const distObs = Math.hypot(dxo, dzo);
          const minClear = obs.radius + 1.05;
          if (distObs < minClear) {
            const ang = distObs > 0.001 ? Math.atan2(dzo, dxo) : 0;
            e.x = obs.x + Math.cos(ang) * minClear;
            e.z = obs.z + Math.sin(ang) * minClear;
          }
        }

        em.position.set(e.x, 0, e.z);
        em.lookAt(sim.shipPos.x, 0, sim.shipPos.z);

        if (e.hull > 0) {
          const totalHp = e.hull + e.shield;
          if (totalHp < lowestHp) {
            lowestHp = totalHp;
            lowestEnemy = e;
          }
        }
      }

      // Break planet orbit lock when under active combat so player maneuvers and pursues dynamically
      if (enemyUpdates.length > 0 && sim.orbitingPlanetId && !sim.travelPlanetId) {
        sim.orbitingPlanetId = null;
      }

      // 3. Player Ship Movement (Click-to-Move / Planet Orbit / Phenomenon Travel / Combat Pursuit / Evasive Flee)
      const activeShip = p.campaign.ships.find((s) => s.uid === p.campaign.activeShipUid) ?? p.campaign.ships[0];
      const hullDef = activeShip ? HULLS_BY_ID[activeShip.hullId] : null;
      const activeFac = FACTIONS_BY_ID[activeShip?.factionId ?? p.campaign.chosenFactionId];
      const activeShipColor = activeShip?.color ?? hullDef?.color ?? activeFac?.color ?? '#38bdf8';
      const nextVisualKey = `${activeShip?.uid ?? ''}_${activeShip?.hullId ?? ''}_${activeShipColor}`;
      if (nextVisualKey !== currentShipVisualKey) {
        scene.remove(playerShipGroup);
        currentShipVisualKey = nextVisualKey;
        playerShipGroup = buildCompositeShipMesh(
          activeShipColor,
          1.15,
          Boolean(hullDef && (hullDef.armor >= 18 || hullDef.hullShape === 'cruzador' || hullDef.hullShape === 'fragata'))
        );
        playerShipGroup.position.copy(sim.shipPos);
        scene.add(playerShipGroup);
      }

      const weapon = activeShip?.weaponId ? WEAPONS_BY_ID[activeShip.weaponId] : null;
      const moveSpeed = (18 + (hullDef?.speed ?? 1) * 6) / 5;

      let targetGoal: THREE.Vector3 | null = null;
      let isInCombatOrbit = false;

      if (p.isFleeing && enemyUpdates.length > 0) {
        // Active 5s evasive maneuver: break orbit & weave aggressively between planets, meteor fields & asteroid belts
        sim.orbitingPlanetId = null;
        sim.travelPlanetId = null;
        sim.travelPhenomenonId = null;
        sim.manualTarget = null;
        sim.waypoints = [];
        isInCombatOrbit = true;

        if (sim.fleeWaypoints.length === 0) {
          const anchors: TangentPoint[] = [];
          planetMeshes.forEach((pm) => {
            anchors.push({
              x: pm.group.position.x + Math.cos(pm.data.orbitPhase + 1.1) * (pm.data.radius + 5.2),
              z: pm.group.position.z + Math.sin(pm.data.orbitPhase + 1.1) * (pm.data.radius + 5.2),
            });
          });
          phenomenonMeshes.forEach((phm) => {
            if (phm.data.kind !== 'buraco_negro') {
              anchors.push({ x: phm.group.position.x + 3.5, z: phm.group.position.z - 3.5 });
            }
          });
          for (const r of p.system.asteroidBeltRadii ?? []) {
            const a = Math.atan2(sim.shipPos.z, sim.shipPos.x) + 0.85;
            anchors.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
            anchors.push({ x: Math.cos(a + 1.4) * (r + 5), z: Math.sin(a + 1.4) * (r + 5) });
          }
          if (anchors.length === 0) {
            const baseA = Math.atan2(sim.shipPos.z, sim.shipPos.x);
            for (let k = 0; k < 5; k++) {
              const rad = Math.max(p.system.starExclusionRadius + 16, 48 + (k % 2) * 28);
              anchors.push({ x: Math.cos(baseA + k * 0.9) * rad, z: Math.sin(baseA + k * 0.9) * rad });
            }
          }
          // Order anchors to zig-zag furthest away from enemies while staying safely outside star exclusion
          anchors.sort((a, b) => {
            const da = Math.hypot(a.x - sim.shipPos.x, a.z - sim.shipPos.z);
            const db = Math.hypot(b.x - sim.shipPos.x, b.z - sim.shipPos.z);
            return da - db;
          });
          sim.fleeWaypoints = anchors.slice(0, 6);
          sim.fleeIndex = 0;
        }

        const curWp = sim.fleeWaypoints[sim.fleeIndex % sim.fleeWaypoints.length];
        const slalomOffset = Math.sin(sim.simTime * 5.2) * 5.5;
        const wpAngle = Math.atan2(curWp.z - sim.shipPos.z, curWp.x - sim.shipPos.x) + Math.PI / 2;
        targetGoal = new THREE.Vector3(
          curWp.x + Math.cos(wpAngle) * slalomOffset,
          0,
          curWp.z + Math.sin(wpAngle) * slalomOffset
        );
        if (sim.shipPos.distanceTo(new THREE.Vector3(curWp.x, 0, curWp.z)) < 9.5) {
          sim.fleeIndex = (sim.fleeIndex + 1) % sim.fleeWaypoints.length;
        }
      } else {
        if (sim.fleeWaypoints.length > 0) {
          sim.fleeWaypoints = [];
          sim.fleeIndex = 0;
        }
      }

      if (targetGoal) {
        // Already steered by evasive fleeing
      } else if (sim.waypoints.length > 0) {
        const wp = sim.waypoints[0];
        targetGoal = new THREE.Vector3(wp.x, 0, wp.z);
        if (sim.shipPos.distanceTo(targetGoal) < 1.6) {
          sim.waypoints.shift();
        }
      } else if (sim.travelPlanetId && planetMeshes.has(sim.travelPlanetId)) {
        const pm = planetMeshes.get(sim.travelPlanetId)!;
        const orbitStand = pm.data.radius + 3.8;
        _dir.copy(sim.shipPos).sub(pm.group.position);
        if (_dir.lengthSq() < 0.01) _dir.set(1, 0, 0);
        _dir.normalize().multiplyScalar(orbitStand);
        targetGoal = pm.group.position.clone().add(_dir);

        if (sim.shipPos.distanceTo(pm.group.position) <= orbitStand + 2.8) {
          sim.orbitingPlanetId = sim.travelPlanetId;
          sim.travelPlanetId = null;
          sim.orbitAngle = Math.atan2(
            sim.shipPos.z - pm.group.position.z,
            sim.shipPos.x - pm.group.position.x
          );
          p.onArrivedAtPlanetOrbit(sim.orbitingPlanetId);
        }
      } else if (sim.travelPhenomenonId && phenomenonMeshes.has(sim.travelPhenomenonId)) {
        const phm = phenomenonMeshes.get(sim.travelPhenomenonId)!;
        const standDist =
          phm.data.kind === 'buraco_negro'
            ? p.system.starExclusionRadius + 3.5
            : phm.data.kind === 'campo_meteoros'
            ? 4.2
            : 3.2;
        const distToPh = sim.shipPos.distanceTo(phm.group.position);
        if (distToPh <= standDist + 1.6) {
          const arrivedId = sim.travelPhenomenonId;
          sim.travelPhenomenonId = null;
          sim.waypoints = [];
          sim.shipSpeed = 0;
          p.onArrivedAtPhenomenon(arrivedId);
        } else {
          // Route safely if star exclusion or planets block straight line
          const safe = computeSafeTrajectory(
            { x: sim.shipPos.x, z: sim.shipPos.z },
            { x: phm.group.position.x, z: phm.group.position.z },
            p.system.starExclusionRadius,
            obstaclePool
          );
          if (safe.length > 1) {
            sim.waypoints = safe;
            targetGoal = new THREE.Vector3(safe[0].x, 0, safe[0].z);
          } else {
            targetGoal = new THREE.Vector3(safe[0]?.x ?? phm.group.position.x, 0, safe[0]?.z ?? phm.group.position.z);
          }
        }
      } else if (sim.orbitingPlanetId && planetMeshes.has(sim.orbitingPlanetId)) {
        // Lock & follow orbiting planet smoothly! Supports surface landing animation while remaining attached to planet
        const pm = planetMeshes.get(sim.orbitingPlanetId)!;
        if (p.landingPulse && p.landingPulse.nonce !== sim.lastLandingNonce && p.landingPulse.planetId === sim.orbitingPlanetId) {
          sim.lastLandingNonce = p.landingPulse.nonce;
          sim.landingPlanetId = p.landingPulse.planetId;
          sim.landingHoldTimer = 2.0;
          sim.orbitAngle = Math.atan2(
            sim.shipPos.z - pm.group.position.z,
            sim.shipPos.x - pm.group.position.x
          );
        }

        const isDockedHere = Boolean(p.dockedPlanetId && p.dockedPlanetId === sim.orbitingPlanetId && enemyUpdates.length === 0);
        let targetLanding = 0;
        if (isDockedHere) {
          targetLanding = 1;
          sim.landingHoldTimer = 0;
        } else if (sim.landingHoldTimer > 0 && sim.landingPlanetId === sim.orbitingPlanetId && enemyUpdates.length === 0) {
          targetLanding = 1;
          sim.landingHoldTimer = Math.max(0, sim.landingHoldTimer - rawDelta);
        }

        const dampRate = targetLanding > sim.landingProgress ? 2.6 : 2.1;
        sim.landingProgress = THREE.MathUtils.damp(sim.landingProgress, targetLanding, dampRate, rawDelta);
        if (targetLanding === 0 && sim.landingProgress < 0.004) {
          sim.landingProgress = 0;
          sim.landingPlanetId = null;
        }

        const isTransitioningLanding = Math.abs(targetLanding - sim.landingProgress) > 0.025;
        if (isTransitioningLanding) {
          sim.orbitAngle += rawDelta * 1.65;
        }

        const orbitStand = pm.data.radius + 3.8;
        const surfaceStand = Math.max(0.65, pm.data.radius * 0.96);
        const curDist = THREE.MathUtils.lerp(orbitStand, surfaceStand, sim.landingProgress);
        const yArc = sim.landingProgress > 0.005 ? Math.sin(sim.landingProgress * Math.PI) * (pm.data.radius * 0.32) : 0;

        sim.shipPos.set(
          pm.group.position.x + Math.cos(sim.orbitAngle) * curDist,
          yArc,
          pm.group.position.z + Math.sin(sim.orbitAngle) * curDist
        );
        if (sim.landingProgress > 0.02) {
          const faceX = pm.group.position.x - sim.shipPos.x;
          const faceZ = pm.group.position.z - sim.shipPos.z;
          if (faceX * faceX + faceZ * faceZ > 0.0001) {
            sim.shipRotY = Math.atan2(faceX, faceZ);
          }
        }
        sim.shipSpeed = 0;
      } else if (lowestEnemy && !sim.manualTarget) {
        // Dynamic Combat Pursuit & Tactical Strafe around target (all ships stay moving & pursuing!)
        isInCombatOrbit = true;
        const engageDist = Math.max(8, (weapon?.range ?? 16) * 0.65);
        const curDist = Math.hypot(sim.shipPos.x - lowestEnemy.x, sim.shipPos.z - lowestEnemy.z);
        if (curDist > engageDist + 4) {
          // Actively pursue enemy into optimal range
          targetGoal = new THREE.Vector3(lowestEnemy.x, 0, lowestEnemy.z);
        } else {
          const orbitAngle =
            Math.atan2(sim.shipPos.z - lowestEnemy.z, sim.shipPos.x - lowestEnemy.x) + dt * 0.38;
          targetGoal = new THREE.Vector3(
            lowestEnemy.x + Math.cos(orbitAngle) * engageDist,
            0,
            lowestEnemy.z + Math.sin(orbitAngle) * engageDist
          );
        }
      }

      if (!sim.orbitingPlanetId) {
        sim.landingProgress = 0;
        sim.landingHoldTimer = 0;
        sim.landingPlanetId = null;
        sim.shipPos.y = 0;
      }

      // Check Mission Target arrival
      if (sim.travelMissionTarget && missionTargetMesh) {
        if (sim.shipPos.distanceTo(missionTargetMesh.position) <= 14) {
          const mt = sim.travelMissionTarget;
          sim.travelMissionTarget = null;
          sim.waypoints = [];
          p.onStartMissionCombat(mt);
        }
      }

      if (targetGoal && !sim.orbitingPlanetId) {
        const distToGoal = sim.shipPos.distanceTo(targetGoal);
        const fleeSpeedBoost = p.isFleeing ? 1.48 : 1;
        const desiredSpeed =
          distToGoal < 4 && sim.waypoints.length <= 1 && !isInCombatOrbit
            ? Math.max(4, distToGoal * 4)
            : moveSpeed * fleeSpeedBoost;
        sim.shipSpeed = THREE.MathUtils.damp(sim.shipSpeed, desiredSpeed, 5, rawDelta);

        _dir.copy(targetGoal).sub(sim.shipPos);
        if (_dir.lengthSq() > 0.001) {
          _dir.normalize();
          steerAroundObstacles(
            sim.shipPos.x,
            sim.shipPos.z,
            _dir.x,
            _dir.z,
            obstaclePool,
            p.system.starExclusionRadius,
            _steer,
            sim.travelPlanetId
          );
          const step = Math.min(distToGoal, sim.shipSpeed * dt);
          sim.shipPos.addScaledVector(_steer, step);

          // Ensure ship NEVER enters star gravitational exclusion zone or clips any planet
          const distFromStar = Math.hypot(sim.shipPos.x, sim.shipPos.z);
          if (distFromStar < p.system.starExclusionRadius + 1.2 && distFromStar > 0.01) {
            const push = (p.system.starExclusionRadius + 1.2) / distFromStar;
            sim.shipPos.x *= push;
            sim.shipPos.z *= push;
          }
          for (let oi = 0; oi < obstaclePool.length; oi++) {
            const obs = obstaclePool[oi];
            if (obs.id && obs.id === sim.travelPlanetId) {
              // Still enforce solid surface hull clearance so ship never enters the destination planet
              const dxo = sim.shipPos.x - obs.x;
              const dzo = sim.shipPos.z - obs.z;
              const dObs = Math.hypot(dxo, dzo);
              const hardSurface = obs.radius + 1.05;
              if (dObs < hardSurface && dObs > 0.001) {
                sim.shipPos.x = obs.x + (dxo / dObs) * hardSurface;
                sim.shipPos.z = obs.z + (dzo / dObs) * hardSurface;
              }
              continue;
            }
            const dxo = sim.shipPos.x - obs.x;
            const dzo = sim.shipPos.z - obs.z;
            const dObs = Math.hypot(dxo, dzo);
            const minClear = obs.radius + 1.05;
            if (dObs < minClear) {
              const ang = dObs > 0.001 ? Math.atan2(dzo, dxo) : 0;
              sim.shipPos.x = obs.x + Math.cos(ang) * minClear;
              sim.shipPos.z = obs.z + Math.sin(ang) * minClear;
            }
          }

          const desiredRot = Math.atan2(_steer.x, _steer.z);
          let diff = desiredRot - sim.shipRotY;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          sim.shipRotY += diff * Math.min(1, 8 * rawDelta);
        }

        if (sim.waypoints.length === 0 && sim.manualTarget && distToGoal < 1.2) {
          sim.manualTarget = null;
          sim.shipSpeed = 0;
        }
      }

      // Point ship toward planet when mining (Section 18.3)
      if (p.miningTargetId && sim.orbitingPlanetId && planetMeshes.has(sim.orbitingPlanetId)) {
        const pm = planetMeshes.get(sim.orbitingPlanetId)!;
        const toPlanet = pm.group.position.clone().sub(sim.shipPos);
        sim.shipRotY = Math.atan2(toPlanet.x, toPlanet.z);
        const beamDist = Math.max(0.5, toPlanet.length() - pm.data.radius * 0.92);
        miningBeam.visible = true;
        miningBeam.position.copy(sim.shipPos);
        miningBeam.lookAt(pm.group.position);
        miningBeam.scale.set(1, 1, beamDist);
        miningImpactRing.visible = true;
        miningImpactRing.position.copy(sim.shipPos).addScaledVector(toPlanet.normalize(), beamDist);
        miningImpactRing.lookAt(sim.shipPos);
        const pulse = 1 + Math.sin(clock.elapsedTime * 12) * 0.25;
        miningImpactRing.scale.set(pulse, pulse, 1);
      } else {
        miningBeam.visible = false;
        miningImpactRing.visible = false;
      }

      const shipScale = THREE.MathUtils.lerp(1.0, 0.22, sim.landingProgress);
      playerShipGroup.scale.setScalar(shipScale);
      playerShipGroup.position.copy(sim.shipPos);
      playerShipGroup.rotation.y = sim.shipRotY;
      playerShipGroup.rotation.z = p.isFleeing ? Math.sin(sim.simTime * 5.8) * 0.45 : 0;

      // Update Destination Marker & Trajectory Line
      if (sim.waypoints.length > 0 || sim.manualTarget) {
        const pts: THREE.Vector3[] = [sim.shipPos.clone()];
        sim.waypoints.forEach((wp) => pts.push(new THREE.Vector3(wp.x, 0, wp.z)));
        const last = pts[pts.length - 1];
        destMarker.position.set(last.x, 0.05, last.z);
        destMarker.visible = true;
        trajectoryLine.geometry.dispose();
        trajectoryLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
        trajectoryLine.computeLineDistances();
        trajectoryLine.visible = true;
      } else {
        destMarker.visible = false;
        trajectoryLine.visible = false;
      }

      // 4. Authoritative Real-Time Auto-Combat DPS for ALL Ships (Player + Enemies + Allied NPCs)
      if (enemyUpdates.length > 0) {
        sim.combatSyncTimer += rawDelta;

        // Player auto-fire weapon DPS (suspended while executing evasive flee maneuvers)
        if (lowestEnemy && !p.isFleeing) {
          targetRing.visible = true;
          targetRing.position.set(lowestEnemy.x, 0.08, lowestEnemy.z);
          targetRing.rotation.z += rawDelta * 2.2;

          sim.playerFireCooldown -= dt;
          const distToTarget = Math.hypot(lowestEnemy.x - sim.shipPos.x, lowestEnemy.z - sim.shipPos.z);
          const effRange = Math.max(18, (weapon?.range ?? 16) + 8);
          if (sim.playerFireCooldown <= 0 && distToTarget <= effRange) {
            const fireRate = Math.max(0.5, weapon?.fireRate ?? 1.2);
            const shotInterval = 1 / fireRate;
            sim.playerFireCooldown = shotInterval;
            const shotDps = (weapon?.dps ?? 8) * (p.campaign.originBonuses?.combatDpsMult ?? 1);
            const dmg = shotDps * shotInterval;
            if (lowestEnemy.shield > 0) {
              const absorbed = Math.min(lowestEnemy.shield, dmg);
              lowestEnemy.shield -= absorbed;
              lowestEnemy.hull -= dmg - absorbed;
            } else {
              lowestEnemy.hull -= dmg;
            }
            sim.combatDirty = true;
            soundEngine.playWeapon(weapon?.damageType ?? 'laser');
            spawnShotVfx(
              sim.shipPos.clone(),
              new THREE.Vector3(lowestEnemy.x, 0, lowestEnemy.z),
              weapon?.damageType ?? 'laser',
              weapon?.color ?? '#38bdf8'
            );
          }
        } else {
          targetRing.visible = false;
        }

        // NPC Traffic ships at war with player's attacker intercept, steer around planets, & fire real DPS! (Section 16.5)
        for (const npc of npcTraffic) {
          const npcFac = FACTIONS_BY_ID[npc.factionId];
          const targetEnemy = enemyUpdates.find(
            (e) =>
              e.hull > 0 &&
              npcFac &&
              (p.campaign.activeWars[npcFac.id] ?? npcFac.warsWith).includes(e.factionId)
          );
          if (targetEnemy) {
            _vec.set(targetEnemy.x - npc.pos.x, 0, targetEnemy.z - npc.pos.z);
            const nd = _vec.length();
            if (nd > 10) {
              _vec.normalize();
              steerAroundObstacles(npc.pos.x, npc.pos.z, _vec.x, _vec.z, obstaclePool, p.system.starExclusionRadius, _steer);
              npc.pos.addScaledVector(_steer, (18 / 5) * dt);
            }
            npc.mesh.position.copy(npc.pos);
            npc.mesh.lookAt(targetEnemy.x, 0, targetEnemy.z);
            if (nd <= 24 && Math.random() < dt * 1.8) {
              const allyDmg = 10;
              if (targetEnemy.shield > 0) {
                const abs = Math.min(targetEnemy.shield, allyDmg);
                targetEnemy.shield -= abs;
                targetEnemy.hull -= allyDmg - abs;
              } else {
                targetEnemy.hull -= allyDmg;
              }
              sim.combatDirty = true;
              spawnShotVfx(
                npc.pos.clone(),
                new THREE.Vector3(targetEnemy.x, 0, targetEnemy.z),
                'laser',
                '#4ade80'
              );
            }
          }
        }

        // Enemies shoot at player & check kills
        const frameKilled: string[] = [];
        for (const e of enemyUpdates) {
          if (e.hull <= 0) {
            frameKilled.push(e.id);
            sim.pendingKilledIds.add(e.id);
            sim.liveEnemies.delete(e.id);
            soundEngine.playExplosion();
            continue;
          }
          const cd = (sim.enemyFireCooldowns[e.id] ?? 0.5) - dt;
          const dist = Math.hypot(e.x - sim.shipPos.x, e.z - sim.shipPos.z);
          if (cd <= 0 && dist <= 24) {
            sim.enemyFireCooldowns[e.id] = 1.1;
            sim.accPlayerDmg += e.dps * 1.1;
            sim.combatDirty = true;
            spawnShotVfx(new THREE.Vector3(e.x, 0, e.z), sim.shipPos.clone(), e.damageType);
          } else {
            sim.enemyFireCooldowns[e.id] = cd;
          }
        }

        if (frameKilled.length > 0 || (sim.combatDirty && sim.combatSyncTimer >= 0.09)) {
          const survivors = Array.from(sim.liveEnemies.values()).filter((e) => e.hull > 0);
          const dmgToSend = sim.accPlayerDmg;
          const refToSend = sim.accReflectedDmg;
          const killedToSend = Array.from(sim.pendingKilledIds);
          sim.accPlayerDmg = 0;
          sim.accReflectedDmg = 0;
          sim.pendingKilledIds.clear();
          sim.combatDirty = false;
          sim.combatSyncTimer = 0;
          p.onCombatTick(survivors, dmgToSend, refToSend, killedToSend);
        }
      } else {
        targetRing.visible = false;
      }

      // Naves de passagem: saem pequenas de um mundo, cruzam o sistema e encolhem ao entrar no destino.
      const livingDestinations = (exceptId: string) =>
        Array.from(planetMeshes.values()).filter((pm) => {
          const lv = p.campaign.planetOverrides[pm.data.id]?.level ?? pm.data.level;
          return lv >= 0 && !pm.isDestroyed && pm.data.id !== exceptId;
        });

      const dodgeOtherShips = (selfIndex: number, dir: THREE.Vector3) => {
        const self = npcTraffic[selfIndex];
        let ax = 0;
        let az = 0;
        for (let j = 0; j < npcTraffic.length; j++) {
          if (j === selfIndex) continue;
          const other = npcTraffic[j];
          if (other.phase === 'berthed' || !other.mesh.visible) continue;
          const dx = self.pos.x - other.pos.x;
          const dz = self.pos.z - other.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 8 && d > 0.05) {
            const push = (8 - d) / 8;
            ax += (dx / d) * push;
            az += (dz / d) * push;
          }
        }
        if (ax === 0 && az === 0) return;
        dir.x += ax * 1.6;
        dir.z += az * 1.6;
        const len = Math.hypot(dir.x, dir.z);
        if (len > 0.001) {
          dir.x /= len;
          dir.z /= len;
        }
      };

      for (let npcIndex = 0; npcIndex < npcTraffic.length; npcIndex++) {
        const npc = npcTraffic[npcIndex];
        if (npc.phase === 'berthed') {
          npc.wait -= dt;
          npc.mesh.visible = false;
          if (npc.wait <= 0) {
            const home = planetMeshes.get(npc.toPlanetId);
            const options = livingDestinations(npc.toPlanetId);
            const nextDest = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : null;
            if (home && nextDest) {
              const ang = Math.random() * Math.PI * 2;
              npc.fromPlanetId = home.data.id;
              npc.toPlanetId = nextDest.data.id;
              npc.pos.set(
                home.group.position.x + Math.cos(ang) * home.data.radius * 0.55,
                0,
                home.group.position.z + Math.sin(ang) * home.data.radius * 0.55
              );
              npc.phase = 'leave';
              npc.anim = 0;
              npc.mesh.visible = true;
              npc.mesh.scale.setScalar(npc.baseScale * 0.12);
            } else {
              npc.wait = 4;
            }
          }
          npc.mesh.position.copy(npc.pos);
          continue;
        }

        const hasHostileToIntercept =
          enemyUpdates.length > 0 &&
          FACTIONS_BY_ID[npc.factionId] &&
          enemyUpdates.some((e) =>
            (p.campaign.activeWars[npc.factionId] ?? FACTIONS_BY_ID[npc.factionId].warsWith).includes(e.factionId)
          );

        if (!hasHostileToIntercept && npc.phase === 'leave') {
          const home = planetMeshes.get(npc.fromPlanetId);
          if (!home) {
            npc.phase = 'cruise';
          } else {
            _vec.copy(npc.pos).sub(home.group.position);
            if (_vec.lengthSq() < 0.01) _vec.set(1, 0, 0);
            _vec.normalize();
            dodgeOtherShips(npcIndex, _vec);
            npc.pos.addScaledVector(_vec, npc.speed * dt);
            npc.anim = Math.min(1, npc.anim + dt * 0.42);
            npc.mesh.scale.setScalar(THREE.MathUtils.lerp(npc.baseScale * 0.12, npc.baseScale, npc.anim));
            npc.mesh.lookAt(npc.pos.x + _vec.x * 4, 0, npc.pos.z + _vec.z * 4);
            if (npc.anim >= 1 && npc.pos.distanceTo(home.group.position) > home.data.radius + 5.2) {
              npc.phase = 'cruise';
              npc.mesh.scale.setScalar(npc.baseScale);
            }
          }
        } else if (!hasHostileToIntercept && npc.phase === 'enter') {
          const destPm = planetMeshes.get(npc.toPlanetId);
          if (!destPm || destPm.isDestroyed) {
            npc.phase = 'cruise';
          } else {
            _vec.set(destPm.group.position.x - npc.pos.x, 0, destPm.group.position.z - npc.pos.z);
            const dist = _vec.length();
            if (dist > 0.01) _vec.normalize();
            npc.pos.addScaledVector(_vec, npc.speed * 1.15 * dt);
            npc.anim = Math.min(1, npc.anim + dt * 0.5);
            npc.mesh.scale.setScalar(Math.max(0.05, THREE.MathUtils.lerp(npc.baseScale, npc.baseScale * 0.08, npc.anim)));
            npc.mesh.lookAt(destPm.group.position.x, 0, destPm.group.position.z);
            if (npc.anim >= 1 || dist < destPm.data.radius * 0.4) {
              npc.phase = 'berthed';
              npc.wait = 3.2 + Math.random() * 5;
              npc.mesh.visible = false;
            }
          }
        } else if (!hasHostileToIntercept) {
          const destPm = planetMeshes.get(npc.toPlanetId);
          const destLevel = destPm
            ? (p.campaign.planetOverrides[destPm.data.id]?.level ?? destPm.data.level)
            : -1;
          if (!destPm || destPm.isDestroyed || destLevel === -1) {
            const alt = livingDestinations(npc.fromPlanetId)[0];
            if (alt) npc.toPlanetId = alt.data.id;
            else npc.mesh.visible = false;
          } else {
            _vec.set(destPm.group.position.x - npc.pos.x, 0, destPm.group.position.z - npc.pos.z);
            const dist = _vec.length();
            if (dist <= destPm.data.radius + 6.2) {
              npc.phase = 'enter';
              npc.anim = 0;
            } else if (dist > 0.01) {
              _vec.normalize();
              steerAroundObstacles(
                npc.pos.x,
                npc.pos.z,
                _vec.x,
                _vec.z,
                obstaclePool,
                p.system.starExclusionRadius,
                _steer,
                npc.toPlanetId
              );
              dodgeOtherShips(npcIndex, _steer);
              npc.pos.addScaledVector(_steer, npc.speed * dt);
              npc.mesh.lookAt(npc.pos.x + _steer.x * 5, 0, npc.pos.z + _steer.z * 5);
              npc.mesh.scale.setScalar(npc.baseScale);
            }
          }
        }

        if (npc.phase === 'berthed') {
          npc.mesh.position.copy(npc.pos);
          continue;
        }

        const distNpcStar = Math.hypot(npc.pos.x, npc.pos.z);
        if (distNpcStar < p.system.starExclusionRadius + 1.4 && distNpcStar > 0.01) {
          const sc = (p.system.starExclusionRadius + 1.4) / distNpcStar;
          npc.pos.x *= sc;
          npc.pos.z *= sc;
        }
        for (let oi = 0; oi < obstaclePool.length; oi++) {
          const obs = obstaclePool[oi];
          const slippingIn = npc.phase === 'enter' && obs.id === npc.toPlanetId;
          const slippingOut = npc.phase === 'leave' && npc.anim < 0.92 && obs.id === npc.fromPlanetId;
          if (slippingIn || slippingOut) continue;
          const dxo = npc.pos.x - obs.x;
          const dzo = npc.pos.z - obs.z;
          const dObs = Math.hypot(dxo, dzo);
          const minClear = obs.radius + 1.05;
          if (dObs < minClear) {
            const ang = dObs > 0.001 ? Math.atan2(dzo, dxo) : 0;
            npc.pos.x = obs.x + Math.cos(ang) * minClear;
            npc.pos.z = obs.z + Math.sin(ang) * minClear;
          }
        }
        npc.mesh.position.copy(npc.pos);
      }

      // Pairwise Ship-to-Ship Zero-Collision Separation (Player <-> Enemies <-> NPCs)
      const shipRadiusMin = 2.4;
      const isPlayerLanded = Boolean(sim.orbitingPlanetId && sim.landingProgress > 0.05);
      // Enemy <-> Enemy
      for (let i = 0; i < enemyUpdates.length; i++) {
        const a = enemyUpdates[i];
        for (let j = i + 1; j < enemyUpdates.length; j++) {
          const b = enemyUpdates[j];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const d = Math.hypot(dx, dz);
          if (d < shipRadiusMin) {
            const push = (shipRadiusMin - d) * 0.5;
            const nx = d > 0.001 ? dx / d : 1;
            const nz = d > 0.001 ? dz / d : 0;
            a.x -= nx * push;
            a.z -= nz * push;
            b.x += nx * push;
            b.z += nz * push;
            enemyMeshes.get(a.id)?.position.set(a.x, 0, a.z);
            enemyMeshes.get(b.id)?.position.set(b.x, 0, b.z);
          }
        }
        // Player <-> Enemy
        if (!isPlayerLanded) {
          const dx = a.x - sim.shipPos.x;
          const dz = a.z - sim.shipPos.z;
          const d = Math.hypot(dx, dz);
          if (d < shipRadiusMin) {
            const push = shipRadiusMin - d;
            const nx = d > 0.001 ? dx / d : 1;
            const nz = d > 0.001 ? dz / d : 0;
            a.x += nx * push * 0.7;
            a.z += nz * push * 0.7;
            if (!sim.orbitingPlanetId) {
              sim.shipPos.x -= nx * push * 0.3;
              sim.shipPos.z -= nz * push * 0.3;
            }
            enemyMeshes.get(a.id)?.position.set(a.x, 0, a.z);
          }
        }
      }
      // NPC <-> NPC, Player, Enemies
      for (let i = 0; i < npcTraffic.length; i++) {
        const nA = npcTraffic[i];
        if (nA.phase === 'berthed') continue;
        for (let j = i + 1; j < npcTraffic.length; j++) {
          const nB = npcTraffic[j];
          if (nB.phase === 'berthed') continue;
          const dx = nB.pos.x - nA.pos.x;
          const dz = nB.pos.z - nA.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 5.2) {
            const push = (5.2 - d) * 0.35;
            const nx = d > 0.001 ? dx / d : 1;
            const nz = d > 0.001 ? dz / d : 0;
            nA.pos.x -= nx * push;
            nA.pos.z -= nz * push;
            nB.pos.x += nx * push;
            nB.pos.z += nz * push;
          }
        }
        if (!isPlayerLanded) {
          const dxp = nA.pos.x - sim.shipPos.x;
          const dzp = nA.pos.z - sim.shipPos.z;
          const dp = Math.hypot(dxp, dzp);
          if (dp < shipRadiusMin) {
            const push = shipRadiusMin - dp;
            const nx = dp > 0.001 ? dxp / dp : 1;
            const nz = dp > 0.001 ? dzp / dp : 0;
            nA.pos.x += nx * push;
            nA.pos.z += nz * push;
          }
        }
        for (let eIdx = 0; eIdx < enemyUpdates.length; eIdx++) {
          const e = enemyUpdates[eIdx];
          const dxe = nA.pos.x - e.x;
          const dze = nA.pos.z - e.z;
          const de = Math.hypot(dxe, dze);
          if (de < shipRadiusMin) {
            const push = shipRadiusMin - de;
            const nx = de > 0.001 ? dxe / de : 1;
            const nz = de > 0.001 ? dze / de : 0;
            nA.pos.x += nx * push;
            nA.pos.z += nz * push;
          }
        }
        nA.mesh.position.copy(nA.pos);
      }
      playerShipGroup.position.copy(sim.shipPos);

      // Advance VFX
      for (let i = vfxList.length - 1; i >= 0; i--) {
        const v = vfxList[i];
        v.age += rawDelta;
        if (v.vel) v.mesh.position.addScaledVector(v.vel, rawDelta);
        if (v.growRate) {
          const sc = 1 + (v.age / v.maxAge) * v.growRate;
          v.mesh.scale.setScalar(sc);
          const meshObj = v.mesh as THREE.Mesh;
          if (meshObj.material && !Array.isArray(meshObj.material) && 'opacity' in meshObj.material) {
            (meshObj.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - v.age / v.maxAge);
          }
        }
        if (v.age >= v.maxAge) {
          scene.remove(v.mesh);
          vfxList.splice(i, 1);
        }
      }

      // Camera stays strictly locked on player ship (with NaN recovery)
      if (
        !Number.isFinite(controls.target.x) ||
        !Number.isFinite(controls.target.y) ||
        !Number.isFinite(controls.target.z)
      ) {
        controls.target.copy(sim.shipPos);
      }
      if (
        !Number.isFinite(camera.position.x) ||
        !Number.isFinite(camera.position.y) ||
        !Number.isFinite(camera.position.z)
      ) {
        camera.position.set(sim.shipPos.x, 48, sim.shipPos.z + 44);
      }
      const deltaShip = sim.shipPos.clone().sub(controls.target);
      controls.target.copy(sim.shipPos);
      camera.position.add(deltaShip);
      controls.update();

      // Sync position back to React periodically (every 0.8s) to avoid frequent HUD re-renders
      sim.lastPosSyncTime += rawDelta;
      if (sim.lastPosSyncTime >= 0.8) {
        sim.lastPosSyncTime = 0;
        p.onShipMoveUpdate({ x: sim.shipPos.x, z: sim.shipPos.z }, sim.orbitingPlanetId);
      }

      if (!contextLost) {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 w-full h-full cursor-crosshair" />;
};
