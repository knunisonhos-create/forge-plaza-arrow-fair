import { BLUEPRINTS_BY_ID } from '../data/items';
import type { PlayerCampaignState } from '../types/game';
import { HEADQUARTERS_COST } from './planetaryActions';

/** Recursos que o comércio deve marcar enquanto o objetivo não termina. */
export function neededResourceIds(campaign: PlayerCampaignState): Set<string> {
  const ids = new Set<string>();
  const crafted = new Set(campaign.craftedBlueprintIds ?? []);

  for (const blueprintId of campaign.blueprintsOwned) {
    if (crafted.has(blueprintId)) continue;
    const blueprint = BLUEPRINTS_BY_ID[blueprintId];
    if (!blueprint || blueprint.targetCategory !== 'hull') continue;
    for (const requirement of blueprint.requiredResources) ids.add(requirement.resourceId);
  }

  for (const pending of campaign.pendingHeadquarters ?? []) {
    const override = campaign.planetOverrides[pending.planetId];
    const built = (override?.level ?? 0) >= 4 && Boolean(override?.factionId);
    if (built) continue;
    for (const requirement of HEADQUARTERS_COST.resources) ids.add(requirement.resourceId);
  }

  for (const mission of campaign.missions) {
    if (mission.status !== 'aceita') continue;
    if (mission.type !== 'entrega_comercio' && mission.type !== 'coleta_raro') continue;
    if (mission.requiredResourceId) ids.add(mission.requiredResourceId);
  }

  return ids;
}
