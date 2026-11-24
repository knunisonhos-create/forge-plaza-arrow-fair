import React from 'react';
import { Swords, Handshake, ShieldAlert, ShoppingBag, FileText, Crosshair, Boxes } from 'lucide-react';
import type { EncounterKind, EncounterState, PlayerCampaignState } from '../types/game';
import { FACTIONS_BY_ID, isFactionConservative, SPECIES_BY_ID } from '../data/lifeforms';
import { RESOURCES_BY_ID } from '../data/items';
import { getRenownTierName } from '../data/narrative';
import { CreatureCard } from './CreatureCard';
import { ResourceSprite } from './SpriteArt';
import { compartmentUsed, computeCrewBonuses, computeShipDerivedStats } from '../engine/combat';
import { formatTablePct, quoteSale, tableDeltaPct } from '../engine/market';
import { neededResourceIds } from '../engine/resourceNeeds';
import { DAMAGE_TYPE_LABELS, getLevelStyle, RARITY_STYLES } from '../utils/formatting';
const KIND_BADGE: Record<EncounterKind, { label: string; className: string }> = {
  comercial: { label: 'Encontro Comercial', className: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200' },
  diplomatico: { label: 'Encontro Diplomático', className: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200' },
  inimigos: { label: 'Encontro Hostil', className: 'border-orange-500/50 bg-orange-500/15 text-orange-200' },
  guerra: { label: 'Conflito de Guerra', className: 'border-rose-500/50 bg-rose-500/15 text-rose-200' },
  cacada: { label: 'Caçada', className: 'border-amber-500/50 bg-amber-500/15 text-amber-200' },
};

function encounterBlurb(kind: EncounterKind | undefined, isWar: boolean): string {
  if (kind === 'comercial') return 'Comboio comercial. Dá para comprar e vender sem abrir fogo.';
  if (kind === 'diplomatico') return 'Envio diplomático. Há um contrato, se você quiser aceitar.';
  if (kind === 'inimigos') return 'Essa facção já o trata como inimigo. A reputação está em -10 ou pior. Não há comércio.';
  if (kind === 'guerra' || isWar) return 'Essa facção está em guerra com a sua. O combate é imediato.';
  if (kind === 'cacada') return 'O alvo da sua missão de combate está neste sistema.';
  return 'Comboio aguardando resposta.';
}

interface EncounterModalProps {
  encounter: EncounterState;
  campaign: PlayerCampaignState;
  onStartCombat: () => void;
  onPassPeacefully: () => void;
  onBuyResource: (resourceId: string, qty: number, totalCost: number) => void;
  onSellResource: (resourceId: string, qty: number) => void;
  onAcceptMission: () => void;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  encounter,
  campaign,
  onStartCombat,
  onPassPeacefully,
  onBuyResource,
  onSellResource,
  onAcceptMission,
}) => {
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

  const offerBuyPriceMap: Record<string, number> = {};
  encounter.tradeOffer?.resources.forEach((offer) => {
    offerBuyPriceMap[offer.resourceId] = Math.max(
      2,
      Math.round(offer.price * (1 - bonuses.tradePriceBonus))
    );
  });

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
            className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3 border-t pt-3"
            style={{ borderColor: `${facColor}44` }}
          >
            {/* Left Trade Column */}
            {encounter.tradeOffer && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold" style={{ color: facColor }}>
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Comércio em Trânsito</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono-tabular flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5 text-sky-400" />
                    Compartimento livre: {cargoFree} unidades
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {encounter.tradeOffer.resources.map((offer) => {
                    const res = RESOURCES_BY_ID[offer.resourceId];
                    const rStyle = res ? RARITY_STYLES[res.rarity] : RARITY_STYLES.comum;
                    const finalPrice = offerBuyPriceMap[offer.resourceId] ?? offer.price;
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
                              Est: {offer.qty} · <span className={diffPct < 0 ? 'text-emerald-400' : diffPct > 0 ? 'text-rose-400' : 'text-slate-300'}>{formatTablePct(diffPct)}</span>
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
                            ? `Falta (${finalPrice})`
                            : `Comprar 1 (${finalPrice} cr)`}
                        </button>
                        {res && neededResources.has(res.id) ? (
                          <div className="text-right text-[10px] font-semibold text-amber-300">você precisa disso</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right Cargo Sell & Mission Column */}
            <div className="space-y-2 flex flex-col justify-between">
              {campaign.cargo.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400">Vender do compartimento de carga:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.cargo
                      .filter((c) => c.qty > 0 && RESOURCES_BY_ID[c.resourceId])
                      .slice()
                      .sort((a, b) => Number(neededResources.has(b.resourceId)) - Number(neededResources.has(a.resourceId)))
                      .slice(0, 4)
                      .map((c) => {
                      const res = RESOURCES_BY_ID[c.resourceId];
                      if (!res || c.qty <= 0) return null;
                      const rStyle = RARITY_STYLES[res.rarity] ?? RARITY_STYLES.comum;
                      const quote = quoteSale(res.basePrice, 'sistema', bonuses.tradePriceBonus, 0, 1, false);
                      const sellPct = tableDeltaPct(quote.nextUnit, res.basePrice);
                      const needed = neededResources.has(res.id);
                      return (
                        <button
                          key={c.resourceId}
                          type="button"
                          onClick={() => onSellResource(c.resourceId, 1)}
                          className={`px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border text-[10px] text-left cursor-pointer flex flex-col items-end gap-0.5 ${rStyle.border}`}
                        >
                          <span className="flex items-center gap-1.5">
                            <ResourceSprite resourceId={res.id} size={20} />
                            <span className={rStyle.text}>{res.name} ({c.qty})</span>
                            <span className={sellPct > 0 ? 'text-emerald-400' : sellPct < 0 ? 'text-rose-400' : 'text-slate-300'}>{formatTablePct(sellPct)}</span>
                            <span className="text-white font-mono-tabular font-semibold">{quote.nextUnit} créditos</span>
                          </span>
                          {needed ? (
                            <span className="text-[10px] font-semibold text-amber-300">você precisa disso</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {encounter.missionOffer && (
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
                  <div className="space-y-0.5 text-[11px] min-w-0">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1 truncate">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{encounter.missionOffer.title}</span>
                    </div>
                    <div className="text-slate-300 truncate">{encounter.missionOffer.description}</div>
                    <div className="text-[10px] text-amber-300 font-mono-tabular">
                      +{encounter.missionOffer.rewardCredits} cr · +{encounter.missionOffer.rewardRenown} Reputação
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
              )}
            </div>
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
