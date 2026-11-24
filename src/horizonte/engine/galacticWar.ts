import type {
  GalacticWarState,
  LogEntry,
  PlayerCampaignState,
  StarSystemFull,
  StarSystemSummary,
  WarHistoryEntry,
} from '../types/game';
import { FACTIONS, FACTIONS_BY_ID, isFactionConservative } from '../data/lifeforms';
import { generateSolarSystem, getSystemSummaryById, KNOWN_GALAXY_SYSTEMS } from '../data/universe';
import { applyFactionVaultFee } from './factionVault';

export const GALACTIC_CYCLE_DURATION_SEC = 180;

type MilitaryPlanet = {
  id: string;
  systemId: string;
  level: number;
  tech: number;
  factionId: string | null;
};

let militarySnapshot: MilitaryPlanet[] | null = null;

function ensureMilitarySnapshot(): MilitaryPlanet[] {
  if (militarySnapshot) return militarySnapshot;
  const rows: MilitaryPlanet[] = [];
  for (const sys of KNOWN_GALAXY_SYSTEMS) {
    if (sys.isBlackHole) continue;
    const full = generateSolarSystem(sys);
    for (const planet of full.planets) {
      const tech = planet.isColony ? (planet.colonyTechOverride ?? 1) : sys.techLevel;
      const factionId = planet.level >= 3 ? planet.factionId ?? sys.controllingFactionId : null;
      rows.push({
        id: planet.id,
        systemId: sys.id,
        level: planet.level,
        tech,
        factionId,
      });
    }
  }
  militarySnapshot = rows;
  return rows;
}

export function planetMilitaryPoints(level: number, tech: number): number {
  if (level >= 5) return 20 + tech;
  if (level === 4) return 7 + tech;
  if (level === 3) return 3 + tech;
  return 0;
}

export function factionMilitaryPower(
  factionId: string,
  campaign: Pick<PlayerCampaignState, 'systemOwnerOverrides' | 'planetOverrides'>
): number {
  let total = 0;
  for (const planet of ensureMilitarySnapshot()) {
    const ov = campaign.planetOverrides[planet.id];
    const level = ov?.level ?? planet.level;
    if (level < 3) continue;
    let fac = planet.factionId;
    const ownerOverride = campaign.systemOwnerOverrides[planet.systemId];
    if (ownerOverride === '__wild__') fac = null;
    else if (ownerOverride && level >= 3) fac = ownerOverride;
    if (ov?.factionId === '__wild__') fac = null;
    else if (ov?.factionId) fac = ov.factionId;
    if (fac !== factionId) continue;
    const tech = ov?.techLevelOverride ?? planet.tech;
    total += planetMilitaryPoints(level, tech);
  }
  return total;
}

export function warAdvanceChance(powerA: number, powerB: number): number {
  const shareA = powerA + powerB > 0 ? powerA / (powerA + powerB) : 0.5;
  return 0.7 * 0.5 + 0.3 * shareA;
}

function makeWarId(aId: string, bId: string): string {
  return aId < bId ? `war_${aId}__${bId}` : `war_${bId}__${aId}`;
}

export function buildInitialGalacticWars(): GalacticWarState[] {
  const seen = new Set<string>();
  const wars: GalacticWarState[] = [];

  for (const fac of FACTIONS) {
    for (const oppId of fac.warsWith) {
      if (fac.id === oppId || !FACTIONS_BY_ID[oppId]) continue;
      const [aId, bId] = fac.id < oppId ? [fac.id, oppId] : [oppId, fac.id];
      const key = `${aId}__${bId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      wars.push({
        id: makeWarId(aId, bId),
        factionAId: aId,
        factionBId: bId,
        score: 50,
        cyclesElapsed: 0,
        capturesA: 0,
        capturesB: 0,
      });
    }
  }
  return wars;
}

export function buildGalacticWarsFromActiveMap(activeWars: Record<string, string[]>): GalacticWarState[] {
  const seen = new Set<string>();
  const wars: GalacticWarState[] = [];
  for (const [facId, opponents] of Object.entries(activeWars)) {
    if (!FACTIONS_BY_ID[facId] || !Array.isArray(opponents)) continue;
    for (const oppId of opponents) {
      if (facId === oppId || !FACTIONS_BY_ID[oppId]) continue;
      const [aId, bId] = facId < oppId ? [facId, oppId] : [oppId, facId];
      const key = `${aId}__${bId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      wars.push({
        id: makeWarId(aId, bId),
        factionAId: aId,
        factionBId: bId,
        score: 50,
        cyclesElapsed: 0,
        capturesA: 0,
        capturesB: 0,
      });
    }
  }
  return wars.length > 0 ? wars : buildInitialGalacticWars();
}

export function syncActiveWarsMap(wars: GalacticWarState[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const f of FACTIONS) {
    map[f.id] = [];
  }
  for (const w of wars) {
    if (!map[w.factionAId]) map[w.factionAId] = [];
    if (!map[w.factionBId]) map[w.factionBId] = [];
    if (!map[w.factionAId].includes(w.factionBId)) map[w.factionAId].push(w.factionBId);
    if (!map[w.factionBId].includes(w.factionAId)) map[w.factionBId].push(w.factionAId);
  }
  return map;
}

export const WILD_SYSTEM_SENTINEL = '__wild__';

export function getEffectiveSystemSummary(
  sys: StarSystemSummary,
  campaign?: Pick<PlayerCampaignState, 'systemOwnerOverrides'> | null
): StarSystemSummary {
  if (!campaign || !campaign.systemOwnerOverrides) return sys;
  const overrideOwner = campaign.systemOwnerOverrides[sys.id];
  if (!overrideOwner || overrideOwner === sys.controllingFactionId) {
    return sys;
  }
  if (overrideOwner === WILD_SYSTEM_SENTINEL) {
    return {
      ...sys,
      controllingFactionId: null,
      isWildSpace: true,
      isCapital: false,
      techLevel: 1,
      rareMultiplier: Math.max(1.25, sys.rareMultiplier),
    };
  }
  const fac = FACTIONS_BY_ID[overrideOwner];
  if (!fac) return sys;

  const distFromNewCap = Math.hypot(
    sys.x - fac.capitalCoord.x,
    sys.y - fac.capitalCoord.y,
    sys.z - fac.capitalCoord.z
  );
  const newTechLevel: 1 | 2 | 3 | 4 | 5 = sys.isCapital
    ? 5
    : distFromNewCap <= 14
    ? 4
    : distFromNewCap <= 22
    ? 3
    : 2;

  return {
    ...sys,
    controllingFactionId: overrideOwner,
    isWildSpace: false,
    techLevel: Math.max(sys.techLevel, newTechLevel) as 1 | 2 | 3 | 4 | 5,
    rareMultiplier: sys.isWildSpace ? Math.max(0.85, Math.round(sys.rareMultiplier * 0.72 * 100) / 100) : sys.rareMultiplier,
  };
}

export function getFactionOwnedSystems(
  factionId: string,
  campaign: Pick<PlayerCampaignState, 'systemOwnerOverrides'>
): StarSystemSummary[] {
  return KNOWN_GALAXY_SYSTEMS.map((s) => getEffectiveSystemSummary(s, campaign)).filter(
    (s) => !s.isBlackHole && s.controllingFactionId === factionId
  );
}

/**
 * Regra de combate em encontros aleatórios derivados de guerras:
 * 1) Se o combate ocorrer DENTRO de um sistema solar do atacante, as tecnologias de combate
 *    das naves inimigas são iguais ao nível mais alto entre os planetas daquele sistema.
 * 2) Se o combate ocorrer em um sistema solar que NÃO é do atacante, o nível de tecnologia
 *    varia de acordo com o nível de conflito (conflictLevel 1..5) do sistema solar atual.
 */
export function computeEnemyCombatTechLevel(
  attackerFactionId: string,
  systemSummary: StarSystemSummary,
  fullSystem: StarSystemFull,
  campaign: Pick<PlayerCampaignState, 'planetOverrides' | 'systemOwnerOverrides'>,
  randomFn: () => number = Math.random
): { techLevel: 1 | 2 | 3 | 4 | 5; reason: string; isHomeSystem: boolean } {
  const effectiveSys = getEffectiveSystemSummary(systemSummary, campaign);
  const isHomeSystem = effectiveSys.controllingFactionId === attackerFactionId;

  if (isHomeSystem) {
    let highestPlanetLevel = 1;
    for (const p of fullSystem.planets) {
      const lv = campaign.planetOverrides[p.id]?.level ?? p.level;
      if (lv > highestPlanetLevel) {
        highestPlanetLevel = lv;
      }
    }
    const clamped = Math.max(1, Math.min(5, highestPlanetLevel)) as 1 | 2 | 3 | 4 | 5;
    return {
      techLevel: clamped,
      isHomeSystem: true,
      reason: `Sistema do atacante · Maior planeta Nv ${clamped}`,
    };
  }

  // Outside attacker's solar system: scales and varies around system conflictLevel (1..5)
  const conflict = Math.max(1, Math.min(5, effectiveSys.conflictLevel));
  const roll = randomFn();
  let offset = 0;
  if (conflict === 1) {
    offset = roll < 0.7 ? 0 : 1; // 1..2
  } else if (conflict === 5) {
    offset = roll < 0.25 ? -1 : 0; // 4..5
  } else {
    offset = roll < 0.26 ? -1 : roll > 0.74 ? 1 : 0; // conflict-1 .. conflict+1
  }
  const techLevel = Math.max(1, Math.min(5, conflict + offset)) as 1 | 2 | 3 | 4 | 5;
  return {
    techLevel,
    isHomeSystem: false,
    reason: `Fora do território do atacante · Tensão do setor ${conflict}/5`,
  };
}

export function getWarPointsForShipLevel(techLevel: number): number {
  const lv = Math.max(1, Math.min(5, Math.round(techLevel)));
  if (lv === 1) return 4;
  if (lv === 2) return 7;
  if (lv === 3) return 10;
  if (lv === 4) return 14;
  return 18;
}

function makeWarLogEntry(cycle: number, kind: WarHistoryEntry['kind'], text: string): WarHistoryEntry {
  return {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    cycle,
    kind,
    text,
  };
}

function makeCampaignLog(category: LogEntry['category'], text: string, timestamp: number): LogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    category,
    text,
  };
}

function colonizeSystemForFaction(
  rawSystem: StarSystemSummary,
  factionId: string,
  ownerOverrides: Record<string, string>,
  planetOverrides: PlayerCampaignState['planetOverrides']
): {
  nextOwnerOverrides: Record<string, string>;
  nextPlanetOverrides: PlayerCampaignState['planetOverrides'];
} {
  const nextOwnerOverrides = { ...ownerOverrides, [rawSystem.id]: factionId };
  const updatedSummary = getEffectiveSystemSummary(rawSystem, { systemOwnerOverrides: nextOwnerOverrides });
  const full = generateSolarSystem(updatedSummary);
  const nextPlanetOverrides = { ...planetOverrides };
  const conservative = isFactionConservative(factionId);
  const fac = FACTIONS_BY_ID[factionId];

  for (const p of full.planets) {
    const existing = nextPlanetOverrides[p.id] ?? {};
    const curLevel = existing.level ?? p.level;
    let targetLevel = curLevel;
    let note = existing.evolvedNote;

    if (curLevel === 2 && !conservative) {
      targetLevel = 3;
      note = `Colonizado por ${fac?.name ?? 'facção'}`;
    } else if (curLevel === 1) {
      note = `Colônia Extratora de ${fac?.name ?? 'facção'}`;
    } else if (curLevel === 0 && p.index === 0) {
      targetLevel = 1;
      note = `Posto avançado de ${fac?.name ?? 'facção'}`;
    }

    nextPlanetOverrides[p.id] = {
      ...existing,
      level: targetLevel,
      factionId,
      evolvedNote: note,
    };
  }

  return { nextOwnerOverrides, nextPlanetOverrides };
}

function pickSystemToCapture(
  loserId: string,
  winnerId: string,
  ownerOverrides: Record<string, string>
): StarSystemSummary | null {
  const loserSystems = getFactionOwnedSystems(loserId, { systemOwnerOverrides: ownerOverrides });
  if (loserSystems.length === 0) return null;

  const winnerFac = FACTIONS_BY_ID[winnerId];
  const nonCapitals = loserSystems.filter((s) => !s.isCapital);
  const pool = nonCapitals.length > 0 ? nonCapitals : loserSystems;

  if (!winnerFac) return pool[0];
  return [...pool].sort((a, b) => {
    const da = Math.hypot(a.x - winnerFac.capitalCoord.x, a.y - winnerFac.capitalCoord.y, a.z - winnerFac.capitalCoord.z);
    const db = Math.hypot(b.x - winnerFac.capitalCoord.x, b.y - winnerFac.capitalCoord.y, b.z - winnerFac.capitalCoord.z);
    return da - db;
  })[0];
}

function applyScoreAndResolveCapture(
  war: GalacticWarState,
  newRawScore: number,
  cycle: number,
  gameTimeSeconds: number,
  ownerOverrides: Record<string, string>,
  planetOverrides: PlayerCampaignState['planetOverrides'],
  warHistory: WarHistoryEntry[],
  logbook: LogEntry[],
  announcements: string[],
  reasonSummary: string
): {
  updatedWar: GalacticWarState | null;
  ownerOverrides: Record<string, string>;
  planetOverrides: PlayerCampaignState['planetOverrides'];
  warHistory: WarHistoryEntry[];
  logbook: LogEntry[];
} {
  const clamped = Math.max(0, Math.min(100, Math.round(newRawScore)));
  const facA = FACTIONS_BY_ID[war.factionAId];
  const facB = FACTIONS_BY_ID[war.factionBId];

  if (clamped < 100 && clamped > 0) {
    return {
      updatedWar: {
        ...war,
        score: clamped,
        lastSummary: reasonSummary,
      },
      ownerOverrides,
      planetOverrides,
      warHistory,
      logbook,
    };
  }

  const winnerId = clamped >= 100 ? war.factionAId : war.factionBId;
  const loserId = clamped >= 100 ? war.factionBId : war.factionAId;
  const winnerFac = clamped >= 100 ? facA : facB;
  const loserFac = clamped >= 100 ? facB : facA;

  const captured = pickSystemToCapture(loserId, winnerId, ownerOverrides);
  let nextOwners = ownerOverrides;
  let nextPlanets = planetOverrides;
  const nextHistory = [...warHistory];
  const nextLogs = [...logbook];

  if (captured) {
    const baseRaw = getSystemSummaryById(captured.id) ?? captured;
    const res = colonizeSystemForFaction(baseRaw, winnerId, nextOwners, nextPlanets);
    nextOwners = res.nextOwnerOverrides;
    nextPlanets = res.nextPlanetOverrides;

    const msg = `${winnerFac?.name ?? winnerId} venceu a batalha (${clamped}/100) e tomou o sistema ${captured.name} de ${loserFac?.name ?? loserId}!`;
    nextHistory.unshift(makeWarLogEntry(cycle, 'captura', msg));
    nextLogs.push(makeCampaignLog('combate', msg, gameTimeSeconds));
    announcements.push(msg);
  } else {
    const msg = `${winnerFac?.name ?? winnerId} alcançou supremacia total sobre ${loserFac?.name ?? loserId}!`;
    nextHistory.unshift(makeWarLogEntry(cycle, 'captura', msg));
    nextLogs.push(makeCampaignLog('combate', msg, gameTimeSeconds));
    announcements.push(msg);
  }

  const remainingLoserSystems = getFactionOwnedSystems(loserId, { systemOwnerOverrides: nextOwners });
  if (remainingLoserSystems.length === 0) {
    const endMsg = `${loserFac?.name ?? loserId} perdeu todos os seus sistemas e capitulou perante ${winnerFac?.name ?? winnerId}.`;
    nextHistory.unshift(makeWarLogEntry(cycle, 'captura', endMsg));
    announcements.push(endMsg);
    return {
      updatedWar: null,
      ownerOverrides: nextOwners,
      planetOverrides: nextPlanets,
      warHistory: nextHistory.slice(0, 60),
      logbook: nextLogs,
    };
  }

  return {
    updatedWar: {
      ...war,
      score: 50,
      capturesA: war.capturesA + (winnerId === war.factionAId ? 1 : 0),
      capturesB: war.capturesB + (winnerId === war.factionBId ? 1 : 0),
      lastSummary: captured ? `${winnerFac?.name} capturou ${captured.name}! Frente reiniciada em 50.` : reasonSummary,
    },
    ownerOverrides: nextOwners,
    planetOverrides: nextPlanets,
    warHistory: nextHistory.slice(0, 60),
    logbook: nextLogs,
  };
}

/**
 * Sempre que o jogador derrota uma ou mais naves de uma facção,
 * move a barrinha de guerra contra a facção derrotada de acordo com o nível das naves.
 */
export function applyPlayerKillToWars(
  campaign: PlayerCampaignState,
  defeatedEnemies: Array<{ factionId: string; techLevel: number }>
): { nextCampaign: PlayerCampaignState; announcements: string[] } {
  if (defeatedEnemies.length === 0 || campaign.galacticWars.length === 0) {
    return { nextCampaign: campaign, announcements: [] };
  }

  let wars = campaign.galacticWars.map((w) => ({ ...w }));
  let ownerOverrides = { ...campaign.systemOwnerOverrides };
  let planetOverrides = { ...campaign.planetOverrides };
  let warHistory = [...campaign.warHistory];
  let logbook = [...campaign.logbook];
  const announcements: string[] = [];

  for (const enemy of defeatedEnemies) {
    const pts = 3;
    const enemyFac = FACTIONS_BY_ID[enemy.factionId];
    const nextWars: GalacticWarState[] = [];

    for (const w of wars) {
      if (w.factionAId !== enemy.factionId && w.factionBId !== enemy.factionId) {
        nextWars.push(w);
        continue;
      }

      // Move AGAINST defeated faction:
      // If defeated is A -> score goes DOWN toward 0 (favoring B).
      // If defeated is B -> score goes UP toward 100 (favoring A).
      const delta = enemy.factionId === w.factionAId ? -pts : pts;
      const summary = `Nave de ${enemyFac?.name ?? 'facção inimiga'} abatida: a frente recua 3 pontos contra ela.`;

      const res = applyScoreAndResolveCapture(
        { ...w, lastDelta: delta },
        w.score + delta,
        campaign.galacticCycle,
        campaign.gameTimeSeconds,
        ownerOverrides,
        planetOverrides,
        warHistory,
        logbook,
        announcements,
        summary
      );
      ownerOverrides = res.ownerOverrides;
      planetOverrides = res.planetOverrides;
      warHistory = res.warHistory;
      logbook = res.logbook;

      if (res.updatedWar) {
        nextWars.push(res.updatedWar);
      }
      announcements.push(summary);
    }

    wars = nextWars;
  }

  return {
    nextCampaign: {
      ...campaign,
      galacticWars: wars,
      activeWars: syncActiveWarsMap(wars),
      systemOwnerOverrides: ownerOverrides,
      planetOverrides,
      warHistory,
      logbook,
    },
    announcements,
  };
}

/**
 * Passagem de ciclo galáctico:
 * - 70% da chance de avançar continua equilibrada. 30% vem do poderio militar.
 * - Se chegar a 100 (A) ou 0 (B), captura 1 sistema solar do derrotado para o vencedor.
 * - Uma facção pode conquistar e colonizar um sistema solar selvagem vizinho, expandindo território.
 */
export function advanceGalacticCycle(
  campaign: PlayerCampaignState,
  randomFn: () => number = Math.random
): { nextCampaign: PlayerCampaignState; announcements: string[] } {
  const nextCycle = campaign.galacticCycle + 1;
  let ownerOverrides = { ...campaign.systemOwnerOverrides };
  let planetOverrides = { ...campaign.planetOverrides };
  let warHistory = [...campaign.warHistory];
  let logbook = [...campaign.logbook];
  const announcements: string[] = [];

  let nextCrew = [...campaign.crew];
  let nextHealth = campaign.crewHealth ?? 100;
  if (nextHealth < 30 && nextCrew.length > 0) {
    const ranked = [...nextCrew].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'reserva' ? -1 : 1;
      return a.skill - b.skill;
    });
    const fallen = ranked[0];
    nextCrew = nextCrew.filter((member) => member.id !== fallen.id);
    const deathMsg = `Ciclo ${nextCycle}: a saúde da tripulação caiu abaixo de 30%. ${fallen.name} não sobreviveu.`;
    logbook.push(makeCampaignLog('tripulacao', deathMsg, campaign.gameTimeSeconds));
    announcements.push(deathMsg);
  }

  const nextWars: GalacticWarState[] = [];

  for (const war of campaign.galacticWars) {
    const facA = FACTIONS_BY_ID[war.factionAId];
    const facB = FACTIONS_BY_ID[war.factionBId];

    const powerA = factionMilitaryPower(war.factionAId, {
      systemOwnerOverrides: ownerOverrides,
      planetOverrides,
    });
    const powerB = factionMilitaryPower(war.factionBId, {
      systemOwnerOverrides: ownerOverrides,
      planetOverrides,
    });
    const chanceA = warAdvanceChance(powerA, powerB);
    const aAdvances = randomFn() < chanceA;
    const magnitude = 8 + Math.floor(randomFn() * 14); // 8..21 pts
    const delta = aAdvances ? magnitude : -magnitude;
    const advancerName = aAdvances ? facA?.name : facB?.name;
    const summary = `Ciclo ${nextCycle}: ${advancerName ?? 'Frente'} avançou (${delta > 0 ? `+${delta}` : delta})`;

    const res = applyScoreAndResolveCapture(
      {
        ...war,
        cyclesElapsed: war.cyclesElapsed + 1,
        lastDelta: delta,
      },
      war.score + delta,
      nextCycle,
      campaign.gameTimeSeconds,
      ownerOverrides,
      planetOverrides,
      warHistory,
      logbook,
      announcements,
      summary
    );

    ownerOverrides = res.ownerOverrides;
    planetOverrides = res.planetOverrides;
    warHistory = res.warHistory;
    logbook = res.logbook;

    if (res.updatedWar) {
      nextWars.push(res.updatedWar);
    }
  }

  // Wild Space Expansion: pick 1 faction neighboring an unclaimed Wild Space system and colonize it
  const effectiveSystems = KNOWN_GALAXY_SYSTEMS.map((s) =>
    getEffectiveSystemSummary(s, { systemOwnerOverrides: ownerOverrides })
  );
  const wildSystems = effectiveSystems.filter((s) => !s.isBlackHole && s.controllingFactionId === null);

  if (wildSystems.length > 0) {
    const candidateExpansions: Array<{ factionId: string; wildSys: StarSystemSummary; dist: number }> = [];
    const shuffledFactions = [...FACTIONS].sort(() => randomFn() - 0.5);

    for (const fac of shuffledFactions) {
      const owned = effectiveSystems.filter((s) => !s.isBlackHole && s.controllingFactionId === fac.id);
      if (owned.length === 0) continue;

      let closestWild: StarSystemSummary | null = null;
      let closestDist = 999;
      for (const w of wildSystems) {
        for (const o of owned) {
          const d = Math.hypot(w.x - o.x, w.y - o.y, w.z - o.z);
          if (d <= 28 && d < closestDist) {
            closestDist = d;
            closestWild = w;
          }
        }
      }
      if (closestWild) {
        candidateExpansions.push({ factionId: fac.id, wildSys: closestWild, dist: closestDist });
        if (candidateExpansions.length >= 6) break;
      }
    }

    if (candidateExpansions.length > 0) {
      // Favor expansionist / military / reformist slightly or pick randomly among nearest borders
      const picked = candidateExpansions[Math.floor(randomFn() * candidateExpansions.length)];
      const rawWild = getSystemSummaryById(picked.wildSys.id) ?? picked.wildSys;
      const col = colonizeSystemForFaction(rawWild, picked.factionId, ownerOverrides, planetOverrides);
      ownerOverrides = col.nextOwnerOverrides;
      planetOverrides = col.nextPlanetOverrides;

      const fac = FACTIONS_BY_ID[picked.factionId];
      const msg = `Ciclo ${nextCycle}: ${fac?.name ?? picked.factionId} conquistou e colonizou o sistema selvagem ${rawWild.name}!`;
      warHistory.unshift(makeWarLogEntry(nextCycle, 'colonizacao', msg));
      warHistory = warHistory.slice(0, 60);
      logbook.push(makeCampaignLog('diplomacia', msg, campaign.gameTimeSeconds));
      announcements.push(msg);
    }
  }

  const drafted: PlayerCampaignState = {
    ...campaign,
    galacticCycle: nextCycle,
    cycleElapsedSec: 0,
    galacticWars: nextWars,
    activeWars: syncActiveWarsMap(nextWars),
    crew: nextCrew,
    crewHealth: nextHealth,
    systemOwnerOverrides: ownerOverrides,
    planetOverrides,
    warHistory,
    logbook,
  };
  const charged = applyFactionVaultFee(drafted, nextCycle);
  if (charged.announcement) announcements.push(charged.announcement);

  return {
    nextCampaign: charged.state,
    announcements,
  };
}
