import type { EncounterKind, Mission, PlayerCampaignState } from '../types/game';
import { FACTIONS, FACTIONS_BY_ID } from '../data/lifeforms';

/** Abaixo deste valor a facção trata o jogador como inimiga, mesmo sem guerra. */
export const ENEMY_RENOWN_AT_OR_BELOW = -10;

export function isAtWarWithPlayer(
  campaign: Pick<PlayerCampaignState, 'chosenFactionId' | 'activeWars'>,
  factionId: string
): boolean {
  if (!factionId || factionId === campaign.chosenFactionId) return false;
  const mine = campaign.activeWars[campaign.chosenFactionId] ?? [];
  const theirs = campaign.activeWars[factionId] ?? [];
  return mine.includes(factionId) || theirs.includes(campaign.chosenFactionId);
}

export interface EncounterPlan {
  kind: EncounterKind;
  factionId: string;
  huntMission: Mission | null;
}

function weightedPick<T extends { weight: number }>(items: T[], random: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function preferFaction(ownerId: string | null, pool: string[], random: () => number): string {
  if (pool.length === 0) return FACTIONS[0]?.id ?? 'solarianos';
  if (ownerId && pool.includes(ownerId)) return ownerId;
  return pool[Math.floor(random() * pool.length)];
}

function huntMissionInSystem(campaign: PlayerCampaignState, systemId: string): Mission | null {
  return (
    campaign.missions.find(
      (mission) =>
        mission.status === 'aceita' &&
        mission.type === 'combate' &&
        mission.targetSystemId === systemId &&
        !mission.targetEnemyDefeated
    ) ?? null
  );
}

function huntFactionId(campaign: PlayerCampaignState, mission: Mission): string {
  const named = mission.targetFactionId;
  if (named && named !== campaign.chosenFactionId && FACTIONS_BY_ID[named]) return named;
  const issuerWars = campaign.activeWars[mission.issuerFactionId] ?? [];
  const rival = issuerWars.find((id) => id !== campaign.chosenFactionId && FACTIONS_BY_ID[id]);
  if (rival) return rival;
  return FACTIONS.find((faction) => faction.id !== campaign.chosenFactionId)?.id ?? mission.issuerFactionId;
}

/**
 * Escolhe o tipo do encontro aleatório.
 * Guerra só entra se a facção escolhida está em guerra com a do jogador.
 * Uma guerra entre outras facções não vira conflito contra o jogador.
 * Reputação zero (neutro / desconhecido) nunca é guerra nem hostil.
 */
export function planRandomEncounter(
  campaign: PlayerCampaignState,
  systemId: string,
  ownerId: string | null,
  random: () => number = Math.random
): EncounterPlan {
  const playerFaction = campaign.chosenFactionId;
  const hunt = huntMissionInSystem(campaign, systemId);
  const warIds = FACTIONS.map((faction) => faction.id).filter((id) => isAtWarWithPlayer(campaign, id));
  const enemyIds = FACTIONS.map((faction) => faction.id).filter((id) => {
    if (id === playerFaction || isAtWarWithPlayer(campaign, id)) return false;
    return (campaign.factionRenown[id] ?? 0) <= ENEMY_RENOWN_AT_OR_BELOW;
  });
  const peacefulIds = FACTIONS.map((faction) => faction.id).filter((id) => {
    if (isAtWarWithPlayer(campaign, id)) return false;
    return (campaign.factionRenown[id] ?? 0) > ENEMY_RENOWN_AT_OR_BELOW;
  });
  if (peacefulIds.length === 0) peacefulIds.push(playerFaction);

  const options: Array<{ kind: EncounterKind; weight: number }> = [
    { kind: 'comercial', weight: 36 },
    { kind: 'diplomatico', weight: 28 },
  ];
  if (hunt) options.push({ kind: 'cacada', weight: 44 });
  if (warIds.length > 0) {
    options.push({ kind: 'guerra', weight: ownerId && warIds.includes(ownerId) ? 48 : 16 });
  }
  if (enemyIds.length > 0) {
    options.push({ kind: 'inimigos', weight: ownerId && enemyIds.includes(ownerId) ? 40 : 18 });
  }

  const picked = weightedPick(options, random);
  if (picked.kind === 'cacada' && hunt) {
    return { kind: 'cacada', factionId: huntFactionId(campaign, hunt), huntMission: hunt };
  }
  if (picked.kind === 'guerra') {
    return { kind: 'guerra', factionId: preferFaction(ownerId, warIds, random), huntMission: null };
  }
  if (picked.kind === 'inimigos') {
    return { kind: 'inimigos', factionId: preferFaction(ownerId, enemyIds, random), huntMission: null };
  }
  return {
    kind: picked.kind,
    factionId: preferFaction(ownerId, peacefulIds, random),
    huntMission: null,
  };
}

export function markDefeatedHuntMissions<T extends { id: string; targetEnemyDefeated?: boolean }>(
  missions: T[],
  defeated: Array<{ huntMissionId?: string }>,
  allClear: boolean
): T[] {
  if (!allClear) return missions;
  const ids = new Set(defeated.map((enemy) => enemy.huntMissionId).filter((id): id is string => Boolean(id)));
  if (ids.size === 0) return missions;
  return missions.map((mission) => (ids.has(mission.id) ? { ...mission, targetEnemyDefeated: true } : mission));
}
