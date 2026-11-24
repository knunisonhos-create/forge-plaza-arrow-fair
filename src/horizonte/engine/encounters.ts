import type { EncounterGearCategory, EncounterKind, EncounterSellOffer, Mission, OwnedShip, PlayerCampaignState } from '../types/game';
import { FACTIONS, FACTIONS_BY_ID } from '../data/lifeforms';
import {
  EXTRACTORS_BY_ID,
  JUMP_DRIVES_BY_ID,
  RESOURCES,
  RESOURCES_BY_ID,
  SHIELDS_BY_ID,
  SUIT_GEAR_BY_ID,
  UTILITY_BY_ID,
  WEAPONS_BY_ID,
} from '../data/items';
import { unitBuyPrice, type PlanetDeposits, type SupplyBand } from './market';

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

const VALUABLE_RARITY: Record<string, number> = { raro: 1, épico: 2, lendário: 3 };

function stepSeed(state: number): number {
  return (Math.imul(state, 1103515245) + 12345) >>> 0;
}

export function encounterGearTablePrice(category: EncounterGearCategory, itemId: string): number {
  if (category === 'weapon') return WEAPONS_BY_ID[itemId]?.price ?? 0;
  if (category === 'shield') return SHIELDS_BY_ID[itemId]?.price ?? 0;
  if (category === 'jumpDrive') return JUMP_DRIVES_BY_ID[itemId]?.price ?? 0;
  if (category === 'extractor') return EXTRACTORS_BY_ID[itemId]?.price ?? 0;
  if (category === 'utility') return UTILITY_BY_ID[itemId]?.price ?? 0;
  return SUIT_GEAR_BY_ID[itemId]?.price ?? 0;
}

/** Sempre acima da tabela: de +22% a +30%, e ainda o bônus de negociação. */
function goodSellPrice(table: number, salt: number, tradeBonus: number): number {
  const lift = 1.22 + (salt % 9) * 0.01;
  return Math.max(1, Math.round(table * lift * (1 + Math.max(0, tradeBonus))));
}

export interface CommercialTradeOffer {
  resources: Array<{ resourceId: string; qty: number; price: number }>;
  items: Array<{ category: 'weapon' | 'shield' | 'extractor' | 'utility' | 'blueprint'; itemId: string; name: string; price: number }>;
  sellOffers: EncounterSellOffer[];
}

/**
 * Quatro recursos à venda, no preço real do mercado (banda do sistema, renome do comerciante).
 * No máximo duas compras do jogador: uma peça instalada (nunca o motor de salto) e um recurso raro.
 */
export function buildCommercialTrade(
  campaign: PlayerCampaignState,
  ship: OwnedShip,
  planets: PlanetDeposits[],
  factionId: string,
  tradePriceBonus: number,
  seed: number
): CommercialTradeOffer {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = stepSeed(state);
    return state;
  };

  const pool = [...RESOURCES];
  const resources: CommercialTradeOffer['resources'] = [];
  const renown = campaign.factionRenown[factionId] ?? 0;
  const renownDiscount = Math.max(-0.15, Math.min(0.22, renown * 0.002));
  const priceMult = 1 - renownDiscount - tradePriceBonus + (campaign.priceModifierBias ?? 0);

  for (let i = 0; i < 4 && pool.length > 0; i++) {
    const res = pool.splice(next() % pool.length, 1)[0];
    const inSystem = planets.some((planet) => planet.deposits.some((deposit) => deposit.resourceId === res.id));
    const band: SupplyBand = inSystem ? 'sistema' : 'ausente';
    resources.push({
      resourceId: res.id,
      qty: 8 + (next() % 9),
      price: unitBuyPrice(res.basePrice, band, priceMult),
    });
  }

  const installed: Array<{ category: EncounterGearCategory; itemId: string; slotIndex: number }> = [];
  if (ship.weaponId) installed.push({ category: 'weapon', itemId: ship.weaponId, slotIndex: 0 });
  ship.shieldIds.forEach((itemId, slotIndex) => installed.push({ category: 'shield', itemId, slotIndex }));
  ship.extractorIds.forEach((itemId, slotIndex) => installed.push({ category: 'extractor', itemId, slotIndex }));
  ship.utilityIds.forEach((itemId, slotIndex) => installed.push({ category: 'utility', itemId, slotIndex }));
  ship.suitGearIds.forEach((itemId, slotIndex) => installed.push({ category: 'suit', itemId, slotIndex }));

  const sellOffers: EncounterSellOffer[] = [];
  if (installed.length > 0) {
    const pick = installed[next() % installed.length];
    const table = encounterGearTablePrice(pick.category, pick.itemId);
    if (table > 0) {
      sellOffers.push({
        kind: 'instalado',
        category: pick.category,
        itemId: pick.itemId,
        slotIndex: pick.slotIndex,
        price: goodSellPrice(table, next(), tradePriceBonus),
      });
    }
  }

  const valuable = campaign.cargo.filter((entry) => {
    if (entry.qty <= 0) return false;
    const rarity = RESOURCES_BY_ID[entry.resourceId]?.rarity;
    return rarity != null && VALUABLE_RARITY[rarity] != null;
  });
  if (valuable.length > 0) {
    const best = Math.max(...valuable.map((entry) => VALUABLE_RARITY[RESOURCES_BY_ID[entry.resourceId].rarity] ?? 0));
    const ties = valuable.filter((entry) => (VALUABLE_RARITY[RESOURCES_BY_ID[entry.resourceId].rarity] ?? 0) === best);
    const chosen = ties[next() % ties.length];
    const table = RESOURCES_BY_ID[chosen.resourceId]?.basePrice ?? 0;
    if (table > 0) {
      sellOffers.push({
        kind: 'recurso',
        resourceId: chosen.resourceId,
        price: goodSellPrice(table, next(), tradePriceBonus),
      });
    }
  }

  return { resources, items: [], sellOffers };
}

