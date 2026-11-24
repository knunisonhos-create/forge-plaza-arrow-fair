import React, { useMemo, useState } from 'react';
import { Clock, Flag, Globe2, ShieldAlert, Sparkles, Swords, Trophy, X } from 'lucide-react';
import type { PlayerCampaignState } from '../types/game';
import { FACTIONS_BY_ID } from '../data/lifeforms';
import { factionMilitaryPower, GALACTIC_CYCLE_DURATION_SEC, getFactionOwnedSystems, warAdvanceChance } from '../engine/galacticWar';
import { FactionCrest } from './SpriteArt';

interface GalacticWarPanelProps {
  campaign: PlayerCampaignState;
  onClose: () => void;
  onAdvanceCycle: () => void;
}

export const GalacticWarPanel: React.FC<GalacticWarPanelProps> = ({
  campaign,
  onClose,
  onAdvanceCycle,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'cronicas'>('all');

  const activeShip =
    campaign.ships.find((s) => s.uid === campaign.activeShipUid) ?? campaign.ships[0];
  const pilotedFactionId = activeShip?.factionId ?? campaign.chosenFactionId;
  const pilotedFac = FACTIONS_BY_ID[pilotedFactionId];

  const military = useMemo(() => {
    const ids = new Set<string>();
    for (const war of campaign.galacticWars) {
      ids.add(war.factionAId);
      ids.add(war.factionBId);
    }
    const map: Record<string, number> = {};
    for (const id of ids) {
      map[id] = factionMilitaryPower(id, campaign);
    }
    return map;
  }, [campaign]);

  const ownedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (pilotedFactionId) {
      counts[pilotedFactionId] = getFactionOwnedSystems(pilotedFactionId, campaign).length;
    }
    for (const w of campaign.galacticWars) {
      if (counts[w.factionAId] === undefined) {
        counts[w.factionAId] = getFactionOwnedSystems(w.factionAId, campaign).length;
      }
      if (counts[w.factionBId] === undefined) {
        counts[w.factionBId] = getFactionOwnedSystems(w.factionBId, campaign).length;
      }
    }
    return counts;
  }, [campaign, pilotedFactionId]);

  const sortedWars = useMemo(() => {
    const list = [...campaign.galacticWars];
    list.sort((a, b) => {
      const aMine = a.factionAId === pilotedFactionId || a.factionBId === pilotedFactionId ? 1 : 0;
      const bMine = b.factionAId === pilotedFactionId || b.factionBId === pilotedFactionId ? 1 : 0;
      if (bMine !== aMine) return bMine - aMine;
      return Math.abs(b.score - 50) - Math.abs(a.score - 50);
    });
    return list;
  }, [campaign.galacticWars, pilotedFactionId]);

  const myWarsCount = useMemo(
    () =>
      sortedWars.filter(
        (w) => w.factionAId === pilotedFactionId || w.factionBId === pilotedFactionId
      ).length,
    [sortedWars, pilotedFactionId]
  );

  const visibleWars = useMemo(() => {
    if (filterMode === 'mine') {
      return sortedWars.filter(
        (w) => w.factionAId === pilotedFactionId || w.factionBId === pilotedFactionId
      );
    }
    return sortedWars;
  }, [sortedWars, pilotedFactionId, filterMode]);

  const cyclePct = Math.min(
    100,
    Math.round((campaign.cycleElapsedSec / GALACTIC_CYCLE_DURATION_SEC) * 100)
  );
  const remainingSec = Math.max(
    0,
    Math.ceil(GALACTIC_CYCLE_DURATION_SEC - campaign.cycleElapsedSec)
  );
  const remainingMin = Math.floor(remainingSec / 60);
  const remainingRemSec = remainingSec % 60;
  const remainingLabel = `${String(remainingMin).padStart(2, '0')}:${String(remainingRemSec).padStart(2, '0')}`;

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 bg-[#060a14] border-l border-slate-800 text-slate-100 select-none overflow-hidden">
      {/* CARD 1: Fixed Non-Minimizable Hero & Cycle Telemetry Card */}
      <section className="shrink-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-400" />
              <h2 className="font-display text-lg font-bold text-white">Guerra Galáctica</h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cada frente lista o poderio militar: planetas de nível 3, 4 e 5, mais a tecnologia de cada um. Trinta por cento da chance de avanço sai desse número.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
            title="Fechar painel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Piloted Ship Active Faction Highlight Banner */}
        {pilotedFac && (
          <div
            className="rounded-xl px-3 py-2 border flex items-center justify-between gap-2"
            style={{
              borderColor: `${pilotedFac.color}88`,
              backgroundColor: `${pilotedFac.color}18`,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FactionCrest color={pilotedFac.color} axis={pilotedFac.axis} size={30} />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-300">
                  Nave Pilotada · Facção em Destaque
                </div>
                <div className="text-xs font-bold truncate" style={{ color: pilotedFac.color }}>
                  {pilotedFac.name}
                </div>
              </div>
            </div>
            <div className="text-right font-mono-tabular text-[11px] shrink-0">
              <div className="text-white font-semibold">{ownedCounts[pilotedFac.id] ?? 0} sistemas</div>
              <div className="text-[10px] text-slate-300">{myWarsCount} {myWarsCount === 1 ? 'guerra' : 'guerras'}</div>
            </div>
          </div>
        )}

        {/* Cycle Countdown Bar */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-white">
                Ciclo Galáctico <span className="font-mono-tabular text-cyan-300">#{campaign.galacticCycle}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono-tabular">{remainingLabel}</span>
              <button
                type="button"
                onClick={onAdvanceCycle}
                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-[11px] cursor-pointer"
              >
                Avançar Ciclo
              </button>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all"
              style={{ width: `${cyclePct}%` }}
            />
          </div>
        </div>
      </section>

      {/* CARD 2: Filter / Tab Bar Card */}
      <section className="shrink-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
            filterMode === 'all'
              ? 'bg-rose-500 text-white font-semibold'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          Todas as Frentes ({campaign.galacticWars.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('mine')}
          className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
            filterMode === 'mine'
              ? 'bg-amber-400 text-slate-950 font-semibold'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          Minha Facção ({myWarsCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('cronicas')}
          className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors flex items-center gap-1 ${
            filterMode === 'cronicas'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          Crônicas ({campaign.warHistory.length})
        </button>
      </section>

      {/* CARD 3: Scrollable Active Content Card */}
      <section className="flex-1 min-h-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-3.5 overflow-y-auto space-y-3">
        {filterMode === 'cronicas' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Flag className="w-3.5 h-3.5" />
              <span>Crônicas de Fronteira & Conquistas</span>
            </div>
            {campaign.warHistory.length === 0 ? (
              <div className="text-xs text-slate-400 italic bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-center">
                Nenhuma conquista ou colonização registrada ainda.
              </div>
            ) : (
              <div className="space-y-1.5">
                {campaign.warHistory.slice(0, 30).map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-slate-950/85 border border-slate-800 rounded-xl px-3 py-2 text-[11px] flex items-start gap-2"
                  >
                    {entry.kind === 'colonizacao' ? (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-mono-tabular text-[10px] text-cyan-400 mr-1.5">
                        [Ciclo {entry.cycle}]
                      </span>
                      <span className="text-slate-200">{entry.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : visibleWars.length === 0 ? (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-6 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">
              {filterMode === 'mine'
                ? 'A facção da nave pilotada está em paz no momento.'
                : 'Nenhuma frente de guerra ativa no momento.'}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleWars.map((war) => {
              const facA = FACTIONS_BY_ID[war.factionAId];
              const facB = FACTIONS_BY_ID[war.factionBId];
              if (!facA || !facB) return null;

              const sysCountA = ownedCounts[war.factionAId] ?? 0;
              const sysCountB = ownedCounts[war.factionBId] ?? 0;
              const involvesPlayer =
                war.factionAId === pilotedFactionId || war.factionBId === pilotedFactionId;

              const chanceA = warAdvanceChance(military[war.factionAId] ?? 0, military[war.factionBId] ?? 0);
              const chanceB = 1 - chanceA;
              const score = Math.max(0, Math.min(100, war.score));
              const leaderText =
                score > 50
                  ? `Ofensiva de ${facA.name}`
                  : score < 50
                  ? `Ofensiva de ${facB.name}`
                  : 'Frente equilibrada';

              const advancerFac =
                typeof war.lastDelta === 'number' && war.lastDelta !== 0
                  ? war.lastDelta > 0
                    ? facA
                    : facB
                  : null;

              const leftPct = Math.max(0, Math.min(100, 100 - score));
              const rightPct = 100 - leftPct;

              return (
                <div
                  key={war.id}
                  className="bg-slate-950/85 border rounded-xl p-3 space-y-2.5"
                  style={{
                    borderColor: involvesPlayer
                      ? `${pilotedFac?.color ?? '#fbbf24'}99`
                      : 'rgb(30 41 59)',
                  }}
                >
                  {involvesPlayer && (
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span
                        className="px-2 py-0.5 rounded border"
                        style={{
                          color: pilotedFac?.color ?? '#fbbf24',
                          borderColor: `${pilotedFac?.color ?? '#fbbf24'}66`,
                          backgroundColor: `${pilotedFac?.color ?? '#fbbf24'}1a`,
                        }}
                      >
                        Facção da Nave Pilotada
                      </span>
                      <span className="text-slate-400">Frente Prioritária</span>
                    </div>
                  )}

                  {/* Faction VS Header */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FactionCrest color={facB.color} axis={facB.axis} size={30} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate" style={{ color: facB.color }}>
                          {facB.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-tabular flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-0.5">
                            <Globe2 className="w-3 h-3 text-slate-500" />
                            {sysCountB}
                          </span>
                          <span className="text-amber-200">Poderio militar {military[war.factionBId] ?? 0}</span>
                          <span className="inline-flex items-center gap-0.5 text-amber-300">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            {war.capturesB}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono-tabular font-bold text-rose-400">
                      ×
                    </div>

                    <div className="flex items-center justify-end gap-2 min-w-0 text-right">
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate" style={{ color: facA.color }}>
                          {facA.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-tabular flex flex-wrap items-center justify-end gap-1.5">
                          <span className="inline-flex items-center gap-0.5 text-amber-300">
                            {war.capturesA}
                            <Trophy className="w-3 h-3 text-amber-400" />
                          </span>
                          <span className="text-amber-200">Poderio militar {military[war.factionAId] ?? 0}</span>
                          <span className="inline-flex items-center gap-0.5">
                            {sysCountA}
                            <Globe2 className="w-3 h-3 text-slate-500" />
                          </span>
                        </div>
                      </div>
                      <FactionCrest color={facA.color} axis={facA.axis} size={30} />
                    </div>
                  </div>

                  {/* Frontline Tug-of-War Bar */}
                  <div className="space-y-1">
                    <div className="relative w-full h-4 rounded-full bg-slate-900 border border-slate-700/90 overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${leftPct}%`, backgroundColor: facB.color }}
                      />
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${rightPct}%`, backgroundColor: facA.color }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)] -translate-x-1/2 transition-all duration-300"
                        style={{ left: `${leftPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-mono-tabular font-semibold" style={{ color: facB.color }}>
                        {leftPct}% · avanço {Math.round(chanceB * 100)}%
                      </span>
                      <span className="text-slate-200 font-medium truncate">{leaderText}</span>
                      <span className="font-mono-tabular font-semibold" style={{ color: facA.color }}>
                        avanço {Math.round(chanceA * 100)}% · {rightPct}%
                      </span>
                    </div>
                  </div>

                  {advancerFac && typeof war.lastDelta === 'number' && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between bg-slate-900/75 border border-slate-800 rounded-lg px-2.5 py-1">
                      <span className="truncate">{war.lastSummary ?? leaderText}</span>
                      <span
                        className="font-mono-tabular font-semibold shrink-0 ml-2"
                        style={{ color: advancerFac.color }}
                      >
                        +{Math.abs(war.lastDelta)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
