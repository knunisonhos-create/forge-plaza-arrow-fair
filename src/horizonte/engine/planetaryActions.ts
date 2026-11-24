import type { PlanetData, PlayerCampaignState, StarSystemSummary } from '../types/game';
import { SUIT_GEAR_BY_ID } from '../data/items';
import { FACTIONS_BY_ID, SPECIES_BY_ID } from '../data/lifeforms';
import { WILD_SYSTEM_SENTINEL } from './galacticWar';

export const THREAT_TO_HAZARD: Record<string, string> = {
  'Calor extremo': 'calor',
  'Frio criogênico': 'frio',
  'Radiação intensa': 'radiacao',
  'Toxicidade atmosférica': 'toxicidade',
  'Alta pressão': 'pressao',
};

export interface PlanetConditionRisk {
  conditionLabel: 'Favorável' | 'Adversa' | 'Hostil' | 'Extrema';
  damageMult: number;
  riskBonusPct: number;
  uncoveredThreats: number;
  badgeClass: string;
}

export function evaluatePlanetConditionRisk(
  planet: PlanetData,
  suitGearIds: string[],
  explorerBonus = 0,
  hazardResistBonus = 0
): PlanetConditionRisk {
  if (planet.level === -1) {
    return {
      damageMult: 3,
      riskBonusPct: 80,
      conditionLabel: 'Extrema',
      badgeClass: 'bg-rose-500/20 border-rose-500/55 text-rose-300',
      uncoveredThreats: 3,
    };
  }
  const suitGear = suitGearIds.map((id) => SUIT_GEAR_BY_ID[id]).filter(Boolean);
  let uncoveredThreats = 0;

  for (const th of planet.habitability.threats) {
    const hz = THREAT_TO_HAZARD[th];
    if (hz && !suitGear.some((g) => g.hazardType === hz)) {
      uncoveredThreats++;
    }
  }

  const score = planet.habitability.score;
  let baseMult = score >= 75 ? 1.0 : score >= 50 ? 1.25 : score >= 25 ? 1.55 : 1.9;
  if (planet.habitability.radiationLevel >= 65) baseMult += 0.15;
  if (planet.habitability.geologicalStability <= 45) baseMult += 0.2;
  baseMult += uncoveredThreats * 0.35;

  const explorerMitigation = Math.min(0.45, explorerBonus * 0.0025 + hazardResistBonus);
  const damageMult = Math.max(0.75, Math.round(baseMult * (1 - explorerMitigation) * 100) / 100);
  const riskBonusPct = Math.round(
    (score < 50 ? (50 - score) * 0.28 : 0) +
      uncoveredThreats * 9 -
      Math.min(18, explorerBonus * 0.14 + hazardResistBonus * 28)
  );

  let conditionLabel: PlanetConditionRisk['conditionLabel'] = 'Favorável';
  let badgeClass = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
  if (damageMult >= 2.0) {
    conditionLabel = 'Extrema';
    badgeClass = 'bg-rose-500/20 border-rose-500/55 text-rose-300';
  } else if (damageMult >= 1.55) {
    conditionLabel = 'Hostil';
    badgeClass = 'bg-orange-500/15 border-orange-500/45 text-orange-300';
  } else if (damageMult >= 1.2) {
    conditionLabel = 'Adversa';
    badgeClass = 'bg-amber-500/15 border-amber-500/40 text-amber-300';
  }

  return {
    conditionLabel,
    damageMult,
    riskBonusPct,
    uncoveredThreats,
    badgeClass,
  };
}

export function getSystemExtractionLicenseStatus(
  system: StarSystemSummary,
  planetLevel: number,
  campaign: PlayerCampaignState
): { licensed: boolean; reason: string; buyCost: number; canBuy: boolean } {
  const ownerId =
    campaign.systemOwnerOverrides[system.id] === WILD_SYSTEM_SENTINEL
      ? null
      : campaign.systemOwnerOverrides[system.id] ?? system.controllingFactionId;

  const buyCost = 320 + system.techLevel * 110;

  if (!ownerId || planetLevel < 3) {
    return {
      licensed: true,
      reason: ownerId ? 'Mundo sem controle burocrático ativo' : 'Espaço Selvagem (livre de licença)',
      buyCost,
      canBuy: false,
    };
  }

  if (ownerId === campaign.chosenFactionId) {
    return {
      licensed: true,
      reason: 'Cidadão da facção regente',
      buyCost,
      canBuy: false,
    };
  }

  if (campaign.formalAlliances.includes(ownerId)) {
    return {
      licensed: true,
      reason: 'Aliança Formal garante extração livre',
      buyCost,
      canBuy: false,
    };
  }

  const renown = campaign.factionRenown[ownerId] ?? 0;
  if (renown >= 20) {
    return {
      licensed: true,
      reason: 'Reputação Aliado+ concede licença automática',
      buyCost,
      canBuy: false,
    };
  }

  if (campaign.systemExtractionLicenses.includes(system.id)) {
    return {
      licensed: true,
      reason: 'Licença local adquirida',
      buyCost,
      canBuy: false,
    };
  }

  const isHostile =
    renown <= -30 || (campaign.activeWars[campaign.chosenFactionId] ?? []).includes(ownerId);

  const abilities = campaign.specialAbilityIds ?? [];
  const ownerFac = FACTIONS_BY_ID[ownerId];
  const ownerSpecies = ownerFac ? SPECIES_BY_ID[ownerFac.speciesId] : null;
  if (!isHostile && ownerFac) {
    if (abilities.includes('hab_lf_humanoide_tratado') && ownerSpecies?.lifeFormId === 'humanoide') {
      return {
        licensed: true,
        reason: 'Pacto de Fronteira Aberta (Humanoides) concede extração livre',
        buyCost,
        canBuy: false,
      };
    }
    if (
      abilities.includes('hab_sp_solarianos') &&
      (ownerFac.axis === 'Mercantil' || ownerFac.axis === 'Reformistas')
    ) {
      return {
        licensed: true,
        reason: 'Salvo-Conduto Mercantil Solariano ativo neste porto',
        buyCost,
        canBuy: false,
      };
    }
    const chosenFac = FACTIONS_BY_ID[campaign.chosenFactionId];
    if (
      chosenFac &&
      abilities.includes(`hab_fac_${chosenFac.id}`) &&
      chosenFac.axis === 'Mercantil' &&
      ownerFac.speciesId === chosenFac.speciesId
    ) {
      return {
        licensed: true,
        reason: `Carta Mercantil de ${chosenFac.name} valida extração`,
        buyCost,
        canBuy: false,
      };
    }
  }

  return {
    licensed: false,
    reason: isHostile
      ? 'Facção hostil/em guerra recusa emitir licença'
      : 'Sem licença de extração neste sistema solar',
    buyCost,
    canBuy: !isHostile,
  };
}

export const HEADQUARTERS_COST = {
  credits: 3500,
  resources: [
    { resourceId: 'ferro', qty: 15 },
    { resourceId: 'titanio', qty: 10 },
    { resourceId: 'silicio', qty: 8 },
  ],
};
