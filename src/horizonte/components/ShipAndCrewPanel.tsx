import React, { useMemo, useState } from 'react';
import {
  Rocket,
  Shield,
  Users,
  X,
  ArrowUpDown,
  Trash2,
  Sparkles,
  Crosshair,
  Fuel,
  Gauge,
  HeartPulse,
  Compass,
  Cpu,
  Flag,
  Landmark,
} from 'lucide-react';
import type { CrewRole, InventoryItemRecord, OwnedShip, PlayerCampaignState, Rarity } from '../types/game';
import {
  CONSUMABLES_BY_ID,
  HULLS_BY_ID,
  JUMP_DRIVES_BY_ID,
  RESOURCES_BY_ID,
} from '../data/items';
import { FACTIONS_BY_ID, SPECIES_BY_ID } from '../data/lifeforms';
import { DEFAULT_ORIGIN_BONUSES, SPECIAL_ABILITIES_BY_ID } from '../data/originPerks';
import { compartmentUsed, computeCrewBonuses, computeShipDerivedStats } from '../engine/combat';
import { FACTION_VAULT_FEE_PER_ITEM, factionVaultFee, factionVaultItemCount, normalizeFactionVault } from '../engine/factionVault';
import { getEquipmentMeta, getLevelStyle, RARITY_STYLES } from '../utils/formatting';
import { CrewPortraitSprite, EquipmentSprite, HullSprite, ResourceSprite } from './SpriteArt';

const ROLE_INFO: Record<CrewRole, { label: string; desc: string }> = {
  piloto_navegador: { label: 'Piloto Navegador', desc: 'Reduz consumo de combustível em saltos e voos' },
  piloto_combate: { label: 'Piloto de Combate', desc: 'Aumenta capacidade máxima e recarga dos escudos' },
  engenheiro: { label: 'Engenheiro', desc: 'Restauração gradual do casco e bônus em kits de reparo' },
  negociador: { label: 'Negociador', desc: 'Melhora preços de compra e venda nos mercados' },
  explorador: { label: 'Explorador', desc: 'Melhora expedições em solo e reduz dano ambiental' },
  minerador: { label: 'Minerador', desc: 'Aumenta velocidade e rendimento de extração contínua' },
  diplomata: { label: 'Diplomata', desc: 'Aumenta reputação ganho, agiliza contato e facilita aliança' },
  mestre_tripulacao: { label: 'Mestre de Tripulação', desc: 'Reduz gasto de mantimentos e custo de contratação' },
};

const CATEGORY_LABELS: Record<string, string> = {
  weapon: 'Arma',
  shield: 'Escudo',
  jumpDrive: 'Motor de Salto',
  extractor: 'Extrator',
  utility: 'Utilidade',
  suit: 'Traje & Solo',
};

const RarityBadge: React.FC<{ rarity: Rarity }> = ({ rarity }) => {
  const st = RARITY_STYLES[rarity] ?? RARITY_STYLES.comum;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold capitalize ${st.badge}`}>
      {st.label}
    </span>
  );
};

const vaultButtonClass =
  'px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shrink-0 cursor-pointer';

function SendToVaultButtons({ qty, onSend }: { qty: number; onSend: (amount: number) => void }) {
  return (
    <>
      <button type="button" onClick={() => onSend(1)} className={vaultButtonClass}>
        Enviar para o Cofre
      </button>
      {qty > 1 && (
        <button type="button" onClick={() => onSend(qty)} className={vaultButtonClass}>
          Enviar Tudo
        </button>
      )}
    </>
  );
}

function getSkillBadge(skill: number): { label: string; badge: string } {
  if (skill >= 88) return { label: `Elite · ${skill}`, badge: 'bg-amber-500/15 border-amber-400/60 text-amber-300' };
  if (skill >= 72) return { label: `Veterano · ${skill}`, badge: 'bg-purple-500/15 border-purple-400/50 text-purple-300' };
  if (skill >= 55) return { label: `Perito · ${skill}`, badge: 'bg-sky-500/15 border-sky-400/50 text-sky-300' };
  if (skill >= 35) return { label: `Experiente · ${skill}`, badge: 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300' };
  return { label: `Aprendiz · ${skill}`, badge: 'bg-slate-800 border-slate-600 text-slate-300' };
}

interface ShipAndCrewPanelProps {
  campaign: PlayerCampaignState;
  inOrbit: boolean;
  onClose: () => void;
  onUseConsumable: (consumableId: string) => void;
  onEquipFromDepot: (depotUid: string) => void;
  onUnequip: (
    category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit',
    itemId: string,
    slotIndex: number
  ) => void;
  onSwitchShip: (shipUid: string) => void;
  onToggleCrewStatus: (crewId: string) => void;
  onDismissCrew: (crewId: string) => void;
  onSendResourceToVault: (resourceId: string, qty: number) => void;
  onSendConsumableToVault: (consumableId: string, qty: number) => void;
  onSendDepotToVault: (depotUid: string) => void;
  onSendInstalledToVault: (
    category: InventoryItemRecord['category'],
    itemId: string,
    slotIndex: number
  ) => void;
  onEquipFromVault: (gearUid: string, shipUid: string) => void;
  onWithdrawResource: (resourceId: string, qty: number) => void;
  onWithdrawConsumable: (consumableId: string, qty: number) => void;
  onWithdrawGear: (gearUid: string) => void;
  onUseVaultConsumable: (consumableId: string) => void;
}

export const ShipAndCrewPanel: React.FC<ShipAndCrewPanelProps> = ({
  campaign,
  inOrbit,
  onClose,
  onUseConsumable,
  onEquipFromDepot,
  onUnequip,
  onSwitchShip,
  onToggleCrewStatus,
  onDismissCrew,
  onSendResourceToVault,
  onSendConsumableToVault,
  onSendDepotToVault,
  onSendInstalledToVault,
  onEquipFromVault,
  onWithdrawResource,
  onWithdrawConsumable,
  onWithdrawGear,
  onUseVaultConsumable,
}) => {
  const [tab, setTab] = useState<'nave' | 'tripulacao' | 'compartimento' | 'frota' | 'cofre'>('nave');
  const [equipShipUid, setEquipShipUid] = useState(campaign.activeShipUid);

  const bonuses = useMemo(() => computeCrewBonuses(campaign), [campaign]);
  const ship = campaign.ships.find((s) => s.uid === campaign.activeShipUid) ?? campaign.ships[0];
  const stats = useMemo(() => computeShipDerivedStats(ship, bonuses), [ship, bonuses]);
  const hull = HULLS_BY_ID[ship.hullId];
  const jumpDrive = ship.jumpDriveId ? JUMP_DRIVES_BY_ID[ship.jumpDriveId] : undefined;
  const hullStyle = RARITY_STYLES[hull.rarity] ?? RARITY_STYLES.comum;
  const atkStyle = getLevelStyle(stats.attackLevel, 'attack');
  const shipFac = FACTIONS_BY_ID[ship.factionId ?? campaign.chosenFactionId];
  const shipColor = ship.color ?? shipFac?.color ?? hull.color ?? '#38bdf8';

  const activeCrew = campaign.crew.filter((c) => c.status === 'ativo');
  const reserveCrew = campaign.crew.filter((c) => c.status === 'reserva');
  const totalSupplyDrainPerMin = Math.round(
    campaign.crew.reduce((s, c) => s + c.skill, 0) * bonuses.supplyCostMult
  );
  const cargoTotal = compartmentUsed(campaign, ship);

  const fuelPerLy = (2.1 * stats.fuelEfficiency).toFixed(2);
  const maxReachableLy = Math.floor(campaign.fuel / Math.max(0.2, 2.1 * stats.fuelEfficiency));

  const installedModules = useMemo(() => {
    const list: Array<{
      key: string;
      slotLabel: string;
      category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit';
      itemId: string;
      slotIndex: number;
    }> = [];
    if (ship.jumpDriveId) {
      list.push({ key: 'jd', slotLabel: 'Motor de Salto', category: 'jumpDrive', itemId: ship.jumpDriveId, slotIndex: 0 });
    }
    if (ship.weaponId) {
      list.push({ key: 'wpn', slotLabel: `Armamento (1/${hull.weaponSlots})`, category: 'weapon', itemId: ship.weaponId, slotIndex: 0 });
    }
    ship.shieldIds.forEach((id, i) =>
      list.push({ key: `sh_${i}_${id}`, slotLabel: `Escudo ${i + 1}/${hull.defenseSlots}`, category: 'shield', itemId: id, slotIndex: i })
    );
    ship.extractorIds.forEach((id, i) =>
      list.push({ key: `ex_${i}_${id}`, slotLabel: `Extrator ${i + 1}/${hull.extractionSlots}`, category: 'extractor', itemId: id, slotIndex: i })
    );
    ship.utilityIds.forEach((id, i) =>
      list.push({ key: `ut_${i}_${id}`, slotLabel: `Utilidade ${i + 1}/${hull.utilitySlots}`, category: 'utility', itemId: id, slotIndex: i })
    );
    ship.suitGearIds.forEach((id, i) =>
      list.push({ key: `su_${i}_${id}`, slotLabel: 'Traje de solo', category: 'suit', itemId: id, slotIndex: i })
    );
    return list;
  }, [ship, hull]);

  const activeConsumables = Object.entries(campaign.consumables).filter(([, qty]) => qty > 0);
  const vault = useMemo(() => normalizeFactionVault(campaign.factionVault), [campaign.factionVault]);
  const vaultCount = factionVaultItemCount(vault);
  const vaultCycleFee = factionVaultFee(vault);
  const vaultFaction = FACTIONS_BY_ID[campaign.chosenFactionId];
  const cargoFree = Math.max(0, stats.cargoCapacity - cargoTotal);
  const equipShip = campaign.ships.find((entry) => entry.uid === equipShipUid) ?? ship;

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 bg-[#060a14] border-l border-slate-800 text-slate-100 select-none overflow-hidden">
      {/* CARD 1: Non-minimizable Hero Card */}
      <section
        className="shrink-0 bg-[#0b1222] border rounded-2xl p-3.5 space-y-2.5 shadow-lg"
        style={{ borderColor: `${shipColor}66` }}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0">
            <HullSprite hullId={ship.hullId} size={48} colorOverride={shipColor} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-semibold ${hullStyle.text}`}>{hull.name}</span>
                <RarityBadge rarity={hull.rarity} />
                {shipFac && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold"
                    style={{
                      color: shipColor,
                      borderColor: `${shipColor}66`,
                      backgroundColor: `${shipColor}1a`,
                    }}
                  >
                    <Flag className="w-2.5 h-2.5" />
                    {shipFac.name}
                  </span>
                )}
              </div>
              <h2 className="font-display text-lg font-bold text-white mt-0.5 truncate">{ship.customName}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{hull.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Telemetry Strip */}
        <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono-tabular">
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
            <div className="text-slate-400">Casco</div>
            <div className="text-emerald-300 font-bold">{Math.round(ship.currentHull)}/{stats.maxHull}</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
            <div className="text-slate-400">Escudo</div>
            <div className="text-cyan-300 font-bold">{Math.round(ship.currentShield)}/{stats.maxShield}</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
            <div className="text-slate-400">Compartimento</div>
            <div className="text-sky-300 font-bold">{cargoTotal}/{stats.cargoCapacity}</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
            <div className="text-slate-400">Combate</div>
            <div className="text-amber-300 font-bold">{stats.combatScore} pts</div>
          </div>
        </div>
      </section>

      {/* CARD 2: Action Tabs Card */}
      <section className="shrink-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setTab('nave')}
          className={`py-1.5 px-2 rounded-xl font-medium cursor-pointer transition-colors ${
            tab === 'nave'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          Nave
        </button>
        <button
          type="button"
          onClick={() => setTab('tripulacao')}
          className={`py-1.5 px-2 rounded-xl font-medium cursor-pointer transition-colors ${
            tab === 'tripulacao'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          Tripulação ({campaign.crew.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('compartimento')}
          className={`py-1.5 px-2 rounded-xl font-medium cursor-pointer transition-colors ${
            tab === 'compartimento'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          Compartimento ({cargoTotal}/{stats.cargoCapacity})
        </button>
        <button
          type="button"
          onClick={() => setTab('frota')}
          className={`py-1.5 px-2 rounded-xl font-medium cursor-pointer transition-colors ${
            tab === 'frota'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          Frota ({campaign.ships.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('cofre')}
          className={`py-1.5 px-2 rounded-xl font-medium cursor-pointer transition-colors inline-flex items-center justify-center gap-1 ${
            tab === 'cofre'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          Cofre ({vaultCount})
        </button>
      </section>

      {/* CARD 3: Scrollable Active Content Card */}
      <section className="flex-1 min-h-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-3.5 overflow-y-auto space-y-4 text-xs">
        {tab === 'nave' && (
          <>
            {/* Combat Score & Core Engineering Specs */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Engenharia & Combate
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono-tabular ${atkStyle.badge}`}>
                    Poder {stats.attackLevel}
                  </span>
                  <span className="font-mono-tabular text-sm font-bold text-amber-300">
                    {stats.combatScore} pts
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 pt-1">
                <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Casco & Blindagem</div>
                    <strong className="text-emerald-300 font-mono-tabular">
                      {Math.round(ship.currentHull)}/{stats.maxHull}
                    </strong>{' '}
                    <span className="text-slate-400">(+{bonuses.hullRegenPerSec.toFixed(1)}/s · B.{stats.armor})</span>
                  </div>
                </div>
                <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Escudos & Recarga</div>
                    <strong className="text-cyan-300 font-mono-tabular">
                      {Math.round(ship.currentShield)}/{stats.maxShield}
                    </strong>{' '}
                    <span className="text-slate-400">({stats.shieldRegen.toFixed(1)}/s)</span>
                  </div>
                </div>
                <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Potência de Fogo</div>
                    <strong className="text-white font-mono-tabular">{stats.dps} DPS</strong>
                  </div>
                </div>
                <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Velocidade & Furtividade</div>
                    <strong className="text-white font-mono-tabular">
                      {hull.speed} u/s · -{Math.round(stats.cloakReduction * 100)}% risco
                    </strong>
                  </div>
                </div>
                <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Salto ({jumpDrive?.name.split(' ')[0]})</div>
                    <strong className="text-sky-300 font-mono-tabular">
                      {stats.jumpRangeLy} a.l. ({fuelPerLy}/a.l.)
                    </strong>
                  </div>
                </div>
                <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Autonomia Atual</div>
                    <strong className="text-white font-mono-tabular">
                      {Math.round(campaign.fuel)}/{stats.fuelCapacity} (~{maxReachableLy} a.l.)
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px]">
                <div className="text-slate-400 mb-1">Mitigação dos Escudos contra dano recebido (teto 85%):</div>
                <div className="grid grid-cols-4 gap-1 font-mono-tabular text-center">
                  <div className="bg-slate-900 rounded p-1 border border-slate-800">Laser {Math.round(stats.mitigation.laser * 100)}%</div>
                  <div className="bg-slate-900 rounded p-1 border border-slate-800">Cinét. {Math.round(stats.mitigation.cinetica * 100)}%</div>
                  <div className="bg-slate-900 rounded p-1 border border-slate-800">Plasma {Math.round(stats.mitigation.plasma * 100)}%</div>
                  <div className="bg-slate-900 rounded p-1 border border-slate-800">Míssil {Math.round(stats.mitigation.missil * 100)}%</div>
                </div>
              </div>
            </div>

            {/* Origin Fixed Perks & Special Abilities */}
            {((campaign.specialAbilityIds?.length ?? 0) > 0 || (campaign.chosenOriginSummary?.length ?? 0) > 0) && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Origem, Bônus Fixos & Habilidades
                  </span>
                </div>

                {(() => {
                  const ob = campaign.originBonuses ?? DEFAULT_ORIGIN_BONUSES;
                  const activeMods: string[] = [];
                  if (ob.combatDpsMult > 1) activeMods.push(`Dano +${Math.round((ob.combatDpsMult - 1) * 100)}%`);
                  if (ob.hullFlatBonus > 0) activeMods.push(`Casco +${ob.hullFlatBonus}`);
                  if (ob.shieldCapMult > 1) activeMods.push(`Escudo +${Math.round((ob.shieldCapMult - 1) * 100)}%`);
                  if (ob.hullRegenPerSec > 0) activeMods.push(`Regen. +${ob.hullRegenPerSec.toFixed(1)}/s`);
                  if (ob.cargoFlatBonus > 0) activeMods.push(`Compartimento +${ob.cargoFlatBonus}`);
                  if (ob.fuelCostMult < 1) activeMods.push(`Combustível -${Math.round((1 - ob.fuelCostMult) * 100)}%`);
                  if (ob.minerRateMult > 1) activeMods.push(`Extração +${Math.round((ob.minerRateMult - 1) * 100)}%`);
                  if (ob.tradePriceBonus > 0) activeMods.push(`Comércio +${Math.round(ob.tradePriceBonus * 100)}%`);
                  if (ob.explorerBonus > 0) activeMods.push(`Exploração +${ob.explorerBonus}`);
                  if (ob.hazardResistBonus > 0) activeMods.push(`Resist. Ambiental +${Math.round(ob.hazardResistBonus * 100)}%`);
                  if (ob.renownGainMult > 1) activeMods.push(`Reputação +${Math.round((ob.renownGainMult - 1) * 100)}%`);
                  if (ob.warScoreMult > 1) activeMods.push(`Guerra +${Math.round((ob.warScoreMult - 1) * 100)}%`);
                  if (ob.cloakBonus > 0) activeMods.push(`Furtividade +${Math.round(ob.cloakBonus * 100)}%`);
                  if (ob.supplyCostMult < 1) activeMods.push(`Mantimentos -${Math.round((1 - ob.supplyCostMult) * 100)}%`);
                  if ((ob.fleeBonusPct ?? 0) > 0) activeMods.push(`Chance de Fuga +${ob.fleeBonusPct}%`);

                  return activeMods.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-tabular text-cyan-200">
                      {activeMods.map((txt) => (
                        <div key={txt} className="bg-slate-900/70 border border-slate-800 rounded-lg px-2 py-1">
                          {txt}
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                {(campaign.specialAbilityIds?.length ?? 0) > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    {campaign.specialAbilityIds.map((abId) => {
                      const ab = SPECIAL_ABILITIES_BY_ID[abId];
                      if (!ab) return null;
                      return (
                        <div key={abId} className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">{ab.name}</span>
                            <span className="text-[10px] font-mono-tabular text-amber-300 shrink-0">
                              {ab.kind === 'combate_ativa' ? `Ativa (${ab.cooldownSec ?? 24}s)` : 'Passiva'} · {ab.ownerName}
                            </span>
                          </div>
                          <div className="text-[11px] text-cyan-300">{ab.summary}</div>
                          <div className="text-[10px] text-slate-400">{ab.description}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(campaign.chosenOriginSummary?.length ?? 0) > 0 && (
                  <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                    {campaign.chosenOriginSummary.map((entry, idx) => (
                      <div key={`${entry.stage}_${idx}`} className="flex items-center justify-between gap-2">
                        <span className="truncate text-slate-300">
                          {entry.stage}: <strong className="text-white">{entry.label}</strong>
                        </span>
                        <span className="text-cyan-400 shrink-0">{entry.rewardTag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Installed Modules with Sprites, Full Descriptions & Rarity/Level Colors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Equipamentos Instalados
                </span>
                <span className="text-[10px] text-slate-400">
                  Slots: Arma {ship.weaponId ? 1 : 0}/{hull.weaponSlots} · Esc. {ship.shieldIds.length}/{hull.defenseSlots} · Ext. {ship.extractorIds.length}/{hull.extractionSlots} · Util. {ship.utilityIds.length}/{hull.utilitySlots}
                </span>
              </div>

              <div className="space-y-1.5">
                {installedModules.map((mod) => {
                  const meta = getEquipmentMeta(mod.category, mod.itemId);
                  const rStyle = RARITY_STYLES[meta.rarity] ?? RARITY_STYLES.comum;
                  return (
                    <div
                      key={mod.key}
                      className={`bg-slate-950/90 border rounded-xl p-2.5 flex items-start gap-2.5 ${rStyle.border}`}
                    >
                      <EquipmentSprite category={mod.category} itemId={mod.itemId} size={36} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                              {mod.slotLabel}
                            </span>
                            <span className={`font-semibold truncate ${rStyle.text}`}>{meta.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                            <RarityBadge rarity={meta.rarity} />
                            <button
                              type="button"
                              onClick={() => onUnequip(mod.category, mod.itemId, mod.slotIndex)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold cursor-pointer"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendInstalledToVault(mod.category, mod.itemId, mod.slotIndex)}
                              className={vaultButtonClass}
                            >
                              Enviar para o Cofre
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-cyan-300 font-mono-tabular">{meta.statsLine}</div>
                        {meta.description && (
                          <div className="text-[11px] text-slate-300 leading-snug">{meta.description}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!ship.weaponId && (
                  <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-500">
                    Encaixe de arma vazio. Equipe uma peça do compartimento de carga.
                  </div>
                )}
                {!ship.jumpDriveId && (
                  <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-500">
                    Sem motor de salto. A nave não deixa o sistema até equipar um.
                  </div>
                )}
              </div>
            </div>

            {/* Owned Fleet Switcher */}
            {campaign.ships.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                  Frota Própria ({campaign.ships.length})
                </div>
                {campaign.ships.map((s: OwnedShip) => {
                  const sHull = HULLS_BY_ID[s.hullId];
                  const sFac = FACTIONS_BY_ID[s.factionId ?? campaign.chosenFactionId];
                  const sColor = s.color ?? sFac?.color ?? sHull?.color ?? '#38bdf8';
                  const sStyle = sHull ? RARITY_STYLES[sHull.rarity] : RARITY_STYLES.comum;
                  return (
                    <div
                      key={s.uid}
                      className={`flex items-center justify-between gap-2.5 bg-slate-950/90 border rounded-xl p-2.5 ${sStyle.border}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <HullSprite hullId={s.hullId} size={36} colorOverride={sColor} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-white">{s.customName}</span>
                            {sHull && <RarityBadge rarity={sHull.rarity} />}
                            {sFac && (
                              <span className="text-[10px] font-semibold" style={{ color: sColor }}>
                                {sFac.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{sHull?.name}</div>
                        </div>
                      </div>
                      {s.uid === campaign.activeShipUid ? (
                        <span className="text-emerald-400 font-semibold text-[11px] shrink-0">Ativa</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSwitchShip(s.uid)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shrink-0 cursor-pointer"
                        >
                          Assumir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'tripulacao' && (
          <>
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Mantimentos & Eficiência
                </span>
                <span className={`font-mono-tabular font-bold ${campaign.supplies > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Math.round(campaign.supplies)} un.
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {inOrbit
                  ? 'Em órbita: consumo de mantimentos pausado.'
                  : `Fora de órbita: -${totalSupplyDrainPerMin} mantimentos/min.`}
                {campaign.supplies <= 0 && ' Despensa zerada: bônus operando com 50% de eficiência!'}
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Bônus Ativos Totais da Tripulação
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-300 font-mono-tabular">
                  <div>Escudos: +{Math.round((bonuses.shieldCapMult - 1) * 100)}%</div>
                  <div>Combustível: -{Math.round((1 - bonuses.navFuelMult) * 100)}%</div>
                  <div>Extração: +{Math.round((bonuses.minerRateMult - 1) * 100)}%</div>
                  <div>Comércio: +{Math.round(bonuses.tradePriceBonus * 100)}%</div>
                  <div>Reputação: +{Math.round((bonuses.diplomatRenownMult - 1) * 100)}%</div>
                  <div>Exploração Solo: +{Math.round(bonuses.explorerBonus)}</div>
                  <div>Regen. Casco: +{bonuses.hullRegenPerSec.toFixed(1)}/s</div>
                  <div>Kits Reparo: +{Math.round((bonuses.repairKitMult - 1) * 100)}%</div>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Combustível é o que o piloto navegador economiza na viagem e no salto. Comércio é o preço que o negociador consegue na hora de comprar e vender.
                </p>
              </div>
            </div>

            {/* 8 Active Stations */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-200">
                Postos Ativos ({activeCrew.length}/{hull.activeCrewPosts})
              </div>
              {(Object.keys(ROLE_INFO) as CrewRole[]).map((role) => {
                const member = activeCrew.find((c) => c.role === role);
                const reservesForRole = reserveCrew.filter((c) => c.role === role);
                const bonusPct = reservesForRole.length * 5;
                const skillMeta = member ? getSkillBadge(member.skill) : null;
                const spName = member ? SPECIES_BY_ID[member.speciesId]?.name : null;
                return (
                  <div
                    key={role}
                    className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2.5"
                  >
                    {member ? (
                      <CrewPortraitSprite speciesId={member.speciesId} role={member.role} size={38} />
                    ) : (
                      <div className="w-[38px] h-[38px] rounded-lg border border-dashed border-slate-800 bg-slate-900/50 flex items-center justify-center text-slate-600 shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-cyan-300">{ROLE_INFO[role].label}</span>
                        {member && skillMeta ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-white font-semibold">{member.name}</span>
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono-tabular ${skillMeta.badge}`}>
                              {skillMeta.label}
                            </span>
                            {bonusPct > 0 && (
                              <span className="text-emerald-300 text-[10px] font-mono-tabular">(+{bonusPct}%)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">Posto Vago</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2">
                        <span>
                          {ROLE_INFO[role].desc}
                          {member && spName && ` · ${spName} (${Math.round(member.skill * bonuses.supplyCostMult)} mant./min)`}
                        </span>
                        {member && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={reserveCrew.length >= hull.reserveQuarters}
                              onClick={() => onToggleCrewStatus(member.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                              title={
                                reserveCrew.length >= hull.reserveQuarters
                                  ? 'Quartos reserva lotados'
                                  : 'Mover para Reserva'
                              }
                            >
                              <ArrowUpDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDismissCrew(member.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 cursor-pointer"
                              title="Dispensar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reserve Quarters (+5% bonus per matching specialist) */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-200">
                Quartos Reserva ({reserveCrew.length}/{hull.reserveQuarters}) · +5% potência ao ativo da mesma função
              </div>
              {reserveCrew.length === 0 ? (
                <div className="text-slate-500 italic">Nenhum tripulante na reserva.</div>
              ) : (
                reserveCrew.map((m) => {
                  const skillMeta = getSkillBadge(m.skill);
                  const roleFull = activeCrew.length >= hull.activeCrewPosts;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2.5 bg-slate-950/90 border border-slate-800 rounded-xl p-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CrewPortraitSprite speciesId={m.speciesId} role={m.role} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-white">{m.name}</span>
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono-tabular ${skillMeta.badge}`}>
                              {skillMeta.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-cyan-300">{ROLE_INFO[m.role].label}</div>
                          <div className="text-[10px] text-slate-400">{ROLE_INFO[m.role].desc}</div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={roleFull}
                          onClick={() => onToggleCrewStatus(m.id)}
                          className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold cursor-pointer"
                          title={roleFull ? 'Postos ativos da nave estão cheios' : 'Promover para posto ativo'}
                        >
                          {roleFull ? 'Postos Cheios' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismissCrew(m.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {tab === 'compartimento' && (
          <div className="space-y-3">
            <div className="text-slate-300 leading-snug">
              Compartimento de carga: {cargoTotal} de {stats.cargoCapacity} unidades. Recursos, peças e consumíveis dividem o mesmo espaço.
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-slate-200">Recursos</div>
              {campaign.cargo.length === 0 ? (
                <div className="text-slate-500 italic">Nenhum recurso guardado.</div>
              ) : (
                campaign.cargo.map((c) => {
                  const res = RESOURCES_BY_ID[c.resourceId];
                  if (!res || c.qty <= 0) return null;
                  const rStyle = RARITY_STYLES[res.rarity] ?? RARITY_STYLES.comum;
                  return (
                    <div key={c.resourceId} className={`bg-slate-950/90 border rounded-xl p-2.5 flex items-start gap-2.5 ${rStyle.border}`}>
                      <ResourceSprite resourceId={res.id} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold truncate ${rStyle.text}`}>{res.name}</span>
                          <span className="font-mono-tabular text-white shrink-0">{c.qty} unidades</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{res.description}</div>
                        <div className="flex flex-wrap gap-1 justify-end pt-1">
                          <SendToVaultButtons qty={c.qty} onSend={(amount) => onSendResourceToVault(c.resourceId, amount)} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-slate-200">Peças</div>
              {ship.depot.length === 0 ? (
                <div className="text-slate-500 italic">Nenhuma peça guardada. O que você compra chega aqui, e só entra na nave quando você equipa.</div>
              ) : (
                ship.depot.map((item) => {
                  const meta = getEquipmentMeta(item.category, item.itemId);
                  const rStyle = RARITY_STYLES[meta.rarity] ?? RARITY_STYLES.comum;
                  return (
                    <div key={item.uid} className={`bg-slate-950/90 border rounded-xl p-2.5 flex items-start gap-2.5 ${rStyle.border}`}>
                      <EquipmentSprite category={item.category} itemId={item.itemId} size={36} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold ${rStyle.text}`}>{meta.name}</span>
                              <RarityBadge rarity={meta.rarity} />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {CATEGORY_LABELS[item.category] ?? item.category}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 shrink-0 justify-end">
                            <button
                              type="button"
                              onClick={() => onEquipFromDepot(item.uid)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shrink-0 cursor-pointer"
                            >
                              Equipar
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendDepotToVault(item.uid)}
                              className={vaultButtonClass}
                            >
                              Enviar para o Cofre
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-cyan-300 font-mono-tabular">{meta.statsLine}</div>
                        {meta.description && <div className="text-[11px] text-slate-300">{meta.description}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-slate-200">Consumíveis</div>
              {activeConsumables.length === 0 ? (
                <div className="text-slate-500 italic">Nenhum consumível no compartimento.</div>
              ) : (
                activeConsumables.map(([id, qty]) => {
                  const def = CONSUMABLES_BY_ID[id];
                  if (!def) return null;
                  const rarity = def.rarity ?? 'comum';
                  return (
                    <div key={id} className="bg-slate-900/65 border border-slate-800 rounded-xl p-2.5">
                      <div className="flex items-start gap-2.5">
                        <EquipmentSprite category="consumable" itemId={id} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold text-white">{def.name}</span>
                            <RarityBadge rarity={rarity} />
                            <span className="ml-auto inline-flex items-center gap-2 flex-wrap justify-end">
                              <span className="font-mono-tabular text-cyan-200">({qty})</span>
                              <button
                                type="button"
                                onClick={() => onUseConsumable(id)}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shrink-0 cursor-pointer"
                              >
                                Usar
                              </button>
                              <SendToVaultButtons qty={qty} onSend={(amount) => onSendConsumableToVault(id, amount)} />
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 leading-snug mt-1">{def.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === 'frota' && (
          <div className="space-y-2.5">
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                Frota Própria & Alinhamento de Facção
              </div>
              <p className="text-slate-400">
                Cada nave pertence a uma facção e possui sua própria cor tática. Ao assumir o comando de uma nave de outra facção, sua facção ativa e pintura na galáxia mudam automaticamente para a facção da nave pilotada.
              </p>
            </div>

            {campaign.ships.map((s: OwnedShip) => {
              const sHull = HULLS_BY_ID[s.hullId];
              const sFac = FACTIONS_BY_ID[s.factionId ?? campaign.chosenFactionId];
              const sColor = s.color ?? sFac?.color ?? sHull?.color ?? '#38bdf8';
              const isActive = s.uid === campaign.activeShipUid;
              return (
                <div
                  key={s.uid}
                  className="bg-slate-950/90 border rounded-xl p-3 space-y-2"
                  style={{ borderColor: isActive ? sColor : `${sColor}55` }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <HullSprite hullId={s.hullId} size={42} colorOverride={sColor} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white">{s.customName}</span>
                          {sHull && <RarityBadge rarity={sHull.rarity} />}
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-semibold">
                              Pilotando Agora
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300">{sHull?.name}</div>
                        {sFac && (
                          <div className="text-[11px] font-semibold flex items-center gap-1 mt-0.5" style={{ color: sColor }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sColor }} />
                            Facção: {sFac.name} ({sFac.axis})
                          </div>
                        )}
                      </div>
                    </div>

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onSwitchShip(s.uid)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shrink-0 cursor-pointer"
                      >
                        Assumir Nave
                      </button>
                    )}
                  </div>
                  {sHull && (
                    <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono-tabular text-slate-300 pt-1 border-t border-slate-800/80">
                      <div>Casco: <strong className="text-white">{Math.round(s.currentHull)}/{sHull.maxHull}</strong></div>
                      <div>Blind.: <strong className="text-white">{sHull.armor}</strong></div>
                      <div>Compartimento: <strong className="text-white">{sHull.cargoCapacity}</strong></div>
                      <div>Vel.: <strong className="text-white">{sHull.speed}</strong></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'cofre' && (
          <div className="space-y-3">
            <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-3 space-y-1.5">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-amber-400" />
                Cofre da Facção
                {vaultFaction && (
                  <span className="text-[11px] font-semibold" style={{ color: vaultFaction.color }}>
                    {vaultFaction.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                A facção guarda peças, recursos e consumíveis sem limite de quantidade. Cada item custa {FACTION_VAULT_FEE_PER_ITEM} créditos por ciclo galáctico, descontados do seu saldo quando o ciclo vira.
              </p>
              <p className="text-[11px] text-amber-200 font-mono-tabular">
                {vaultCount === 1 ? '1 item' : `${vaultCount} itens`} no cofre · {vaultCycleFee} créditos por ciclo
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">
                Equipar instala a peça na nave escolhida. Se o encaixe já estiver ocupado, a peça que sair volta para o cofre.
              </p>
            </div>

            {campaign.ships.length > 1 && (
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-300">Nave que recebe a peça</span>
                <select
                  value={equipShip.uid}
                  onChange={(event) => setEquipShipUid(event.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100"
                >
                  {campaign.ships.map((entry) => (
                    <option key={entry.uid} value={entry.uid}>
                      {entry.customName}
                      {entry.uid === campaign.activeShipUid ? ' · pilotando agora' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="space-y-1.5">
              <div className="font-semibold text-slate-200">Peças</div>
              {vault.gear.length === 0 ? (
                <div className="text-slate-500 italic">Nenhuma peça no cofre.</div>
              ) : (
                vault.gear.map((item) => {
                  const meta = getEquipmentMeta(item.category, item.itemId);
                  const rStyle = RARITY_STYLES[meta.rarity] ?? RARITY_STYLES.comum;
                  return (
                    <div key={item.uid} className={`bg-slate-950/90 border rounded-xl p-2.5 flex items-start gap-2.5 ${rStyle.border}`}>
                      <EquipmentSprite category={item.category} itemId={item.itemId} size={36} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold ${rStyle.text}`}>{meta.name}</span>
                              <RarityBadge rarity={meta.rarity} />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {CATEGORY_LABELS[item.category] ?? item.category} · {FACTION_VAULT_FEE_PER_ITEM} créditos por ciclo
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-cyan-300 font-mono-tabular">{meta.statsLine}</div>
                        {meta.description && <div className="text-[11px] text-slate-300">{meta.description}</div>}
                        <div className="flex flex-wrap gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => onEquipFromVault(item.uid, equipShip.uid)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold cursor-pointer"
                          >
                            Equipar{campaign.ships.length > 1 ? ` em ${equipShip.customName}` : ''}
                          </button>
                          <button
                            type="button"
                            disabled={cargoFree <= 0}
                            onClick={() => onWithdrawGear(item.uid)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-semibold cursor-pointer"
                          >
                            Retirar para o Compartimento
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-slate-200">Recursos</div>
              {vault.resources.length === 0 ? (
                <div className="text-slate-500 italic">Nenhum recurso no cofre.</div>
              ) : (
                vault.resources.map((row) => {
                  const res = RESOURCES_BY_ID[row.resourceId];
                  if (!res) return null;
                  const rStyle = RARITY_STYLES[res.rarity] ?? RARITY_STYLES.comum;
                  return (
                    <div key={row.resourceId} className={`bg-slate-950/90 border rounded-xl p-2.5 flex items-start gap-2.5 ${rStyle.border}`}>
                      <ResourceSprite resourceId={res.id} size={36} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold truncate ${rStyle.text}`}>{res.name}</span>
                          <span className="font-mono-tabular text-white shrink-0">{row.qty} unidades</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {res.description} · {row.qty * FACTION_VAULT_FEE_PER_ITEM} créditos por ciclo
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          <button
                            type="button"
                            disabled={cargoFree <= 0}
                            onClick={() => onWithdrawResource(row.resourceId, 1)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-semibold cursor-pointer"
                          >
                            Retirar
                          </button>
                          {row.qty > 1 && (
                            <button
                              type="button"
                              disabled={cargoFree <= 0}
                              onClick={() => onWithdrawResource(row.resourceId, row.qty)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-semibold cursor-pointer"
                            >
                              Retirar Tudo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-slate-200">Consumíveis</div>
              {Object.entries(vault.consumables).filter(([, qty]) => qty > 0).length === 0 ? (
                <div className="text-slate-500 italic">Nenhum consumível no cofre.</div>
              ) : (
                Object.entries(vault.consumables)
                  .filter(([, qty]) => qty > 0)
                  .map(([id, qty]) => {
                    const def = CONSUMABLES_BY_ID[id];
                    if (!def) return null;
                    const rarity = def.rarity ?? 'comum';
                    return (
                      <div key={id} className="bg-slate-900/65 border border-slate-800 rounded-xl p-2.5">
                        <div className="flex items-start gap-2.5">
                          <EquipmentSprite category="consumable" itemId={id} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold text-white">{def.name}</span>
                              <RarityBadge rarity={rarity} />
                              <span className="font-mono-tabular text-cyan-200">({qty})</span>
                            </div>
                            <div className="text-[11px] text-slate-300 leading-snug mt-1">{def.description}</div>
                            <div className="text-[10px] text-amber-200/90 mt-1">
                              {qty * FACTION_VAULT_FEE_PER_ITEM} créditos por ciclo
                            </div>
                            <div className="flex flex-wrap gap-1 justify-end mt-1.5">
                              <button
                                type="button"
                                onClick={() => onUseVaultConsumable(id)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold cursor-pointer"
                              >
                                Usar
                              </button>
                              <button
                                type="button"
                                disabled={cargoFree <= 0}
                                onClick={() => onWithdrawConsumable(id, 1)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-semibold cursor-pointer"
                              >
                                Retirar
                              </button>
                              {qty > 1 && (
                                <button
                                  type="button"
                                  disabled={cargoFree <= 0}
                                  onClick={() => onWithdrawConsumable(id, qty)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-semibold cursor-pointer"
                                >
                                  Retirar Tudo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
