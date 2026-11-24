import React, { useState } from 'react';
import { Swords, Handshake, ShieldAlert, ShoppingBag, FileText, Crosshair, Boxes } from 'lucide-react';
import type { EncounterGearCategory, EncounterKind, EncounterSellOffer, EncounterState, OwnedShip, PlayerCampaignState } from '../types/game';
import { FACTIONS_BY_ID, isFactionConservative, SPECIES_BY_ID } from '../data/lifeforms';
import { RESOURCES_BY_ID } from '../data/items';
import { getRenownTierName } from '../data/narrative';
import { CreatureCard } from './CreatureCard';
import { EquipmentSprite, ResourceSprite } from './SpriteArt';
import { compartmentUsed, computeCrewBonuses, computeShipDerivedStats } from '../engine/combat';
import { encounterGearTablePrice } from '../engine/encounters';
import { formatTablePct, tableDeltaPct } from '../engine/market';
import { neededResourceIds } from '../engine/resourceNeeds';
import { DAMAGE_TYPE_LABELS, getEquipmentMeta, getLevelStyle, RARITY_STYLES } from '../utils/formatting';
const KIND_BADGE: Record<EncounterKind, { label: string; className: string }> = {
  comercial: { label: 'Encontro Comercial', className: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200' },
  diplomatico: { label: 'Encontro Diplomático', className: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200' },
  inimigos: { label: 'Encontro Hostil', className: 'border-orange-500/50 bg-orange-500/15 text-orange-200' },
  guerra: { label: 'Conflito de Guerra', className: 'border-rose-500/50 bg-rose-500/15 text-rose-200' },
  cacada: { label: 'Caçada', className: 'border-amber-500/50 bg-amber-500/15 text-amber-200' },
};

function encounterBlurb(kind: EncounterKind | undefined, isWar: boolean): string {
  if (kind === 'comercial') return 'Comboio comercial. Há uma aba para comprar e outra para vender, e a venda sai acima da tabela.';
  if (kind === 'diplomatico') return 'Envio diplomático. Há um contrato, se você quiser aceitar.';
  if (kind === 'inimigos') return 'Essa facção já o trata como inimigo. A reputação está em -10 ou pior. Não há comércio.';
  if (kind === 'guerra' || isWar) return 'Essa facção está em guerra com a sua. O combate é imediato.';
  if (kind === 'cacada') return 'O alvo da sua missão de combate está neste sistema.';
  return 'Comboio aguardando resposta.';
}

const GEAR_PLACE: Record<EncounterGearCategory, string> = {
  weapon: 'Arma instalada',
  shield: 'Escudo instalado',
  jumpDrive: 'Motor de salto',
  extractor: 'Extrator instalado',
  utility: 'Utilidade instalada',
  suit: 'Traje instalado',
};

function gearStillInstalled(ship: OwnedShip | undefined, offer: Extract<EncounterSellOffer, { kind: 'instalado' }>): boolean {
  if (!ship) return false;
  if (offer.category === 'weapon') return ship.weaponId === offer.itemId;
  if (offer.category === 'shield') return ship.shieldIds[offer.slotIndex] === offer.itemId;
  if (offer.category === 'extractor') return ship.extractorIds[offer.slotIndex] === offer.itemId;
  if (offer.category === 'utility') return ship.utilityIds[offer.slotIndex] === offer.itemId;
  if (offer.category === 'suit') return ship.suitGearIds[offer.slotIndex] === offer.itemId;
  return false;
}

interface EncounterModalProps {
  encounter: EncounterState;
  campaign: PlayerCampaignState;
  onStartCombat: () => void;
  onPassPeacefully: () => void;
  onBuyResource: (resourceId: string, qty: number, totalCost: number) => void;
  onSellResource: (resourceId: string, qty: number, unitPrice: number) => void;
  onSellInstalled: (category: EncounterGearCategory, itemId: string, slotIndex: number, price: number) => void;
  onAcceptMission: () => void;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  encounter,
  campaign,
  onStartCombat,
  onPassPeacefully,
  onBuyResource,
  onSellResource,
  onSellInstalled,
  onAcceptMission,
}) => {
  const [tradeTab, setTradeTab] = useState<'comprar' | 'vender'>('comprar');
  const fac = FACTIONS_BY_ID[encounter.factionId];
  const sp = fac ? SPECIES_BY_ID[fac.speciesId] : SPECIES_BY_ID['solarianos'];
  const bonuses = computeCrewBonuses(campaign);
  const neededResources = neededResourceIds(campaign);
  const activeShip = campaign.ships.find((s) => s.uid === campaign.activeShipUid) ?? campaign.ships[0];
  const shipStats = computeShipDerivedStats(activeShip, bonuses);
  const cargoFree = Math.max(0, shipStats.cargoCapacity - compartmentUsed(campaign, activeShip));
  const renown = campaign.factionRenown[encounter.factionId] ?? 0;
  const techStyle = getLevelStyle(encounter.techLevel, 'tech');

  const kind = encounter.kind;
  const isCombatOnly = kind
    ? kind === 'inimigos' || kind === 'guerra' || kind === 'cacada'
    : Boolean(encounter.forcedCombat || encounter.isWarEncounter);
  const kindBadge = kind ? KIND_BADGE[kind] : encounter.isWarEncounter ? KIND_BADGE.guerra : null;
  const renownTier = getRenownTierName(renown, campaign.formalAlliances.includes(encounter.factionId));
  const facColor = fac?.color ?? '#38bdf8';
  const winColor =
    encounter.winChancePct >= 65
      ? 'bg-emerald-500'
      : encounter.winChancePct >= 40
      ? 'bg-amber-400'
      : 'bg-rose-500';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3">
      <div
        className={`w-full bg-[#090e1a] border rounded-2xl p-4 shadow-2xl space-y-3 ${
          isCombatOnly ? 'max-w-3xl' : 'max-w-5xl'
        }`}
        style={{
          borderColor: `${facColor}99`,
          backgroundImage: `linear-gradient(145deg, ${facColor}24 0%, rgba(9,14,26,0.97) 42%, rgba(9,14,26,1) 100%)`,
          boxShadow: `0 20px 60px -15px ${facColor}33`,
        }}
      >
        {/* Horizontal Header + Tactical Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-3 items-stretch">
          {/* Left: Commander & Encounter Summary */}
          <div
            className="flex items-start gap-3 bg-slate-950/75 border rounded-xl p-3"
            style={{ borderColor: `${facColor}66` }}
          >
            <CreatureCard
              cardId={`species_${sp.id}`}
              kind="species"
              name={sp.name}
              lifeFormId={sp.lifeFormId}
              description={fac?.name ?? 'Patrulha'}
              sizeClass="w-16 h-16"
              allowAiGeneration={false}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium flex flex-wrap items-center gap-1.5" style={{ color: fac?.color ?? '#38bdf8' }}>
                <span>Sua reputação com essa facção: {renown} ({renownTier})</span>
                {fac && (
                  <span className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[10px]">
                    {fac.axis} · {isFactionConservative(fac) ? 'Conservadora' : 'Integradora'}
                  </span>
                )}
                {kindBadge && (
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${kindBadge.className}`}>
                    {kindBadge.label}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono-tabular ${techStyle.badge}`}>
                  Tec Combate Nv {encounter.techLevel}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-white mt-0.5 truncate">
                {encounter.enemyName} ({encounter.enemies.length}{' '}
                {encounter.enemies.length === 1 ? 'nave' : 'naves'})
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {encounterBlurb(kind, Boolean(encounter.isWarEncounter))}
              </p>
              <div className="text-[10px] text-cyan-300/90 mt-0.5 truncate">
                Origem: {encounter.techReason}
              </div>
            </div>
          </div>

          {/* Right: Tactical Estimation & Ships */}
          <div
            className="bg-slate-950/90 border rounded-xl p-3 flex flex-col justify-between gap-2"
            style={{ borderColor: `${facColor}55` }}
          >
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-slate-400 font-medium flex items-center gap-1.5 truncate">
                <Crosshair className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                Sua nave: {shipStats.combatScore} pts
              </span>
              <span className="font-mono-tabular font-bold text-white shrink-0">
                {encounter.winChancePct}% · {encounter.tacticalRating}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${winColor} transition-all`} style={{ width: `${encounter.winChancePct}%` }} />
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-300">
              {encounter.enemies.map((e) => (
                <span
                  key={e.id}
                  className="font-mono-tabular bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5"
                >
                  {e.name} (Nv {e.techLevel}): Casco {Math.round(e.hull)} / Esc. {Math.round(e.shield)} · {DAMAGE_TYPE_LABELS[e.damageType]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Peaceful Encounter Trade & Mission Offer (Strictly hidden on War/Forced Combat) */}
        {!isCombatOnly && (encounter.tradeOffer || encounter.missionOffer) && (
          <div
            className={`border-t pt-3 ${
              encounter.tradeOffer && encounter.missionOffer ? 'grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3' : 'space-y-3'
            }`}
            style={{ borderColor: `${facColor}44` }}
          >
            {/* Left Trade Column */}
            {encounter.tradeOffer && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold gap-2" style={{ color: facColor }}>
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Comércio em trânsito</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono-tabular flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5 text-sky-400" />
                    Compartimento livre: {cargoFree} unidades
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTradeTab('comprar')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      tradeTab === 'comprar' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-700'
                    }`}
                  >
                    Comprar
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeTab('vender')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      tradeTab === 'vender' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-700'
                    }`}
                  >
                    Vender
                  </button>
                </div>

                {tradeTab === 'comprar' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {encounter.tradeOffer.resources.map((offer) => {
                      const res = RESOURCES_BY_ID[offer.resourceId];
                      const rStyle = res ? RARITY_STYLES[res.rarity] : RARITY_STYLES.comum;
                      const finalPrice = offer.price;
                      const canAfford = campaign.credits >= finalPrice;
                      const diffPct = res ? tableDeltaPct(finalPrice, res.basePrice) : 0;
                      return (
                        <div
                          key={offer.resourceId}
                          className={`bg-slate-900/90 border rounded-xl p-2 text-xs flex flex-col justify-between gap-1.5 ${rStyle.border}`}
                        >
                          <div className="flex items-center gap-2">
                            {res && <ResourceSprite resourceId={res.id} size={28} />}
                            <div className="min-w-0 flex-1">
                              <div className={`font-semibold text-[11px] truncate ${rStyle.text}`}>{res?.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono-tabular">
                                Estoque: {offer.qty} ·{' '}
                                <span className={diffPct < 0 ? 'text-emerald-400' : diffPct > 0 ? 'text-rose-400' : 'text-slate-300'}>
                                  {formatTablePct(diffPct)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford || offer.qty <= 0 || cargoFree <= 0}
                            onClick={() => onBuyResource(offer.resourceId, 1, finalPrice)}
                            className={`py-1 px-2 rounded-lg text-[10px] font-semibold cursor-pointer ${
                              canAfford && offer.qty > 0 && cargoFree > 0
                                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {offer.qty <= 0
                              ? 'Esgotado'
                              : cargoFree <= 0
                              ? 'Compartimento cheio'
                              : !canAfford
                              ? 'Faltam créditos'
                              : `Comprar 1 por ${finalPrice} créditos`}
                          </button>
                          {res && neededResources.has(res.id) ? (
                            <div className="text-right text-[10px] font-semibold text-amber-300">você precisa disso</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">O comerciante paga acima da tabela nestes dois itens.</p>
                    {(encounter.tradeOffer.sellOffers ?? []).length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Nada para vender agora. Sem peça instalada disponível e sem recurso raro no compartimento.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {(encounter.tradeOffer.sellOffers ?? []).map((offer) => {
                          if (offer.kind === 'recurso') {
                            const res = RESOURCES_BY_ID[offer.resourceId];
                            const held = campaign.cargo.find((entry) => entry.resourceId === offer.resourceId)?.qty ?? 0;
                            const rStyle = res ? RARITY_STYLES[res.rarity] : RARITY_STYLES.comum;
                            const diffPct = res ? tableDeltaPct(offer.price, res.basePrice) : 0;
                            const needed = res ? neededResources.has(res.id) : false;
                            return (
                              <div
                                key={`recurso-${offer.resourceId}`}
                                className={`bg-slate-900/90 border rounded-xl p-2 text-xs flex flex-col gap-1.5 ${rStyle.border}`}
                              >
                                <div className="flex items-center gap-2">
                                  {res && <ResourceSprite resourceId={res.id} size={28} />}
                                  <div className="min-w-0 flex-1">
                                    <div className={`font-semibold text-[11px] truncate ${rStyle.text}`}>{res?.name ?? 'Recurso'}</div>
                                    <div className="text-[10px] text-slate-400 font-mono-tabular">
                                      No compartimento: {held} ·{' '}
                                      <span className="text-emerald-400">{formatTablePct(diffPct)}</span>
                                    </div>
                                  </div>
                                </div>
                                {held <= 0 ? (
                                  <div className="text-[10px] text-slate-500">Sem estoque</div>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    <button
                                      type="button"
                                      onClick={() => onSellResource(offer.resourceId, 1, offer.price)}
                                      className="py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-semibold cursor-pointer"
                                    >
                                      Vender 1 por {offer.price} créditos
                                    </button>
                                    {held > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => onSellResource(offer.resourceId, held, offer.price)}
                                        className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[10px] font-semibold cursor-pointer"
                                      >
                                        Vender {held} por {offer.price * held} créditos
                                      </button>
                                    )}
                                  </div>
                                )}
                                {needed ? (
                                  <div className="text-right text-[10px] font-semibold text-amber-300">você precisa disso</div>
                                ) : null}
                              </div>
                            );
                          }

                          const meta = getEquipmentMeta(offer.category, offer.itemId);
                          const rStyle = RARITY_STYLES[meta.rarity] ?? RARITY_STYLES.comum;
                          const table = encounterGearTablePrice(offer.category, offer.itemId);
                          const diffPct = table > 0 ? tableDeltaPct(offer.price, table) : 0;
                          const present = gearStillInstalled(activeShip, offer);
                          return (
                            <div
                              key={`gear-${offer.category}-${offer.slotIndex}-${offer.itemId}`}
                              className={`bg-slate-900/90 border rounded-xl p-2 text-xs flex flex-col gap-1.5 ${rStyle.border}`}
                            >
                              <div className="flex items-center gap-2">
                                <EquipmentSprite category={offer.category} itemId={offer.itemId} size={28} />
                                <div className="min-w-0 flex-1">
                                  <div className={`font-semibold text-[11px] truncate ${rStyle.text}`}>{meta.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono-tabular">
                                    {GEAR_PLACE[offer.category]} ·{' '}
                                    <span className="text-emerald-400">{formatTablePct(diffPct)}</span>
                                  </div>
                                </div>
                              </div>
                              {present ? (
                                <button
                                  type="button"
                                  onClick={() => onSellInstalled(offer.category, offer.itemId, offer.slotIndex, offer.price)}
                                  className="py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-semibold cursor-pointer"
                                >
                                  Vender por {offer.price} créditos
                                </button>
                              ) : (
                                <div className="text-[10px] text-slate-500">Vendido</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {encounter.missionOffer && (
            <div className="space-y-2 flex flex-col justify-between">
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
                  <div className="space-y-0.5 text-[11px] min-w-0">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1 truncate">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{encounter.missionOffer.title}</span>
                    </div>
                    <div className="text-slate-300 truncate">{encounter.missionOffer.description}</div>
                    <div className="text-[10px] text-amber-300 font-mono-tabular">
                      +{encounter.missionOffer.rewardCredits} créditos · +{encounter.missionOffer.rewardRenown} de reputação
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={campaign.missions.filter((m) => m.status === 'aceita').length >= 5}
                    onClick={onAcceptMission}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-[11px] shrink-0 cursor-pointer"
                  >
                    Aceitar
                  </button>
                </div>
            </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2.5 pt-2 border-t border-slate-800">
          {!isCombatOnly && (
            <button
              type="button"
              onClick={onPassPeacefully}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Handshake className="w-4 h-4 text-emerald-400" />
              Deixar Nave Seguir
            </button>
          )}
          <button
            type="button"
            onClick={onStartCombat}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            {isCombatOnly ? <ShieldAlert className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
            {isCombatOnly ? 'Engajar Combate' : 'Iniciar Combate (-Reputação)'}
          </button>
        </div>
      </div>
    </div>
  );
};
