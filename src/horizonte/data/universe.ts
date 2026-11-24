import type {
  GalacticRegion,
  HabitabilityFactors,
  LifeFormId,
  MineralDeposit,
  PlanetAnomaly,
  PlanetData,
  StarSystemFull,
  StarSystemSummary,
  StarType,
  SystemPhenomenon,
} from '../types/game';
import { hashCoords, SeededRNG } from '../utils/rng';
import { RESOURCES_BY_ID } from './items';
import { CREATURES, FACTIONS, FACTIONS_BY_ID, isFactionConservative, LIFE_FORMS_BY_ID, SPECIES_BY_ID } from './lifeforms';
import { PLANET_TYPES, PLANET_TYPES_BY_CODE } from './planets';

const STAR_SYLLABLES_A = [
  'Aet', 'Bel', 'Cor', 'Dra', 'El', 'Fen', 'Gal', 'Hel', 'Ior', 'Jyn', 'Kael', 'Lum', 'Mor', 'Nyx', 'Or', 'Pul', 'Qua', 'Ryn', 'Sol', 'Thul', 'Umb', 'Vex', 'Wyr', 'Xan', 'Yor', 'Zel',
];
const STAR_SYLLABLES_B = [
  'ar', 'is', 'on', 'os', 'um', 'ia', 'or', 'an', 'ex', 'ul', 'ir', 'ak', 'en', 'yr', 'ath', 'ov',
];
const STAR_SUFFIXES = ['I', 'II', 'III', 'IV', 'V', 'Prime', 'Maior', 'Minor', 'Beta', 'Gama', 'Delta', 'Apex'];

function makeSystemName(rng: SeededRNG): string {
  const a = rng.pick(STAR_SYLLABLES_A);
  const b = rng.pick(STAR_SYLLABLES_B);
  const c = rng.chance(0.45) ? ` ${rng.pick(STAR_SUFFIXES)}` : `-${rng.int(10, 99)}`;
  return `${a}${b}${c}`;
}

export interface NebulaCloud {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
}

export const GALAXY_NEBULAE: NebulaCloud[] = (() => {
  const rng = new SeededRNG(991201);
  const colors = [
    '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#6366f1',
    '#14b8a6', '#f43f5e', '#3b82f6', '#a855f7', '#eab308', '#22d3ee',
  ];
  const names = [
    'Nebulosa Véu de Íris', 'Berçário de Éter', 'Nebulosa Coroa Carmesim', 'Manto de Orionis',
    'Nuvem de Crisálida', 'Nebulosa Aurora Boreal', 'Bruma de Valdris', 'Berçário Fotônico',
    'Névoa de Thul', 'Nebulosa Sopro Abissal', 'Vórtice Esmeralda', 'Nebulosa Cinzas Estelares',
  ];
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const dist = 22 + (i % 4) * 18 + rng.range(-5, 5);
    return {
      id: `nebula_${i + 1}`,
      name: names[i],
      x: Math.cos(angle) * dist,
      y: rng.range(-12, 12),
      z: Math.sin(angle) * dist,
      radius: rng.range(16, 24),
      color: colors[i],
    };
  });
})();

const STAR_TYPES_CONFIG: Array<{ type: StarType; color: string; radius: number; weight: number }> = [
  { type: 'Anã Amarela', color: '#fde047', radius: 5.5, weight: 32 },
  { type: 'Anã Vermelha', color: '#fb7185', radius: 4.5, weight: 28 },
  { type: 'Estrela Laranja', color: '#fb923c', radius: 5.0, weight: 20 },
  { type: 'Estrela Branca', color: '#e0f2fe', radius: 6.2, weight: 10 },
  { type: 'Gigante Azul', color: '#38bdf8', radius: 7.4, weight: 7 },
  { type: 'Pulsar', color: '#c084fc', radius: 4.0, weight: 3 },
];

function pickStarType(rng: SeededRNG): { type: StarType; color: string; radius: number } {
  const total = STAR_TYPES_CONFIG.reduce((s, c) => s + c.weight, 0);
  let r = rng.next() * total;
  for (const cfg of STAR_TYPES_CONFIG) {
    r -= cfg.weight;
    if (r <= 0) return cfg;
  }
  return STAR_TYPES_CONFIG[0];
}

function getConflictFromChance(distToHostile: number): { level: 1 | 2 | 3 | 4 | 5; chancePct: number } {
  if (distToHostile <= 16) return { level: 5, chancePct: 90 };
  if (distToHostile <= 26) return { level: 4, chancePct: 70 };
  if (distToHostile <= 38) return { level: 3, chancePct: 45 };
  if (distToHostile <= 55) return { level: 2, chancePct: 22 };
  return { level: 1, chancePct: 8 };
}

function computeControllingFaction(x: number, y: number, z: number): { factionId: string | null; nearestCapitalDist: number } {
  const distCenter = Math.hypot(x, y, z);
  let bestFaction: string | null = null;
  let bestDist = Infinity;

  for (const f of FACTIONS) {
    const d = Math.hypot(x - f.capitalCoord.x, y - f.capitalCoord.y, z - f.capitalCoord.z);
    if (d < bestDist) {
      bestDist = d;
      bestFaction = f.id;
    }
  }

  // Domain reaches up to 21.75 a.l. (1.45 * 15) from nearest capital and only exists <= 98 a.l. from galactic center
  if (distCenter <= 98 && bestDist <= 21.75) {
    return { factionId: bestFaction, nearestCapitalDist: bestDist };
  }
  return { factionId: null, nearestCapitalDist: bestDist };
}

function findNebulaAt(x: number, y: number, z: number): NebulaCloud | null {
  for (const n of GALAXY_NEBULAE) {
    if (Math.hypot(x - n.x, y - n.y, z - n.z) <= n.radius) {
      return n;
    }
  }
  return null;
}

function determineRegion(x: number, y: number, z: number, inNebula: boolean, nearBlackHole: boolean): GalacticRegion {
  if (nearBlackHole) return 'Zonas anômalas';
  if (inNebula) return 'Regiões nebulosas';
  const r = Math.hypot(x, y, z);
  if (r <= 26) return 'Núcleo galáctico';
  if (r <= 92) return 'Braços galácticos';
  return 'Regiões periféricas';
}

function buildKnownGalaxy(): StarSystemSummary[] {
  const rng = new SeededRNG(420500);
  const systems: StarSystemSummary[] = [];

  // 1. Supermassive Black Hole at (0,0,0)
  systems.push({
    id: 'sys_bh_0',
    seed: hashCoords(0, 0, 0, 1),
    name: 'Sagittarius Prime (Singularidade Central)',
    x: 0,
    y: 0,
    z: 0,
    starType: 'Buraco Negro Supermassivo',
    starColor: '#a855f7',
    starRadius: 8.5,
    starExclusionRadius: 20,
    isBlackHole: true,
    isSupermassive: true,
    inNebula: false,
    region: 'Núcleo galáctico',
    controllingFactionId: null,
    isCapital: false,
    conflictLevel: 3,
    hostileChancePct: 45,
    nearestHostileDistLy: 28,
    techLevel: 1,
    rareMultiplier: 2.6,
    isWildSpace: false,
    planetCount: 0,
  });

  // 2. 7 other Black Holes scattered in galaxy
  const blackHoleCoords: Array<{ x: number; y: number; z: number }> = [{ x: 0, y: 0, z: 0 }];
  for (let i = 1; i <= 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.4;
    const dist = 32 + i * 9;
    const x = Math.round(Math.cos(angle) * dist * 10) / 10;
    const z = Math.round(Math.sin(angle) * dist * 10) / 10;
    const y = Math.round(rng.range(-14, 14) * 10) / 10;
    blackHoleCoords.push({ x, y, z });
    const seed = hashCoords(x, y, z, 77);
    const sysRng = new SeededRNG(seed);
    systems.push({
      id: `sys_bh_${i}`,
      seed,
      name: `Singularidade ${makeSystemName(sysRng)}`,
      x,
      y,
      z,
      starType: 'Buraco Negro',
      starColor: '#c084fc',
      starRadius: 6.2,
      starExclusionRadius: 16,
      isBlackHole: true,
      isSupermassive: false,
      inNebula: false,
      region: 'Zonas anômalas',
      controllingFactionId: null,
      isCapital: false,
      conflictLevel: 2,
      hostileChancePct: 22,
      nearestHostileDistLy: 34,
      techLevel: 1,
      rareMultiplier: 2.35,
      isWildSpace: false,
      planetCount: 0,
    });
  }

  // 3. 42 Faction Capital Systems (Prime systems with level 5 planet)
  FACTIONS.forEach((fac) => {
    const { x, y, z } = fac.capitalCoord;
    const seed = hashCoords(x, y, z, 42);
    const sysRng = new SeededRNG(seed);
    const star = pickStarType(sysRng);
    const neb = findNebulaAt(x, y, z);
    const nearBH = blackHoleCoords.some((bh) => Math.hypot(x - bh.x, y - bh.y, z - bh.z) < 12);
    const planetCount = sysRng.int(6, 8); // Starting / Prime systems always rich (>= 6 planets)

    systems.push({
      id: fac.capitalSystemId,
      seed,
      name: `${makeSystemName(sysRng)} (Prime)`,
      x,
      y,
      z,
      starType: star.type,
      starColor: star.color,
      starRadius: star.radius,
      starExclusionRadius: star.radius + 7,
      isBlackHole: false,
      isSupermassive: false,
      inNebula: Boolean(neb),
      nebulaColor: neb?.color,
      region: determineRegion(x, y, z, Boolean(neb), nearBH),
      controllingFactionId: fac.id,
      isCapital: true,
      conflictLevel: 1,
      hostileChancePct: 8,
      nearestHostileDistLy: 55,
      techLevel: 5,
      rareMultiplier: 0.34,
      isWildSpace: false,
      planetCount,
    });
  });

  // 3b. Guarantee each of the 42 factions starts with at least 4 additional nearby owned systems (5+ total including Prime)
  FACTIONS.forEach((fac) => {
    const cap = fac.capitalCoord;
    let added = 0;
    for (let slot = 0; slot < 40 && added < 4 && systems.length < 500; slot++) {
      const a = (slot * 2.399963) + rng.range(-0.25, 0.25);
      const b = rng.range(-0.45, 0.45);
      const r = 4.2 + (slot % 4) * 1.15 + rng.range(0, 0.8);
      const x = Math.round((cap.x + Math.cos(a) * Math.cos(b) * r) * 10) / 10;
      const y = Math.round((cap.y + Math.sin(b) * r * 0.65) * 10) / 10;
      const z = Math.round((cap.z + Math.sin(a) * Math.cos(b) * r) * 10) / 10;
      if (Math.hypot(x, y, z) > 97) continue;
      if (systems.some((s) => Math.hypot(s.x - x, s.y - y, s.z - z) < 3.0)) continue;

      const idx = systems.length;
      const seed = hashCoords(x, y, z, idx);
      const sysRng = new SeededRNG(seed);
      const star = pickStarType(sysRng);
      const neb = findNebulaAt(x, y, z);
      const nearBH = blackHoleCoords.some((bh) => Math.hypot(x - bh.x, y - bh.y, z - bh.z) < 12);

      systems.push({
        id: `sys_${idx}`,
        seed,
        name: makeSystemName(sysRng),
        x,
        y,
        z,
        starType: star.type,
        starColor: star.color,
        starRadius: star.radius,
        starExclusionRadius: star.radius + 7,
        isBlackHole: false,
        isSupermassive: false,
        inNebula: Boolean(neb),
        nebulaColor: neb?.color,
        region: determineRegion(x, y, z, Boolean(neb), nearBH),
        controllingFactionId: fac.id,
        isCapital: false,
        conflictLevel: 1,
        hostileChancePct: 8,
        nearestHostileDistLy: 50,
        techLevel: 4,
        rareMultiplier: 0.7,
        isWildSpace: false,
        planetCount: sysRng.int(3, 6),
      });
      added++;
    }
  });

  // 4. Fill remaining systems inside nebulae & spiral arms to strictly hit 500 total
  let count = systems.length;
  for (let nIdx = 0; nIdx < GALAXY_NEBULAE.length && systems.length < 500; nIdx++) {
    const neb = GALAXY_NEBULAE[nIdx];
    const perNeb = nIdx < 6 ? 11 : 10;
    for (let k = 0; k < perNeb && systems.length < 500; k++) {
      const a = rng.range(0, Math.PI * 2);
      const b = rng.range(-0.6, 0.6);
      const r = rng.range(1.5, neb.radius * 0.92);
      const x = Math.round((neb.x + Math.cos(a) * Math.cos(b) * r) * 10) / 10;
      const y = Math.round((neb.y + Math.sin(b) * r * 0.65) * 10) / 10;
      const z = Math.round((neb.z + Math.sin(a) * Math.cos(b) * r) * 10) / 10;
      if (systems.some((s) => Math.hypot(s.x - x, s.y - y, s.z - z) < 3.4)) continue;

      const seed = hashCoords(x, y, z, count);
      const sysRng = new SeededRNG(seed);
      const star = pickStarType(sysRng);
      const ctrl = computeControllingFaction(x, y, z);
      const nearBH = blackHoleCoords.some((bh) => Math.hypot(x - bh.x, y - bh.y, z - bh.z) < 12);

      systems.push({
        id: `sys_${systems.length}`,
        seed,
        name: makeSystemName(sysRng),
        x,
        y,
        z,
        starType: star.type,
        starColor: star.color,
        starRadius: star.radius,
        starExclusionRadius: star.radius + 7,
        isBlackHole: false,
        isSupermassive: false,
        inNebula: true,
        nebulaColor: neb.color,
        region: determineRegion(x, y, z, true, nearBH),
        controllingFactionId: ctrl.factionId,
        isCapital: false,
        conflictLevel: 1,
        hostileChancePct: 8,
        nearestHostileDistLy: 50,
        techLevel: 2,
        rareMultiplier: 1.0,
        isWildSpace: !ctrl.factionId,
        planetCount: sysRng.int(2, 6),
      });
      count++;
    }
  }

  // Remaining systems distributed across spiral arms & outer rim until strictly 500 systems
  let safety = 0;
  while (systems.length < 500 && safety < 25000) {
    safety++;
    const minSpacing = safety > 12000 ? 1.5 : safety > 6000 ? 2.4 : 3.5;
    const arm = safety % 4;
    const t = Math.pow(rng.next(), 0.72);
    const radius = 6 + t * 98;
    const spiralAngle = (arm * Math.PI) / 2 + radius * 0.052 + rng.range(-0.55, 0.55);
    const x = Math.round(Math.cos(spiralAngle) * radius * 10) / 10;
    const z = Math.round(Math.sin(spiralAngle) * radius * 10) / 10;
    const y = Math.round(rng.range(-18, 18) * (1 - t * 0.35) * 10) / 10;
    if (systems.some((s) => Math.hypot(s.x - x, s.y - y, s.z - z) < minSpacing)) continue;

    const seed = hashCoords(x, y, z, systems.length);
    const sysRng = new SeededRNG(seed);
    const star = pickStarType(sysRng);
    const neb = findNebulaAt(x, y, z);
    const ctrl = computeControllingFaction(x, y, z);
    const nearBH = blackHoleCoords.some((bh) => Math.hypot(x - bh.x, y - bh.y, z - bh.z) < 12);

    systems.push({
      id: `sys_${systems.length}`,
      seed,
      name: makeSystemName(sysRng),
      x,
      y,
      z,
      starType: star.type,
      starColor: star.color,
      starRadius: star.radius,
      starExclusionRadius: star.radius + 7,
      isBlackHole: false,
      isSupermassive: false,
      inNebula: Boolean(neb),
      nebulaColor: neb?.color,
      region: determineRegion(x, y, z, Boolean(neb), nearBH),
      controllingFactionId: ctrl.factionId,
      isCapital: false,
      conflictLevel: 1,
      hostileChancePct: 8,
      nearestHostileDistLy: 50,
      techLevel: 2,
      rareMultiplier: 1.0,
      isWildSpace: !ctrl.factionId,
      planetCount: sysRng.int(2, 7),
    });
  }

  // Ensure every faction starts with at least 5 owned systems (fallback claim of nearest unassigned systems if needed)
  for (const fac of FACTIONS) {
    let owned = systems.filter((s) => s.controllingFactionId === fac.id);
    if (owned.length < 5) {
      const candidates = systems
        .filter((s) => !s.isBlackHole && !s.isCapital && !s.controllingFactionId)
        .sort(
          (a, b) =>
            Math.hypot(a.x - fac.capitalCoord.x, a.y - fac.capitalCoord.y, a.z - fac.capitalCoord.z) -
            Math.hypot(b.x - fac.capitalCoord.x, b.y - fac.capitalCoord.y, b.z - fac.capitalCoord.z)
        );
      for (const cand of candidates) {
        if (owned.length >= 5) break;
        cand.controllingFactionId = fac.id;
        cand.isWildSpace = false;
        owned.push(cand);
      }
    }
  }

  // +100 sistemas selvagens no anel externo, sempre sem facção.
  // Ficam além do alcance de capital (98 a.l.) para não serem reivindicados.
  let wildAdded = 0;
  let wildSafety = 0;
  while (wildAdded < 100 && wildSafety < 12000) {
    wildSafety++;
    const minSpacing = wildSafety > 7000 ? 2.4 : wildSafety > 3000 ? 3.2 : 4.0;
    const arm = wildSafety % 6;
    const radius = 100 + Math.pow(rng.next(), 0.85) * 32;
    const spiralAngle = (arm * Math.PI) / 3 + radius * 0.047 + rng.range(-0.9, 0.9);
    const x = Math.round(Math.cos(spiralAngle) * radius * 10) / 10;
    const z = Math.round(Math.sin(spiralAngle) * radius * 10) / 10;
    const y = Math.round(rng.range(-20, 20) * 10) / 10;
    const distCenter = Math.hypot(x, y, z);
    if (distCenter < 99 || distCenter > 134) continue;
    if (computeControllingFaction(x, y, z).factionId) continue;
    if (systems.some((s) => Math.hypot(s.x - x, s.y - y, s.z - z) < minSpacing)) continue;

    const seed = hashCoords(x, y, z, 77000 + wildAdded);
    const sysRng = new SeededRNG(seed);
    const star = pickStarType(sysRng);
    const neb = findNebulaAt(x, y, z);
    const nearBH = blackHoleCoords.some((bh) => Math.hypot(x - bh.x, y - bh.y, z - bh.z) < 14);
    const isBH = sysRng.chance(0.035);

    systems.push({
      id: `sys_wild_${wildAdded}`,
      seed,
      name: isBH ? `Singularidade ${makeSystemName(sysRng)}` : `${makeSystemName(sysRng)} (Selvagem)`,
      x,
      y,
      z,
      starType: isBH ? 'Buraco Negro' : star.type,
      starColor: isBH ? '#c084fc' : star.color,
      starRadius: isBH ? 5.6 : star.radius * 0.92,
      starExclusionRadius: isBH ? 16 : star.radius + 6,
      isBlackHole: isBH,
      isSupermassive: false,
      inNebula: Boolean(neb),
      nebulaColor: neb?.color,
      region: determineRegion(x, y, z, Boolean(neb), nearBH || isBH),
      controllingFactionId: null,
      isCapital: false,
      conflictLevel: 1,
      hostileChancePct: 12,
      nearestHostileDistLy: 46,
      techLevel: 1,
      rareMultiplier: 1.85,
      isWildSpace: true,
      planetCount: isBH ? 0 : sysRng.int(2, 5),
    });
    wildAdded++;
  }

  // Post-pass: compute Conflict Level (distance to nearest hostile/war faction system), Tech Level, and Rare Multiplier
  for (const sys of systems) {
    if (sys.isBlackHole) continue;
    const owner = sys.controllingFactionId ? FACTIONS_BY_ID[sys.controllingFactionId] : null;

    let minHostileDist = 99;
    for (const other of systems) {
      if (other.id === sys.id || !other.controllingFactionId) continue;
      if (owner) {
        const atWar = owner.warsWith.includes(other.controllingFactionId);
        const sameSpecies = FACTIONS_BY_ID[other.controllingFactionId]?.speciesId === owner.speciesId;
        if (atWar) {
          const d = Math.hypot(sys.x - other.x, sys.y - other.y, sys.z - other.z);
          if (d < minHostileDist) minHostileDist = d;
        } else if (!sameSpecies && !owner.alliedWith.includes(other.controllingFactionId)) {
          const d = Math.hypot(sys.x - other.x, sys.y - other.y, sys.z - other.z) + 12; // non-war weighs less
          if (d < minHostileDist) minHostileDist = d;
        }
      } else {
        // Wild space near war zones
        const d = Math.hypot(sys.x - other.x, sys.y - other.y, sys.z - other.z) + 18;
        if (d < minHostileDist) minHostileDist = d;
      }
    }

    sys.nearestHostileDistLy = Math.round(minHostileDist * 10) / 10;
    const conflict = getConflictFromChance(minHostileDist);
    sys.conflictLevel = conflict.level;
    sys.hostileChancePct = conflict.chancePct;

    if (sys.isCapital) {
      sys.techLevel = 5;
      sys.rareMultiplier = 0.34;
    } else if (owner) {
      const distPrime = Math.hypot(
        sys.x - owner.capitalCoord.x,
        sys.y - owner.capitalCoord.y,
        sys.z - owner.capitalCoord.z
      );
      if (distPrime <= 12) sys.techLevel = 4;
      else if (distPrime <= 17) sys.techLevel = 3;
      else if (distPrime <= 20.5) sys.techLevel = 2;
      else sys.techLevel = 1;

      const rare = 0.45 + (5 - sys.techLevel) * 0.25 + (distPrime / 22) * 0.35;
      sys.rareMultiplier = Math.round(rare * 100) / 100;
    } else {
      sys.techLevel = 1;
      const distCenter = Math.hypot(sys.x, sys.y, sys.z);
      const rare = Math.min(2.8, 1.7 + Math.max(0, distCenter - 85) * 0.018);
      sys.rareMultiplier = Math.round(rare * 100) / 100;
    }
  }

  return systems;
}

export const KNOWN_GALAXY_SYSTEMS: StarSystemSummary[] = buildKnownGalaxy();
export const KNOWN_SYSTEMS_BY_ID: Record<string, StarSystemSummary> = Object.fromEntries(
  KNOWN_GALAXY_SYSTEMS.map((s) => [s.id, s])
);

// Infinite Procedural Wild Space: generates deterministic systems in 24 a.l. grid cells outside radius 98 a.l.
export function getSystemsInRadius(
  center: { x: number; y: number; z: number },
  radiusLy = 72
): StarSystemSummary[] {
  const results = KNOWN_GALAXY_SYSTEMS.filter(
    (s) => Math.hypot(s.x - center.x, s.y - center.y, s.z - center.z) <= radiusLy
  );

  // Add infinite procedural wild-space systems in grid cells outside known galaxy radius 96
  const cellSize = 24;
  const minCx = Math.floor((center.x - radiusLy) / cellSize);
  const maxCx = Math.floor((center.x + radiusLy) / cellSize);
  const minCy = Math.floor((center.y - 24) / cellSize);
  const maxCy = Math.floor((center.y + 24) / cellSize);
  const minCz = Math.floor((center.z - radiusLy) / cellSize);
  const maxCz = Math.floor((center.z + radiusLy) / cellSize);

  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        if (Math.abs(cy) > 1) continue;
        const cellCenterDist = Math.hypot((cx + 0.5) * cellSize, (cy + 0.5) * cellSize, (cz + 0.5) * cellSize);
        if (cellCenterDist < 104) continue; // inside known galaxy

        const cellSeed = hashCoords(cx, cy, cz, 9001);
        const rng = new SeededRNG(cellSeed);
        const count = rng.int(2, 4);
        for (let k = 0; k < count; k++) {
          const x = Math.round((cx * cellSize + rng.range(3, cellSize - 3)) * 10) / 10;
          const y = Math.round(rng.range(-16, 16) * 10) / 10;
          const z = Math.round((cz * cellSize + rng.range(3, cellSize - 3)) * 10) / 10;
          const distFromCenter = Math.hypot(x, y, z);
          if (distFromCenter < 100) continue;
          if (Math.hypot(x - center.x, y - center.y, z - center.z) > radiusLy) continue;

          const sSeed = hashCoords(x, y, z, 555 + k);
          const sysRng = new SeededRNG(sSeed);
          const isBH = sysRng.chance(0.03);
          const star = pickStarType(sysRng);
          const rareMult = Math.round(Math.min(3.1, 1.75 + (distFromCenter - 98) * 0.009) * 100) / 100;

          results.push({
            id: `wild_${cx}_${cy}_${cz}_${k}`,
            seed: sSeed,
            name: isBH ? `Singularidade ${makeSystemName(sysRng)}` : `${makeSystemName(sysRng)} (Selvagem)`,
            x,
            y,
            z,
            starType: isBH ? 'Buraco Negro' : star.type,
            starColor: isBH ? '#c084fc' : star.color,
            starRadius: isBH ? 6.0 : star.radius,
            starExclusionRadius: isBH ? 16 : star.radius + 7,
            isBlackHole: isBH,
            isSupermassive: false,
            inNebula: sysRng.chance(0.12),
            nebulaColor: '#06b6d4',
            region: isBH ? 'Zonas anômalas' : 'Regiões periféricas',
            controllingFactionId: null,
            isCapital: false,
            conflictLevel: sysRng.chance(0.3) ? 2 : 1,
            hostileChancePct: sysRng.chance(0.3) ? 22 : 8,
            nearestHostileDistLy: 48,
            techLevel: 1,
            rareMultiplier: rareMult,
            isWildSpace: true,
            planetCount: isBH ? 0 : sysRng.int(2, 6),
          });
        }
      }
    }
  }

  return results;
}

export function getSystemSummaryById(systemId: string): StarSystemSummary | null {
  if (KNOWN_SYSTEMS_BY_ID[systemId]) return KNOWN_SYSTEMS_BY_ID[systemId];
  if (systemId.startsWith('wild_')) {
    const parts = systemId.split('_');
    if (parts.length === 5) {
      const cx = Number(parts[1]);
      const cy = Number(parts[2]);
      const cz = Number(parts[3]);
      const center = { x: (cx + 0.5) * 24, y: (cy + 0.5) * 24, z: (cz + 0.5) * 24 };
      const near = getSystemsInRadius(center, 36);
      return near.find((s) => s.id === systemId) ?? null;
    }
  }
  return null;
}

function pickPlanetType(
  rng: SeededRNG,
  orbitIndex: number,
  totalPlanets: number,
  requireCiv45: boolean,
  preferredLifeForm: LifeFormId | null,
  requireMaxLevel3 = false
) {
  const weights: Record<string, number> = {
    comum: 40,
    incomum: 24,
    raro: 10,
    épico: 3.5,
    lendário: 0.7,
    único: 0,
  };

  const candidates = PLANET_TYPES.filter((pt) => {
    if (pt.code === 'TX31') return false;
    if (requireCiv45) {
      if (!pt.allowsCivilization45) return false;
      if (preferredLifeForm && !pt.allowedLifeForms.includes(preferredLifeForm) && pt.code !== 'TX28') return false;
      return true;
    }
    if (requireMaxLevel3 && pt.maxLevel < 3) return false;
    if (pt.rogue && orbitIndex < totalPlanets - 1) return false;
    return true;
  });

  const weighted = candidates.map((pt) => {
    let w = weights[pt.rarity];
    if (orbitIndex === 0 && (pt.code === 'TX01' || pt.code === 'TX04' || pt.code === 'TX02')) w *= 2.4;
    if (orbitIndex >= totalPlanets - 2 && (pt.code === 'TX05' || pt.code === 'TX12' || pt.code === 'TX29')) w *= 2.0;
    if (preferredLifeForm && pt.allowedLifeForms.includes(preferredLifeForm)) w *= 1.6;
    return { pt, w };
  });

  const sum = weighted.reduce((acc, x) => acc + x.w, 0);
  let r = rng.next() * sum;
  for (const item of weighted) {
    r -= item.w;
    if (r <= 0) return item.pt;
  }
  return candidates[0];
}

function buildHabitability(
  rng: SeededRNG,
  typeCode: string,
  orbitIndex: number,
  totalPlanets: number,
  level: number
): HabitabilityFactors {
  if (level === -1) {
    return {
      score: 4,
      temperatureC: rng.int(420, 960),
      tempVariation: 'Extrema (±320°C)',
      atmosphere: 'Rarefeita ou ausente',
      water: 'ausente',
      gravityG: Math.round(rng.range(0.62, 1.35) * 100) / 100,
      radiationLevel: rng.int(68, 95),
      geologicalStability: rng.int(2, 14),
      threats: ['Calor extremo', 'Radiação intensa', 'Crosta fraturada com magma exposto'],
    };
  }

  const ratio = orbitIndex / Math.max(1, totalPlanets - 1);
  let baseTemp = Math.round(280 - ratio * 420 + rng.range(-35, 35));
  if (typeCode === 'TX04' || typeCode === 'TX15') baseTemp = Math.max(baseTemp, 190);
  if (typeCode === 'TX05' || typeCode === 'TX29') baseTemp = Math.min(baseTemp, -60);
  if (level >= 2 && baseTemp > 55) baseTemp = rng.int(12, 34);
  if (level >= 2 && baseTemp < -20) baseTemp = rng.int(4, 24);

  const water: 'líquida' | 'gelo' | 'ausente' =
    typeCode === 'TX03' || typeCode === 'TX06' || typeCode === 'TX07' || typeCode === 'TX24' || typeCode === 'TX27'
      ? 'líquida'
      : typeCode === 'TX05' || typeCode === 'TX29'
      ? 'gelo'
      : baseTemp > 0 && baseTemp < 95 && rng.chance(0.5)
      ? 'líquida'
      : 'ausente';

  const radiation =
    typeCode === 'TX13' || typeCode === 'TX15'
      ? rng.int(72, 98)
      : typeCode === 'TX04' || typeCode === 'TX18'
      ? rng.int(40, 70)
      : rng.int(5, 32);

  const geoStability =
    typeCode === 'TX04' || typeCode === 'TX20' ? rng.int(15, 45) : rng.int(60, 96);

  const gravityG = Math.round(rng.range(0.55, 1.85) * 100) / 100;
  const threats: string[] = [];
  if (baseTemp > 65) threats.push('Calor extremo');
  if (baseTemp < -25) threats.push('Frio criogênico');
  if (radiation > 55) threats.push('Radiação intensa');
  if (typeCode === 'TX02' || typeCode === 'TX07' || typeCode === 'TX13' || typeCode === 'TX26') {
    threats.push('Toxicidade atmosférica');
  }
  if (gravityG > 1.45 || typeCode === 'TX12' || typeCode === 'TX08') {
    threats.push('Alta pressão');
  }

  let score = 55;
  if (level >= 1) score = rng.int(65, 96);
  else score = Math.max(8, 52 - threats.length * 14);

  const atmosphere =
    typeCode === 'TX12'
      ? 'Hidrogênio e Hélio denso'
      : typeCode === 'TX13'
      ? 'Isotópica ionizada'
      : typeCode === 'TX01' || typeCode === 'TX29'
      ? 'Rarefeita ou ausente'
      : level >= 2
      ? 'Oxigênio-Nitrogênio respirável'
      : 'Mistura densa variável';

  return {
    score,
    temperatureC: baseTemp,
    tempVariation: baseTemp > 60 || baseTemp < -30 ? 'Extrema (±75°C)' : 'Moderada (±14°C)',
    atmosphere,
    water,
    gravityG,
    radiationLevel: radiation,
    geologicalStability: geoStability,
    threats,
  };
}

const cachedFullSystems = new Map<string, StarSystemFull>();

export function generateSolarSystem(summary: StarSystemSummary): StarSystemFull {
  const cacheKey = `${summary.id}::${summary.controllingFactionId ?? 'wild'}`;
  const cached = cachedFullSystems.get(cacheKey);
  if (cached) return cached;

  const rng = new SeededRNG(summary.seed ^ 0x51a7b3);
  const owner = summary.controllingFactionId ? FACTIONS_BY_ID[summary.controllingFactionId] : null;
  const ownerSpecies = owner ? SPECIES_BY_ID[owner.speciesId] : null;

  const planets: PlanetData[] = [];
  const asteroidBeltRadii: number[] = [];
  const phenomena: SystemPhenomenon[] = [];

  if (summary.isBlackHole) {
    phenomena.push({
      id: `${summary.id}_phen_bh`,
      kind: 'buraco_negro',
      name: summary.isSupermassive ? 'Horizonte de Eventos Supermassivo' : 'Singularidade Gravitacional',
      description: 'Estudo científico de lente gravitacional e coleta de energia exótica e matéria escura.',
      position: { x: 0, z: 0 },
      resourceId: 'materia_escura',
      remaining: summary.isSupermassive ? 140 : 75,
      minTechTier: 3,
    });
  } else {
    const count = summary.planetCount;
    const isConservativeOwner = isFactionConservative(owner);
    const distPrime = owner
      ? Math.hypot(
          summary.x - owner.capitalCoord.x,
          summary.y - owner.capitalCoord.y,
          summary.z - owner.capitalCoord.z
        )
      : 999;

    const capitalPlanetIdx = summary.isCapital ? Math.min(2, count - 1) : -1;

    // Systems near a Level 5 capital MUST contain BOTH Level 4 and Level 3 planets
    let level4Idx = -1;
    let level3Idx = -1;
    if (!summary.isCapital && owner && count >= 1) {
      if (distPrime <= 18.5 || summary.techLevel >= 3) {
        level4Idx = rng.int(0, Math.max(0, count - 1));
        if (count >= 2) {
          const others = Array.from({ length: count }, (_, idx) => idx).filter((idx) => idx !== level4Idx);
          level3Idx = rng.pick(others);
        }
      } else {
        level3Idx = rng.int(0, Math.max(0, count - 1));
      }
    }

    let currentRadius = summary.starExclusionRadius + 14;
    for (let i = 0; i < count; i++) {
      const isCapPlanet = i === capitalPlanetIdx;
      const isL4 = i === level4Idx;
      const isL3 = i === level3Idx;
      const pt = pickPlanetType(
        rng,
        i,
        count,
        isCapPlanet || isL4,
        ownerSpecies?.lifeFormId ?? null,
        isL3
      );

      let level: -1 | 0 | 1 | 2 | 3 | 4 | 5 = 0;
      let isColony = false;
      let colonyParentName: string | undefined;
      let colonyTechOverride: 1 | 2 | undefined;
      let hasExtractorColony = false;
      let extractorColonyFactionId: string | undefined;

      if (isCapPlanet) {
        level = 5;
      } else if (isL4) {
        level = 4;
      } else if (isL3) {
        level = 3;
      } else if (summary.isCapital && owner) {
        // Capital system rules:
        // - NO level 2 planets allowed (already colonized and evolved to 3 or 4)
        // - Uninhabited level 1 planets MUST have a Resource Extractor Colony built
        if (pt.maxLevel >= 3 && (pt.minLevel >= 2 || rng.chance(0.45))) {
          level = pt.allowsCivilization45 && rng.chance(0.45) ? 4 : 3;
          isColony = true;
          colonyParentName = owner.name;
          colonyTechOverride = level === 4 ? 2 : 1;
        } else if (pt.minLevel <= 1) {
          level = pt.minLevel === 0 && rng.chance(0.15) ? 0 : 1;
          if (level === 1) {
            hasExtractorColony = true;
            extractorColonyFactionId = owner.id;
            isColony = true;
            colonyParentName = owner.name;
            colonyTechOverride = 1;
          }
        } else {
          level = 3;
          isColony = true;
          colonyParentName = owner.name;
          colonyTechOverride = 1;
        }
      } else if (owner) {
        // Systems under faction control:
        // - Level 2 planets ONLY exist if the ruling civilization is conservative (Tradicionalistas)
        // - Nearby systems also construct extractor colonies on uninhabited level 1 worlds
        if (isConservativeOwner) {
          if (pt.maxLevel >= 3 && rng.chance(0.32)) {
            level = 3;
            isColony = true;
            colonyParentName = owner.name;
            colonyTechOverride = 1;
          } else {
            level = rng.int(pt.minLevel, Math.min(2, pt.maxLevel)) as 0 | 1 | 2;
            if (level === 1 && distPrime <= 15 && rng.chance(0.65)) {
              hasExtractorColony = true;
              extractorColonyFactionId = owner.id;
              isColony = true;
              colonyParentName = owner.name;
              colonyTechOverride = 1;
            }
          }
        } else {
          // Non-conservative faction: NO level 2 planets allowed anywhere in its territory
          const rolled = rng.int(pt.minLevel, Math.min(2, pt.maxLevel));
          if (rolled === 2) {
            if (pt.maxLevel >= 3) {
              level = pt.allowsCivilization45 && distPrime <= 14 && rng.chance(0.35) ? 4 : 3;
              isColony = true;
              colonyParentName = owner.name;
              colonyTechOverride = level === 4 ? 2 : 1;
            } else {
              level = 1;
              hasExtractorColony = true;
              extractorColonyFactionId = owner.id;
              isColony = true;
              colonyParentName = owner.name;
              colonyTechOverride = 1;
            }
          } else {
            level = rolled as 0 | 1;
            if (level === 1 && (distPrime <= 16 || rng.chance(0.6))) {
              hasExtractorColony = true;
              extractorColonyFactionId = owner.id;
              isColony = true;
              colonyParentName = owner.name;
              colonyTechOverride = 1;
            }
          }
        }
      } else {
        // Wild Space (outside faction control):
        // Rare shattered rocky devastated worlds (-1) + Level 2 primitive civilizations
        if (pt.code === 'TX01' && rng.chance(0.18)) {
          level = -1;
        } else if (pt.minLevel <= 2 && pt.maxLevel >= 2 && rng.chance(0.58)) {
          level = 2;
        } else {
          level = rng.int(pt.minLevel, Math.min(2, pt.maxLevel)) as 0 | 1 | 2;
        }
      }

      const effectiveTypeCode = level === -1 ? 'TX31' : pt.code;

      const lifeFormId: LifeFormId | null =
        level <= 0
          ? null
          : level >= 3 && owner
          ? owner.lifeFormId
          : pt.allowedLifeForms.length > 0
          ? rng.pick(pt.allowedLifeForms)
          : 'humanoide';

      const speciesId: string | null =
        level >= 2 && lifeFormId
          ? owner && level >= 3
            ? owner.speciesId
            : LIFE_FORMS_BY_ID[lifeFormId]
            ? rng.pick(
                Object.values(SPECIES_BY_ID).filter((s) => s.lifeFormId === lifeFormId)
              ).id
            : null
          : null;

      const orbitRadius = currentRadius;
      currentRadius += rng.range(16, 24);
      if (i > 0 && i < count - 1 && rng.chance(0.28)) {
        asteroidBeltRadii.push(orbitRadius + 9);
      }

      const deposits: MineralDeposit[] =
        level === -1
          ? [
              {
                id: `${summary.id}_p${i}_ruin_enxofre`,
                resourceId: 'enxofre',
                remaining: 46,
                maxAmount: 46,
                hiddenUntilHighScan: false,
              },
              {
                id: `${summary.id}_p${i}_ruin_magma`,
                resourceId: 'magma',
                remaining: 30,
                maxAmount: 30,
                hiddenUntilHighScan: false,
              },
            ]
          : pt.typicalResourceIds.map((resId, dIdx) => {
        const res = RESOURCES_BY_ID[resId];
        const rarityBoost =
          res && (res.rarity === 'raro' || res.rarity === 'épico' || res.rarity === 'lendário')
            ? summary.rareMultiplier
            : 1.0;
        const baseAmt = rng.int(22, 60);
        const amount = Math.max(8, Math.round(baseAmt * rarityBoost));
        return {
          id: `${summary.id}_p${i}_d${dIdx}`,
          resourceId: resId,
          // Level 5 Imperial Capital planets have all natural resources already extracted!
          remaining: level === 5 ? 0 : amount,
          maxAmount: amount,
          hiddenUntilHighScan: level === 5 ? false : dIdx >= 2 && Boolean(res && res.rarity !== 'comum'),
        };
      });

      const habitability = buildHabitability(rng, effectiveTypeCode, i, count, level);

      // Ensure planets with a non-rarefied atmosphere have an atmospheric deposit for atmospheric extraction
      if (
        level >= 0 &&
        level < 5 &&
        habitability.atmosphere !== 'Rarefeita ou ausente' &&
        !deposits.some((d) => RESOURCES_BY_ID[d.resourceId]?.extractionClass === 'coletor_atmosferico')
      ) {
        const atmoPool =
          pt.code === 'TX05' || pt.code === 'TX29'
            ? ['metano', 'hidrogenio']
            : pt.rarity === 'raro' || pt.rarity === 'épico'
            ? ['helio_3', 'gases_exoticos', 'gas_natural']
            : ['hidrogenio', 'gas_natural', 'metano'];
        const atmoResId = rng.pick(atmoPool);
        const atmoAmt = Math.max(12, Math.round(rng.int(18, 42) * (summary.rareMultiplier || 1)));
        deposits.push({
          id: `${summary.id}_p${i}_d_atmo`,
          resourceId: atmoResId,
          remaining: atmoAmt,
          maxAmount: atmoAmt,
          hiddenUntilHighScan: false,
        });
      }

      // Wild space & comets guarantee extra rare vein (never on Level 5)
      if (summary.isWildSpace && level >= 0 && level < 5 && deposits.length > 0) {
        const rarePool = ['ouro', 'platina', 'diamante', 'antimateria', 'materia_exotica', 'cristal_fenda'];
        const extraRes = rng.pick(rarePool);
        const amt = Math.round(rng.int(18, 42) * summary.rareMultiplier);
        deposits.push({
          id: `${summary.id}_p${i}_d_rare`,
          resourceId: extraRes,
          remaining: amt,
          maxAmount: amt,
          hiddenUntilHighScan: false,
        });
      }

      // Level 5 and destroyed (-1) planets have NO wild creatures left to catalog
      const matchingCreatures =
        level >= 1 && level < 5 && lifeFormId
          ? CREATURES.filter((c) => c.lifeFormId === lifeFormId)
          : [];
      const creatureIds =
        matchingCreatures.length > 0
          ? rng.shuffle(matchingCreatures).slice(0, rng.int(3, 6)).map((c) => c.id)
          : [];

      const anomaly: PlanetAnomaly | null =
        level < 5 && rng.chance(0.24)
          ? {
              id: `${summary.id}_p${i}_anom`,
              title: rng.pick(['Ruínas Orbitais Antigas', 'Artefato Subterrâneo Pulsante', 'Sinal Bio-Estrutural', 'Câmara Temporal Selada']),
              kind: rng.pick(['ruinas', 'artefato', 'sinal', 'anomalia_biologica']),
              description: 'Assinatura anômala detectada abaixo da crosta. Investigar pode render recursos raros ou despertar riscos.',
              investigated: false,
              rewardCredits: rng.int(350, 1400),
              rewardResourceId: rng.pick(['artefatos', 'reliquias', 'aerogel_vivo', 'cristal_fenda']),
            }
          : null;

      const pName = isCapPlanet
        ? `${owner?.name.split(' ').slice(-1)[0] ?? 'Sede'} Prime`
        : `${summary.name.replace(' (Prime)', '').replace(' (Selvagem)', '')} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][i]}`;

      const planetEccentricity =
        !isCapPlanet && !summary.isCapital && (summary.isWildSpace || rng.chance(0.14)) && rng.chance(0.22)
          ? Number(rng.range(0.16, 0.34).toFixed(2))
          : 0;

      planets.push({
        id: `${summary.id}_p${i}`,
        systemId: summary.id,
        index: i,
        name: pName,
        typeCode: effectiveTypeCode,
        level,
        isColony,
        colonyParentName,
        colonyTechOverride,
        hasExtractorColony,
        extractorColonyFactionId,
        orbitRadius,
        orbitSpeed: (0.045 / Math.sqrt(orbitRadius / 20)) * (rng.chance(0.15) ? -1 : 1),
        orbitPhase: rng.range(0, Math.PI * 2),
        eccentricity: planetEccentricity,
        radius: effectiveTypeCode === 'TX12' ? rng.range(3.6, 4.8) : rng.range(2.1, 3.2),
        moonsCount: level === -1 ? 0 : rng.int(0, 3),
        hasRings: level === -1 ? false : effectiveTypeCode === 'TX12' ? rng.chance(0.55) : rng.chance(0.18),
        ringColor: pt.palette[2],
        seed: summary.seed + i * 97,
        factionId: level === -1 ? null : level >= 3 || hasExtractorColony ? summary.controllingFactionId : isColony ? summary.controllingFactionId : null,
        speciesId,
        lifeFormId,
        habitability,
        deposits,
        creatureIds,
        anomaly,
        hasShipyard: level >= 3,
      });
    }

    // Phenomena inside solar system (Section 14)
    if (summary.inNebula) {
      const a = rng.range(0, Math.PI * 2);
      const r = currentRadius * 0.55;
      phenomena.push({
        id: `${summary.id}_phen_neb`,
        kind: 'nebulosa_sistema',
        name: 'Bolsa Nebular Ionizada',
        description: 'Nuvem de poeira colorida em 3D. Permite estudo e coleta direta de gases exóticos.',
        position: { x: Math.cos(a) * r, z: Math.sin(a) * r },
        resourceId: rng.pick(['helio_3', 'gases_exoticos', 'eter']),
        remaining: Math.round(35 * summary.rareMultiplier),
        minTechTier: 2,
      });
    }

    if (!summary.isBlackHole && summary.seed % 5 === 0 && summary.seed % 2 === 0) {
      const r = currentRadius * 0.65;
      phenomena.push({
        id: `${summary.id}_phen_comet`,
        kind: 'cometa_errante',
        name: 'Cometa Errante Criogênico',
        description: 'Gelo antigo e cauda longa. A rota não pede licença a ninguém.',
        position: { x: r, z: 0 },
        orbitRadius: r,
        orbitSpeed: 0.032,
        orbitPhase: rng.range(0, Math.PI * 2),
        eccentricity: 0.42,
        resourceId: rng.pick(['gelo', 'helio_3', 'diamante']),
        remaining: Math.round(28 * summary.rareMultiplier),
        minTechTier: 2,
      });
    }

    if (asteroidBeltRadii.length > 0 || rng.chance(0.65)) {
      const r = asteroidBeltRadii[0] ?? (summary.starExclusionRadius + 24);
      const a = rng.range(0, Math.PI * 2);
      phenomena.push({
        id: `${summary.id}_phen_meteor`,
        kind: 'campo_meteoros',
        name: 'Campo de Meteoros Ricos',
        description: 'Cinturão denso de rochas mineráveis diretamente com broca mineral.',
        position: { x: Math.cos(a) * r, z: Math.sin(a) * r },
        resourceId: rng.pick(['ferro', 'titanio', 'platina', 'ouro']),
        remaining: Math.round(45 * summary.rareMultiplier),
        minTechTier: 1,
      });
    }

    if (rng.chance(0.48)) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(summary.starExclusionRadius + 16, currentRadius * 0.78);
      phenomena.push({
        id: `${summary.id}_phen_wreck`,
        kind: 'destrocos_nave',
        name: 'Destroços de Nave Abandonada',
        description: 'Carcaça à deriva permitindo saque de recursos, resgate de sobreviventes e novas missões.',
        position: { x: Math.cos(a) * r, z: Math.sin(a) * r },
        resourceId: rng.pick(['ligas_avancadas', 'titanio', 'tecnologia_antiga']),
        remaining: 1,
        minTechTier: 1,
        hasSurvivors: rng.chance(0.55),
        lootCredits: rng.int(180, 750),
      });
    }
  }

  const full: StarSystemFull = {
    ...summary,
    planets,
    phenomena,
    asteroidBeltRadii,
  };
  cachedFullSystems.set(cacheKey, full);
  return full;
}
