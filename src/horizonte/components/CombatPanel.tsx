import React, { useState } from 'react';
import {
  Compass,
  Flag,
  Heart,
  Shield,
  Sparkles,
  Swords,
  Wind,
  X,
} from 'lucide-react';
import type { ActiveEnemy, OwnedShip, WeaponDamageType } from '../types/game';
import type { CrewBonuses } from '../engine/combat';
import { FACTIONS_BY_ID } from '../data/lifeforms';
import { CONSUMABLES_BY_ID, HULLS_BY_ID } from '../data/items';
import { SPECIAL_ABILITIES_BY_ID } from '../data/originPerks';
import { EquipmentSprite, HullSprite } from './SpriteArt';

export interface FleeState {
  active: boolean;
  elapsedSec: number;
  durationSec: number;
  chancePct: number;
}

export interface FleePreview {
  chancePct: number;
  speedFactor: number;
  cloakFactor: number;
  racePilotBonus: number;
  threatPenalty: number;
}

interface CombatPanelProps {
  activeShip: OwnedShip;
  maxHull: number;
  maxShield: number;
  bonuses: CrewBonuses;
  activeEnemies: ActiveEnemy[];
  consumables: Record<string, number>;
  specialAbilityIds: string[];
  abilityCooldowns: Record<string, number>;
  gameTimeSeconds: number;
  fleeState: FleeState | null;
  fleePreview: FleePreview;
  onUseConsumable: (consumableId: string) => void;
  onTriggerAbility: (abilityId: string) => void;
  onStartFlee: () => void;
  onClose?: () => void;
}

type CombatTab = 'arsenal' | 'habilidades' | 'fuga';

const DAMAGE_TYPE_LABEL: Record<WeaponDamageType, { label: string; cls: string }> = {
  laser: { label: 'Laser', cls: 'text-cyan-300 border-cyan-500/35 bg-cyan-950/50' },
  cinetica: { label: 'Cinética', cls: 'text-amber-300 border-amber-500/35 bg-amber-950/50' },
  plasma: { label: 'Plasma', cls: 'text-fuchsia-300 border-fuchsia-500/35 bg-fuchsia-950/50' },
  missil: { label: 'Míssil', cls: 'text-rose-300 border-rose-500/35 bg-rose-950/50' },
};

export const CombatPanel: React.FC<CombatPanelProps> = ({
  activeShip,
  maxHull,
  maxShield,
  bonuses,
  activeEnemies,
  consumables,
  specialAbilityIds,
  abilityCooldowns,
  gameTimeSeconds,
  fleeState,
  fleePreview,
  onUseConsumable,
  onTriggerAbility,
  onStartFlee,
  onClose,
}) => {
  const [tab, setTab] = useState<CombatTab>('arsenal');

  const hullDef = HULLS_BY_ID[activeShip.hullId];
  const shipFac = activeShip.factionId ? FACTIONS_BY_ID[activeShip.factionId] : undefined;
  const shipColor = activeShip.color ?? shipFac?.color ?? hullDef?.color ?? '#38bdf8';

  const hullPct = maxHull > 0 ? Math.max(0, Math.min(100, (activeShip.currentHull / maxHull) * 100)) : 0;
  const shieldPct =
    maxShield > 0 ? Math.max(0, Math.min(100, (activeShip.currentShield / maxShield) * 100)) : 0;

  const hullColorClass =
    hullPct > 55 ? 'bg-emerald-400' : hullPct > 28 ? 'bg-amber-400' : 'bg-rose-500';

  const repairQty = consumables['kit_reparo'] ?? 0;
  const shieldQty = consumables['escudo_descartavel'] ?? 0;
  const repairDef = CONSUMABLES_BY_ID['kit_reparo'];
  const shieldDef = CONSUMABLES_BY_ID['escudo_descartavel'];

  const repairAmount = Math.round((repairDef?.amount ?? 35) * bonuses.repairKitMult);
  const shieldAmount = shieldDef?.amount ?? 60;

  const hullFull = activeShip.currentHull >= maxHull - 0.05;
  const noShieldModule = maxShield <= 0;
  const shieldFull = !noShieldModule && activeShip.currentShield >= maxShield - 0.05;

  const canUseRepair = repairQty > 0 && !hullFull;
  const canUseShield = shieldQty > 0 && !noShieldModule && !shieldFull;

  const raceConsumables = Object.entries(consumables)
    .filter(([id, qty]) => qty > 0 && CONSUMABLES_BY_ID[id]?.kind === 'especial_raca')
    .map(([id, qty]) => ({ def: CONSUMABLES_BY_ID[id], qty }));

  const activeCombatAbilities = specialAbilityIds
    .map((id) => SPECIAL_ABILITIES_BY_ID[id])
    .filter((ab): ab is NonNullable<typeof ab> => Boolean(ab && ab.kind === 'combate_ativa'));

  const isFleeing = Boolean(fleeState?.active);
  const fleeProgressPct =
    fleeState && fleeState.durationSec > 0
      ? Math.min(100, Math.round((fleeState.elapsedSec / fleeState.durationSec) * 100))
      : 0;
  const fleeRemSec = fleeState ? Math.max(0, fleeState.durationSec - fleeState.elapsedSec) : 5;

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 bg-[#060a14] border-l border-slate-800 text-slate-100 select-none overflow-hidden">
      {/* CARD 1: Non-minimizable Combat Integrity & Flee Telemetry Card */}
      <section className="shrink-0 bg-[#0b1222] border border-rose-500/45 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <HullSprite hullId={activeShip.hullId} size={42} colorOverride={shipColor} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Swords className="w-4 h-4 text-rose-400 shrink-0" />
                <h2 className="font-display text-base sm:text-lg font-bold text-white truncate">
                  Combate Ativo
                </h2>
                <span className="px-2 py-0.5 rounded border border-rose-500/45 bg-rose-950/60 text-rose-200 text-[10px] font-mono-tabular font-semibold">
                  {activeEnemies.length} {activeEnemies.length === 1 ? 'inimigo' : 'inimigos'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="font-semibold text-white truncate">{activeShip.customName}</span>
                {shipFac && (
                  <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: shipColor }}>
                    <Flag className="w-3 h-3" />
                    {shipFac.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
              title="Minimizar painel lateral"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Player Ship Bars */}
        <div className="grid grid-cols-2 gap-2.5 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Heart className="w-3.5 h-3.5 text-emerald-400" />
                Seu Casco
              </span>
              <span className="font-mono-tabular font-semibold text-white">
                {Math.max(0, Math.ceil(activeShip.currentHull))}/{maxHull}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div className={`h-full transition-all duration-150 ${hullColorClass}`} style={{ width: `${hullPct}%` }} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Seu Escudo
              </span>
              <span className="font-mono-tabular font-semibold text-cyan-200">
                {noShieldModule
                  ? 'Sem módulo'
                  : `${Math.max(0, Math.ceil(activeShip.currentShield))}/${maxShield}`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all duration-150" style={{ width: `${shieldPct}%` }} />
            </div>
          </div>
        </div>

        {/* Active 5s Flee Progress Banner */}
        {isFleeing && fleeState && (
          <div className="bg-amber-950/55 border border-amber-500/60 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-200 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-amber-400" />
                Manobras Evasivas Entre Planetas & Asteroides
              </span>
              <span className="font-mono-tabular font-bold text-amber-300">
                {fleeRemSec.toFixed(1)}s · {fleeState.chancePct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-amber-500/40 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${fleeProgressPct}%` }}
              />
            </div>
            <div className="text-[10px] text-amber-200/80">
              Armas suspensas — desviando do fogo inimigo até concluir os 5 segundos de fuga.
            </div>
          </div>
        )}

        {/* Enemies Compact Roster */}
        <div className="max-h-36 overflow-y-auto pr-1 space-y-1.5">
          {activeEnemies.map((enemy) => {
            const faction = FACTIONS_BY_ID[enemy.factionId];
            const eHullPct =
              enemy.maxHull > 0 ? Math.max(0, Math.min(100, (enemy.hull / enemy.maxHull) * 100)) : 0;
            const eShieldPct =
              enemy.maxShield > 0
                ? Math.max(0, Math.min(100, (enemy.shield / enemy.maxShield) * 100))
                : 0;
            const dmgMeta = DAMAGE_TYPE_LABEL[enemy.damageType] ?? DAMAGE_TYPE_LABEL.laser;

            return (
              <div
                key={enemy.id}
                className="rounded-xl bg-slate-950/85 border border-slate-800 px-2.5 py-2 space-y-1"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: faction?.color ?? '#f43f5e' }}
                    />
                    <span className="font-semibold text-white truncate">{enemy.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono-tabular shrink-0">
                      Nv {enemy.techLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {faction && (
                      <span className="text-[10px] truncate max-w-[130px]" style={{ color: faction.color }}>
                        {faction.name}
                      </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${dmgMeta.cls}`}>
                      {dmgMeta.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-rose-300">Casco</span>
                      <span className="font-mono-tabular text-slate-200">
                        {Math.max(0, Math.ceil(enemy.hull))}/{enemy.maxHull}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div className="h-full bg-rose-500 transition-all duration-150" style={{ width: `${eHullPct}%` }} />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-sky-300">Escudo</span>
                      <span className="font-mono-tabular text-sky-200">
                        {enemy.maxShield > 0
                          ? `${Math.max(0, Math.ceil(enemy.shield))}/${enemy.maxShield}`
                          : 'Sem escudo'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div className="h-full bg-sky-400 transition-all duration-150" style={{ width: `${eShieldPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CARD 2: Tab Bar + Instant Flee Button */}
      <section className="shrink-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setTab('arsenal')}
            className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
              tab === 'arsenal'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            Consumíveis & Uso Rápido
          </button>
          <button
            type="button"
            onClick={() => setTab('habilidades')}
            className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors flex items-center gap-1 ${
              tab === 'habilidades'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Habilidades ({activeCombatAbilities.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('fuga')}
            className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors flex items-center gap-1 ${
              tab === 'fuga'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Tática de Fuga
          </button>
        </div>

        <button
          type="button"
          disabled={isFleeing}
          onClick={onStartFlee}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
            isFleeing
              ? 'bg-amber-500/25 border border-amber-500/60 text-amber-200 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          {isFleeing
            ? `Fugindo (${fleeRemSec.toFixed(1)}s)`
            : `Fugir (5s · ${fleePreview.chancePct}%)`}
        </button>
      </section>

      {/* CARD 3: Scrollable Active Tab Content */}
      <section className="flex-1 min-h-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-3.5 overflow-y-auto space-y-3 text-xs">
        {tab === 'arsenal' && (
          <>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Consumíveis Instantâneos de Combate
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canUseRepair}
                onClick={() => onUseConsumable('kit_reparo')}
                className={`min-h-[54px] flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
                  canUseRepair
                    ? 'bg-emerald-950/50 border-emerald-500/60 hover:bg-emerald-900/60 text-white cursor-pointer'
                    : 'bg-slate-950/80 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <EquipmentSprite category="consumable" itemId="kit_reparo" size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 font-semibold">
                    <span className="truncate">Kit de Reparo</span>
                    <span className="font-mono-tabular text-emerald-300 shrink-0">×{repairQty}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {repairQty <= 0 ? 'Sem estoque' : hullFull ? 'Casco cheio' : `+${repairAmount} Casco imediato`}
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={!canUseShield}
                onClick={() => onUseConsumable('escudo_descartavel')}
                className={`min-h-[54px] flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
                  canUseShield
                    ? 'bg-cyan-950/50 border-cyan-500/60 hover:bg-cyan-900/60 text-white cursor-pointer'
                    : 'bg-slate-950/80 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <EquipmentSprite category="consumable" itemId="escudo_descartavel" size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 font-semibold">
                    <span className="truncate">Capacitor de Escudo</span>
                    <span className="font-mono-tabular text-cyan-300 shrink-0">×{shieldQty}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {shieldQty <= 0
                      ? 'Sem estoque'
                      : noShieldModule
                      ? 'Sem módulo de escudo'
                      : shieldFull
                      ? 'Escudo cheio'
                      : `+${shieldAmount} Escudo imediato`}
                  </div>
                </div>
              </button>
            </div>

            {raceConsumables.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
                  Consumíveis Exclusivos da Raça
                </div>
                <div className="space-y-1.5">
                  {raceConsumables.map(({ def, qty }) => (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => onUseConsumable(def.id)}
                      className="w-full min-h-[52px] flex items-center gap-2.5 rounded-xl border border-amber-500/50 bg-amber-950/35 hover:bg-amber-900/45 text-white px-3 py-2 text-left transition-colors cursor-pointer"
                    >
                      <EquipmentSprite category="consumable" itemId={def.id} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 font-semibold">
                          <span className="truncate text-amber-200">{def.name}</span>
                          <span className="font-mono-tabular text-amber-300 shrink-0">×{qty}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 leading-snug">{def.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeCombatAbilities.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Habilidades Especiais de Combate (Uso Instantâneo)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeCombatAbilities.map((ab) => {
                    const readyAt = abilityCooldowns[ab.id] ?? 0;
                    const remSec = Math.max(0, Math.ceil(readyAt - gameTimeSeconds));
                    const isReady = remSec <= 0;
                    return (
                      <button
                        key={ab.id}
                        type="button"
                        disabled={!isReady}
                        onClick={() => onTriggerAbility(ab.id)}
                        className={`min-h-[52px] flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                          isReady
                            ? 'bg-amber-950/55 border-amber-400/60 hover:bg-amber-900/65 text-white cursor-pointer'
                            : 'bg-slate-950/80 border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{ab.name}</div>
                          <div className="text-[11px] text-amber-200/80 truncate">{ab.summary}</div>
                        </div>
                        <span className="font-mono-tabular font-bold shrink-0">
                          {isReady ? 'Usar' : `${remSec}s`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'habilidades' && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
              Arsenal de Habilidades Ativas Desbloqueadas
            </div>
            {activeCombatAbilities.length === 0 ? (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-slate-400 italic">
                Nenhuma habilidade ativa de combate desbloqueada nesta campanha. Use seus consumíveis e manobras de fuga.
              </div>
            ) : (
              activeCombatAbilities.map((ab) => {
                const readyAt = abilityCooldowns[ab.id] ?? 0;
                const remSec = Math.max(0, Math.ceil(readyAt - gameTimeSeconds));
                const isReady = remSec <= 0;
                return (
                  <div
                    key={ab.id}
                    className="bg-slate-950/85 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-white">{ab.name}</div>
                      <div className="text-[11px] text-amber-300">{ab.summary}</div>
                      <div className="text-[11px] text-slate-400">{ab.description}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!isReady}
                      onClick={() => onTriggerAbility(ab.id)}
                      className={`px-3 py-2 rounded-xl font-bold shrink-0 ${
                        isReady
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                          : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isReady ? 'Ativar' : `${remSec}s`}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'fuga' && (
          <div className="space-y-3">
            <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-amber-400" />
                  Cálculo Tático da Fuga Evasiva (5 segundos)
                </span>
                <span className="font-mono-tabular font-bold text-lg text-emerald-300">
                  {fleePreview.chancePct}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ao iniciar a fuga, sua nave interrompe todos os disparos e executa manobras bruscas em zigue-zague entre planetas, campos de meteoros e cinturões de asteroides por 5 segundos. Ao término, se passar no teste de evasão ({fleePreview.chancePct}%), você despista os inimigos e encerra o combate. Caso contrário, o combate continua.
              </p>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-tabular pt-1">
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex justify-between">
                  <span className="text-slate-400">Base de manobra:</span>
                  <span className="text-white font-semibold">+24%</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex justify-between">
                  <span className="text-slate-400">Velocidade ({hullDef?.speed ?? 14}):</span>
                  <span className="text-cyan-300 font-semibold">+{fleePreview.speedFactor}%</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex justify-between">
                  <span className="text-slate-400">Camuflagem:</span>
                  <span className="text-purple-300 font-semibold">+{fleePreview.cloakFactor}%</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex justify-between">
                  <span className="text-slate-400">Raça & Piloto:</span>
                  <span className="text-emerald-300 font-semibold">+{fleePreview.racePilotBonus}%</span>
                </div>
                <div className="col-span-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex justify-between">
                  <span className="text-rose-300">Pressão de perseguição inimiga ({activeEnemies.length} alvos):</span>
                  <span className="text-rose-300 font-semibold">-{fleePreview.threatPenalty}%</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isFleeing}
              onClick={onStartFlee}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                isFleeing
                  ? 'bg-amber-500/25 border border-amber-500/60 text-amber-200 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
              }`}
            >
              <Wind className="w-4 h-4" />
              {isFleeing
                ? `Executando Fuga... (${fleeRemSec.toFixed(1)}s restantes)`
                : `Executar Fuga Evasiva Agora (5s · ${fleePreview.chancePct}% de chance)`}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
