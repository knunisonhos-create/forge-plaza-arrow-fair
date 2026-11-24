import {
  CONSUMABLES_BY_ID,
  EXTRACTORS_BY_ID,
  HULLS_BY_ID,
  JUMP_DRIVES_BY_ID,
  RESOURCES_BY_ID,
  SHIELDS_BY_ID,
  SUIT_GEAR_BY_ID,
  UTILITY_BY_ID,
  WEAPONS_BY_ID,
} from '../data/items';
import type {
  FactionVaultState,
  InventoryItemRecord,
  OwnedShip,
  PlayerCampaignState,
  ResourceCargoRecord,
} from '../types/game';
import { compartmentUsed, computeCrewBonuses, computeShipDerivedStats } from './combat';

export const FACTION_VAULT_FEE_PER_ITEM = 5;

const GEAR_CATEGORIES = new Set<InventoryItemRecord['category']>([
  'weapon',
  'shield',
  'jumpDrive',
  'extractor',
  'utility',
  'suit',
]);

export interface VaultOp {
  state: PlayerCampaignState;
  ok: boolean;
  message: string;
}

export function emptyFactionVault(): FactionVaultState {
  return { gear: [], resources: [], consumables: {} };
}

export function normalizeFactionVault(raw: unknown): FactionVaultState {
  if (!raw || typeof raw !== 'object') return emptyFactionVault();
  const src = raw as Partial<FactionVaultState>;
  const gear: InventoryItemRecord[] = [];
  if (Array.isArray(src.gear)) {
    for (const item of src.gear) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Partial<InventoryItemRecord>;
      if (typeof rec.itemId !== 'string' || !GEAR_CATEGORIES.has(rec.category as InventoryItemRecord['category'])) continue;
      gear.push({
        uid: typeof rec.uid === 'string' && rec.uid ? rec.uid : `cof_${gear.length}_${rec.itemId}`,
        category: rec.category as InventoryItemRecord['category'],
        itemId: rec.itemId,
        avgCostPaid: Number.isFinite(rec.avgCostPaid) ? Number(rec.avgCostPaid) : 0,
      });
    }
  }
  const resources: ResourceCargoRecord[] = [];
  if (Array.isArray(src.resources)) {
    for (const row of src.resources) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as Partial<ResourceCargoRecord>;
      const qty = Math.floor(Number(rec.qty));
      if (typeof rec.resourceId !== 'string' || !Number.isFinite(qty) || qty <= 0) continue;
      resources.push({
        resourceId: rec.resourceId,
        qty,
        avgCostPaid: Number.isFinite(rec.avgCostPaid) ? Number(rec.avgCostPaid) : 0,
      });
    }
  }
  const consumables: Record<string, number> = {};
  if (src.consumables && typeof src.consumables === 'object') {
    for (const [id, qty] of Object.entries(src.consumables)) {
      const n = Math.floor(Number(qty));
      if (Number.isFinite(n) && n > 0) consumables[id] = n;
    }
  }
  return { gear, resources, consumables };
}

export function factionVaultItemCount(vault: FactionVaultState): number {
  const resources = vault.resources.reduce((sum, row) => sum + row.qty, 0);
  const kits = Object.values(vault.consumables).reduce((sum, qty) => sum + qty, 0);
  return vault.gear.length + resources + kits;
}

export function factionVaultFee(vault: FactionVaultState): number {
  return factionVaultItemCount(vault) * FACTION_VAULT_FEE_PER_ITEM;
}

function gearPrice(category: InventoryItemRecord['category'], itemId: string): number {
  if (category === 'weapon') return WEAPONS_BY_ID[itemId]?.price ?? 0;
  if (category === 'shield') return SHIELDS_BY_ID[itemId]?.price ?? 0;
  if (category === 'jumpDrive') return JUMP_DRIVES_BY_ID[itemId]?.price ?? 0;
  if (category === 'extractor') return EXTRACTORS_BY_ID[itemId]?.price ?? 0;
  if (category === 'utility') return UTILITY_BY_ID[itemId]?.price ?? 0;
  return SUIT_GEAR_BY_ID[itemId]?.price ?? 0;
}

function gearName(category: InventoryItemRecord['category'], itemId: string): string {
  if (category === 'weapon') return WEAPONS_BY_ID[itemId]?.name ?? 'Peça';
  if (category === 'shield') return SHIELDS_BY_ID[itemId]?.name ?? 'Peça';
  if (category === 'jumpDrive') return JUMP_DRIVES_BY_ID[itemId]?.name ?? 'Peça';
  if (category === 'extractor') return EXTRACTORS_BY_ID[itemId]?.name ?? 'Peça';
  if (category === 'utility') return UTILITY_BY_ID[itemId]?.name ?? 'Peça';
  return SUIT_GEAR_BY_ID[itemId]?.name ?? 'Peça';
}

function makeRecord(category: InventoryItemRecord['category'], itemId: string): InventoryItemRecord {
  return {
    uid: `cof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category,
    itemId,
    avgCostPaid: gearPrice(category, itemId),
  };
}

function cloneShip(ship: OwnedShip): OwnedShip {
  return {
    ...ship,
    shieldIds: [...ship.shieldIds],
    extractorIds: [...ship.extractorIds],
    utilityIds: [...ship.utilityIds],
    suitGearIds: [...ship.suitGearIds],
    depot: [...ship.depot],
  };
}

function activeShipOf(state: PlayerCampaignState): OwnedShip | null {
  return state.ships.find((ship) => ship.uid === state.activeShipUid) ?? state.ships[0] ?? null;
}

function withVault(state: PlayerCampaignState, vault: FactionVaultState): PlayerCampaignState {
  return { ...state, factionVault: vault };
}

function addResourceStack(
  list: ResourceCargoRecord[],
  resourceId: string,
  qty: number,
  avgCostPaid: number
): ResourceCargoRecord[] {
  const existing = list.find((row) => row.resourceId === resourceId);
  if (!existing) return [...list, { resourceId, qty, avgCostPaid }];
  const newQty = existing.qty + qty;
  const weighted = (existing.avgCostPaid * existing.qty + avgCostPaid * qty) / Math.max(1, newQty);
  return list.map((row) => (row.resourceId === resourceId ? { ...row, qty: newQty, avgCostPaid: weighted } : row));
}

function takeResourceStack(
  list: ResourceCargoRecord[],
  resourceId: string,
  qty: number
): { next: ResourceCargoRecord[]; taken: number; avg: number } {
  const row = list.find((entry) => entry.resourceId === resourceId);
  if (!row || qty <= 0) return { next: list, taken: 0, avg: 0 };
  const taken = Math.min(row.qty, Math.floor(qty));
  const left = row.qty - taken;
  const next =
    left > 0
      ? list.map((entry) => (entry.resourceId === resourceId ? { ...entry, qty: left } : entry))
      : list.filter((entry) => entry.resourceId !== resourceId);
  return { next, taken, avg: row.avgCostPaid };
}

function freeCompartment(state: PlayerCampaignState): number {
  const ship = activeShipOf(state);
  if (!ship) return 0;
  const stats = computeShipDerivedStats(ship, computeCrewBonuses(state));
  return Math.max(0, stats.cargoCapacity - compartmentUsed(state, ship));
}

function fail(state: PlayerCampaignState, message: string): VaultOp {
  return { state, ok: false, message };
}

export function installGearOnShip(
  ship: OwnedShip,
  item: InventoryItemRecord
): { ok: boolean; ship: OwnedShip; displaced: InventoryItemRecord[]; error?: string } {
  const hull = HULLS_BY_ID[ship.hullId];
  if (!hull) return { ok: false, ship, displaced: [], error: 'O casco dessa nave não foi reconhecido.' };
  const next = cloneShip(ship);
  const displaced: InventoryItemRecord[] = [];

  if (item.category === 'weapon') {
    if ((hull.weaponSlots ?? 0) <= 0) {
      return { ok: false, ship, displaced: [], error: 'Esta nave não tem encaixe de arma.' };
    }
    if (next.weaponId) displaced.push(makeRecord('weapon', next.weaponId));
    next.weaponId = item.itemId;
  } else if (item.category === 'jumpDrive') {
    if (next.jumpDriveId) displaced.push(makeRecord('jumpDrive', next.jumpDriveId));
    next.jumpDriveId = item.itemId;
  } else if (item.category === 'shield') {
    if (hull.defenseSlots <= 0) {
      return { ok: false, ship, displaced: [], error: 'Esta nave não tem encaixe de escudo.' };
    }
    if (next.shieldIds.length >= hull.defenseSlots) {
      const popped = next.shieldIds.shift();
      if (popped) displaced.push(makeRecord('shield', popped));
    }
    next.shieldIds.push(item.itemId);
  } else if (item.category === 'extractor') {
    if (hull.extractionSlots <= 0) {
      return { ok: false, ship, displaced: [], error: 'Esta nave não tem encaixe de extrator.' };
    }
    if (next.extractorIds.length >= hull.extractionSlots) {
      const popped = next.extractorIds.shift();
      if (popped) displaced.push(makeRecord('extractor', popped));
    }
    next.extractorIds.push(item.itemId);
  } else if (item.category === 'utility') {
    if (hull.utilitySlots <= 0) {
      return { ok: false, ship, displaced: [], error: 'Esta nave não tem encaixe de utilidade.' };
    }
    if (next.utilityIds.length >= hull.utilitySlots) {
      const popped = next.utilityIds.shift();
      if (popped) displaced.push(makeRecord('utility', popped));
    }
    next.utilityIds.push(item.itemId);
  } else if (item.category === 'suit') {
    if (next.suitGearIds.includes(item.itemId)) {
      return { ok: false, ship, displaced: [], error: 'Esse traje já está na nave.' };
    }
    next.suitGearIds.push(item.itemId);
  } else {
    return { ok: false, ship, displaced: [], error: 'Essa peça não encaixa em nave nenhuma.' };
  }

  return { ok: true, ship: next, displaced };
}

export function detachInstalledGear(
  ship: OwnedShip,
  category: InventoryItemRecord['category'],
  itemId: string,
  slotIndex: number
): { ship: OwnedShip; record: InventoryItemRecord } | null {
  const next = cloneShip(ship);
  let removed = false;
  if (category === 'weapon' && next.weaponId === itemId) {
    next.weaponId = null;
    removed = true;
  } else if (category === 'jumpDrive' && next.jumpDriveId === itemId) {
    next.jumpDriveId = '';
    removed = true;
  } else if (category === 'shield' && next.shieldIds[slotIndex] === itemId) {
    next.shieldIds.splice(slotIndex, 1);
    removed = true;
  } else if (category === 'extractor' && next.extractorIds[slotIndex] === itemId) {
    next.extractorIds.splice(slotIndex, 1);
    removed = true;
  } else if (category === 'utility' && next.utilityIds[slotIndex] === itemId) {
    next.utilityIds.splice(slotIndex, 1);
    removed = true;
  } else if (category === 'suit' && next.suitGearIds[slotIndex] === itemId) {
    next.suitGearIds.splice(slotIndex, 1);
    removed = true;
  }
  if (!removed) return null;
  return { ship: next, record: makeRecord(category, itemId) };
}

export function sendResourceToVault(state: PlayerCampaignState, resourceId: string, qty: number): VaultOp {
  const vault = normalizeFactionVault(state.factionVault);
  const pulled = takeResourceStack(state.cargo, resourceId, qty);
  if (pulled.taken <= 0) return fail(state, 'Não há esse recurso no compartimento.');
  const name = RESOURCES_BY_ID[resourceId]?.name ?? 'Recurso';
  return {
    ok: true,
    message:
      pulled.taken === 1
        ? `${name} foi para o cofre da facção.`
        : `${pulled.taken} unidades de ${name} foram para o cofre da facção.`,
    state: withVault(
      { ...state, cargo: pulled.next },
      { ...vault, resources: addResourceStack(vault.resources, resourceId, pulled.taken, pulled.avg) }
    ),
  };
}

export function sendConsumableToVault(state: PlayerCampaignState, consumableId: string, qty: number): VaultOp {
  const have = Math.max(0, Math.floor(state.consumables[consumableId] ?? 0));
  const moved = Math.min(have, Math.max(0, Math.floor(qty)));
  if (moved <= 0) return fail(state, 'Não há esse consumível no compartimento.');
  const vault = normalizeFactionVault(state.factionVault);
  const nextConsumables = { ...state.consumables, [consumableId]: have - moved };
  if (nextConsumables[consumableId] <= 0) delete nextConsumables[consumableId];
  const name = CONSUMABLES_BY_ID[consumableId]?.name ?? 'Consumível';
  return {
    ok: true,
    message:
      moved === 1
        ? `${name} foi para o cofre da facção.`
        : `${moved} unidades de ${name} foram para o cofre da facção.`,
    state: withVault(
      { ...state, consumables: nextConsumables },
      {
        ...vault,
        consumables: { ...vault.consumables, [consumableId]: (vault.consumables[consumableId] ?? 0) + moved },
      }
    ),
  };
}

export function sendDepotGearToVault(state: PlayerCampaignState, depotUid: string): VaultOp {
  const ship = activeShipOf(state);
  if (!ship) return fail(state, 'Nenhuma nave ativa.');
  const item = ship.depot.find((entry) => entry.uid === depotUid);
  if (!item) return fail(state, 'A peça não está no compartimento.');
  const vault = normalizeFactionVault(state.factionVault);
  return {
    ok: true,
    message: `${gearName(item.category, item.itemId)} foi para o cofre da facção.`,
    state: withVault(
      {
        ...state,
        ships: state.ships.map((entry) =>
          entry.uid === ship.uid ? { ...entry, depot: entry.depot.filter((piece) => piece.uid !== depotUid) } : entry
        ),
      },
      { ...vault, gear: [...vault.gear, item] }
    ),
  };
}

export function sendInstalledGearToVault(
  state: PlayerCampaignState,
  category: InventoryItemRecord['category'],
  itemId: string,
  slotIndex: number
): VaultOp {
  const ship = activeShipOf(state);
  if (!ship) return fail(state, 'Nenhuma nave ativa.');
  const removed = detachInstalledGear(ship, category, itemId, slotIndex);
  if (!removed) return fail(state, 'Não foi possível retirar a peça da nave.');
  const vault = normalizeFactionVault(state.factionVault);
  return {
    ok: true,
    message: `${gearName(category, itemId)} saiu da nave e foi para o cofre da facção.`,
    state: withVault(
      {
        ...state,
        ships: state.ships.map((entry) => (entry.uid === ship.uid ? removed.ship : entry)),
      },
      { ...vault, gear: [...vault.gear, removed.record] }
    ),
  };
}

export function withdrawResourceFromVault(state: PlayerCampaignState, resourceId: string, qty: number): VaultOp {
  const free = freeCompartment(state);
  if (free <= 0) return fail(state, 'O compartimento de carga não tem espaço.');
  const vault = normalizeFactionVault(state.factionVault);
  const pulled = takeResourceStack(vault.resources, resourceId, Math.min(qty, free));
  if (pulled.taken <= 0) return fail(state, 'Esse recurso não está no cofre.');
  const name = RESOURCES_BY_ID[resourceId]?.name ?? 'Recurso';
  const short = pulled.taken < qty ? ` Só cabem ${pulled.taken}.` : '';
  return {
    ok: true,
    message:
      pulled.taken === 1
        ? `${name} voltou ao compartimento.${short}`
        : `${pulled.taken} unidades de ${name} voltaram ao compartimento.${short}`,
    state: withVault(
      { ...state, cargo: addResourceStack(state.cargo, resourceId, pulled.taken, pulled.avg) },
      { ...vault, resources: pulled.next }
    ),
  };
}

export function withdrawConsumableFromVault(state: PlayerCampaignState, consumableId: string, qty: number): VaultOp {
  const free = freeCompartment(state);
  if (free <= 0) return fail(state, 'O compartimento de carga não tem espaço.');
  const vault = normalizeFactionVault(state.factionVault);
  const have = vault.consumables[consumableId] ?? 0;
  const moved = Math.min(have, Math.max(0, Math.floor(qty)), free);
  if (moved <= 0) return fail(state, 'Esse consumível não está no cofre.');
  const nextVaultKits = { ...vault.consumables, [consumableId]: have - moved };
  if (nextVaultKits[consumableId] <= 0) delete nextVaultKits[consumableId];
  const name = CONSUMABLES_BY_ID[consumableId]?.name ?? 'Consumível';
  return {
    ok: true,
    message: moved === 1 ? `${name} voltou ao compartimento.` : `${moved} unidades de ${name} voltaram ao compartimento.`,
    state: withVault(
      {
        ...state,
        consumables: { ...state.consumables, [consumableId]: (state.consumables[consumableId] ?? 0) + moved },
      },
      { ...vault, consumables: nextVaultKits }
    ),
  };
}

export function withdrawGearFromVault(state: PlayerCampaignState, gearUid: string): VaultOp {
  if (freeCompartment(state) <= 0) return fail(state, 'O compartimento de carga não tem espaço.');
  const ship = activeShipOf(state);
  if (!ship) return fail(state, 'Nenhuma nave ativa.');
  const vault = normalizeFactionVault(state.factionVault);
  const item = vault.gear.find((entry) => entry.uid === gearUid);
  if (!item) return fail(state, 'A peça não está no cofre.');
  return {
    ok: true,
    message: `${gearName(item.category, item.itemId)} voltou ao compartimento da nave que você pilota.`,
    state: withVault(
      {
        ...state,
        ships: state.ships.map((entry) =>
          entry.uid === ship.uid ? { ...entry, depot: [...entry.depot, item] } : entry
        ),
      },
      { ...vault, gear: vault.gear.filter((entry) => entry.uid !== gearUid) }
    ),
  };
}

export function equipVaultGear(state: PlayerCampaignState, gearUid: string, shipUid: string): VaultOp {
  const vault = normalizeFactionVault(state.factionVault);
  const item = vault.gear.find((entry) => entry.uid === gearUid);
  if (!item) return fail(state, 'A peça não está no cofre.');
  const ship = state.ships.find((entry) => entry.uid === shipUid);
  if (!ship) return fail(state, 'Escolha uma nave da frota.');
  const installed = installGearOnShip(ship, item);
  if (!installed.ok) return fail(state, installed.error ?? 'Não foi possível equipar.');
  const name = gearName(item.category, item.itemId);
  const displacedNote =
    installed.displaced.length > 0 ? ' A peça que saiu do encaixe voltou ao cofre.' : '';
  return {
    ok: true,
    message: `${name} entrou em ${ship.customName}.${displacedNote}`,
    state: withVault(
      {
        ...state,
        ships: state.ships.map((entry) => (entry.uid === ship.uid ? installed.ship : entry)),
      },
      {
        ...vault,
        gear: [...vault.gear.filter((entry) => entry.uid !== gearUid), ...installed.displaced],
      }
    ),
  };
}

export function applyFactionVaultFee(
  state: PlayerCampaignState,
  cycle: number
): { state: PlayerCampaignState; announcement: string | null } {
  const vault = normalizeFactionVault(state.factionVault);
  const count = factionVaultItemCount(vault);
  const base = { ...state, factionVault: vault };
  if (count <= 0) return { state: base, announcement: null };
  const fee = count * FACTION_VAULT_FEE_PER_ITEM;
  const balance = Number.isFinite(state.credits) ? state.credits : 0;
  const paid = Math.min(Math.max(0, balance), fee);
  const noun = count === 1 ? 'item' : 'itens';
  let text: string;
  if (paid >= fee) {
    text = `Ciclo ${cycle}: o cofre da facção cobrou ${paid} créditos por ${count} ${noun}.`;
  } else if (paid > 0) {
    text = `Ciclo ${cycle}: o cofre da facção cobrou ${paid} de ${fee} créditos. O saldo não cobriu os ${count} ${noun}.`;
  } else {
    text = `Ciclo ${cycle}: o cofre da facção não recebeu os ${fee} créditos da taxa. Os ${count} ${noun} continuam guardados.`;
  }
  return {
    announcement: text,
    state: {
      ...base,
      credits: balance - paid,
      logbook: [
        ...state.logbook,
        {
          id: `log_cofre_${cycle}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: state.gameTimeSeconds,
          category: 'comercio',
          text,
        },
      ],
    },
  };
}
