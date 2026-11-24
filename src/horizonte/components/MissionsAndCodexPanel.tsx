import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Dna,
  FileText,
  Globe2,
  Handshake,
  LifeBuoy,
  MessageSquare,
  Package,
  Radar,
  Scale,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Swords,
  X,
  Flag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Mission, MissionType, PlayerCampaignState, StarSystemSummary } from '../types/game';
import {
  CREATURES,
  FACTIONS,
  FACTIONS_BY_ID,
  getFactionDistanceLy,
  isFactionConservative,
  LIFE_FORMS,
  LIFE_FORMS_BY_ID,
  SPECIES,
  SPECIES_BY_ID,
} from '../data/lifeforms';
import { PLANET_TYPES, PLANET_TYPES_BY_CODE } from '../data/planets';
import {
  checkMissionReadyInLocation,
  generateMissionsForFaction,
  getMissionColoredSummary,
  getRenownTierName,
} from '../data/narrative';
import { BLUEPRINTS_BY_ID, RESOURCES_BY_ID } from '../data/items';
import { RARITY_STYLES } from '../utils/formatting';
import { CreatureCard } from './CreatureCard';
import { CodexDossier, type CodexDetail } from './CodexDossier';
import { ResourceSprite } from './SpriteArt';
import { SPECIAL_ABILITIES } from '../data/originPerks';
import {
  CONSUMABLES,
  EXTRACTORS,
  HULLS,
  JUMP_DRIVES,
  RESOURCES,
  SHIELDS,
  SUIT_GEAR,
  UTILITY_MODULES,
  WEAPONS,
} from '../data/items';

interface MissionsAndCodexPanelProps {
  mode: 'missions' | 'codex' | 'logbook';
  campaign: PlayerCampaignState;
  currentSystem: StarSystemSummary;
  onClose: () => void;
  onAcceptMission: (mission: Mission) => void;
  onCompleteMission: (mission: Mission) => void;
  onAbandonMission: (missionId: string) => void;
  onFormAlliance: (factionId: string) => void;
}

const MISSION_ICON: Record<MissionType, React.ReactNode> = {
  entrega_comercio: <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
  coleta_raro: <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
  escanear_planeta: <Radar className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
  escanear_criatura: <Dna className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
  contato_nivel2: <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />,
  resgate_escolta: <LifeBuoy className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
  combate: <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
  cadeia_faccao: <Compass className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
};

export function MissionCornerHud({
  campaign,
  minimized,
  onToggleMinimize,
  onOpenMission,
  className = '',
}: {
  campaign: PlayerCampaignState;
  minimized: boolean;
  onToggleMinimize: () => void;
  onOpenMission?: (mission: Mission) => void;
  className?: string;
}) {
  const accepted = campaign.missions.filter((m) => m.status === 'aceita');

  if (minimized) {
    return (
      <button
        type="button"
        onClick={onToggleMinimize}
        className={`pointer-events-auto w-full px-2 py-1.5 rounded-lg border border-slate-700/90 bg-[#090e1a]/92 text-[11px] font-semibold text-slate-200 flex items-center justify-between gap-1.5 cursor-pointer shadow-lg ${className}`}
        title="Mostrar missões"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Missões ({accepted.length}/5)</span>
        </span>
        <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>
    );
  }

  return (
    <div className={`pointer-events-auto w-full rounded-xl border border-slate-800/90 bg-[#090e1a]/92 shadow-lg ${className}`}>
      <div className="flex items-center justify-between gap-1 px-2 py-1 border-b border-slate-800/80">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <FileText className="w-3 h-3 text-emerald-400" />
          Missões
        </span>
        <button
          type="button"
          onClick={onToggleMinimize}
          title="Minimizar missões"
          className="p-0.5 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-[calc(var(--fit-h)*0.26)] overflow-y-auto px-2 py-1.5">
        {accepted.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic py-0.5">Nenhuma missão ativa.</div>
        ) : (
          <ul className="space-y-1 text-[11px]">
            {accepted.map((m) => {
              const tokens = getMissionColoredSummary(m);
              const ready = checkMissionReadyInLocation(m, campaign).ready;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onOpenMission?.(m)}
                    className="text-left hover:underline cursor-pointer flex items-start gap-1.5"
                  >
                    <span className={ready ? 'text-emerald-400' : 'text-slate-400'}>•</span>
                    <span>
                      {tokens.map((tk, i) => (
                        <span
                          key={i}
                          className={
                            tk.tone === 'item'
                              ? 'text-sky-300 font-semibold'
                              : tk.tone === 'loc'
                              ? 'text-rose-300 font-semibold'
                              : 'text-slate-200'
                          }
                        >
                          {tk.text}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export const MissionsAndCodexPanel: React.FC<MissionsAndCodexPanelProps> = ({
  mode,
  campaign,
  currentSystem,
  onClose,
  onAcceptMission,
  onCompleteMission,
  onAbandonMission,
  onFormAlliance,
}) => {
  const [missionTab, setMissionTab] = useState<'aceitas' | 'disponiveis' | 'finalizadas'>('aceitas');
  const [codexTab, setCodexTab] = useState<'faccoes' | 'especies' | 'vidas' | 'criaturas' | 'planetas' | 'itens' | 'habilidades'>('faccoes');
  const [lifeFilter, setLifeFilter] = useState<string>('all');
  const [itemQuery, setItemQuery] = useState('');
  const [itemRarity, setItemRarity] = useState('todas');
  const [detail, setDetail] = useState<CodexDetail | null>(null);

  const acceptedMissions = campaign.missions.filter((m) => m.status === 'aceita');
  const finishedMissions = campaign.missions.filter((m) => m.status === 'finalizada');

  const availableMissions = useMemo(() => {
    const facId = currentSystem.controllingFactionId ?? campaign.chosenFactionId;
    const generated = generateMissionsForFaction(facId, currentSystem, campaign, 5);
    const activeIds = new Set(campaign.missions.map((m) => m.title + m.targetSystemId));
    return generated.filter((m) => !activeIds.has(m.title + m.targetSystemId));
  }, [currentSystem, campaign]);

  const filteredCreatures = useMemo(
    () => CREATURES.filter((c) => lifeFilter === 'all' || c.lifeFormId === lifeFilter),
    [lifeFilter]
  );

  const activeShip =
    campaign.ships.find((s) => s.uid === campaign.activeShipUid) ?? campaign.ships[0];
  const pilotedFactionId = activeShip?.factionId ?? campaign.chosenFactionId;
  const pilotedFac = FACTIONS_BY_ID[pilotedFactionId];

  const sortedFactions = useMemo(() => {
    return [...FACTIONS].sort((a, b) => {
      if (a.id === pilotedFactionId) return -1;
      if (b.id === pilotedFactionId) return 1;
      const aKnown = campaign.knownFactionIds.includes(a.id) ? 1 : 0;
      const bKnown = campaign.knownFactionIds.includes(b.id) ? 1 : 0;
      if (bKnown !== aKnown) return bKnown - aKnown;
      return getFactionDistanceLy(pilotedFactionId, a.id) - getFactionDistanceLy(pilotedFactionId, b.id);
    });
  }, [pilotedFactionId, campaign.knownFactionIds]);

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 bg-[#060a14] border-l border-slate-800 text-slate-100 select-none overflow-hidden">
      {/* CARD 1: Non-minimizable Hero Card */}
      <section className="shrink-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-cyan-400 font-medium">
              {mode === 'missions'
                ? 'Contratos & Operações'
                : mode === 'codex'
                ? 'Diplomacia Galáctica & Enciclopédia'
                : 'Registros de Bordo'}
            </div>
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2 mt-0.5">
              {mode === 'missions' && <FileText className="w-4 h-4 text-cyan-400" />}
              {mode === 'codex' && <BookOpen className="w-4 h-4 text-amber-400" />}
              {mode === 'logbook' && <ScrollText className="w-4 h-4 text-emerald-400" />}
              {mode === 'missions'
                ? `Missões (${acceptedMissions.length}/5)`
                : mode === 'codex'
                ? 'Facções & Códex'
                : 'Diário de Bordo'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {pilotedFac && (
          <div
            className="rounded-xl px-3 py-1.5 border flex items-center justify-between gap-2 text-[11px]"
            style={{
              borderColor: `${pilotedFac.color}66`,
              backgroundColor: `${pilotedFac.color}16`,
            }}
          >
            <span className="flex items-center gap-1.5 font-semibold truncate" style={{ color: pilotedFac.color }}>
              <Flag className="w-3.5 h-3.5 shrink-0" />
              Nave Pilotada: {pilotedFac.name}
            </span>
            <span className="text-slate-300 text-[10px] shrink-0">{pilotedFac.axis}</span>
          </div>
        )}
      </section>

      {/* CARD 2: Navigation / Filter Tabs Card */}
      <section className="shrink-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-2">
        {mode === 'missions' && (
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setMissionTab('aceitas')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                missionTab === 'aceitas'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Aceitas ({acceptedMissions.length}/5)
            </button>
            <button
              type="button"
              onClick={() => setMissionTab('disponiveis')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                missionTab === 'disponiveis'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Disponíveis ({availableMissions.length})
            </button>
            <button
              type="button"
              onClick={() => setMissionTab('finalizadas')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                missionTab === 'finalizadas'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Finalizadas ({finishedMissions.length})
            </button>
          </div>
        )}

        {mode === 'codex' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setCodexTab('faccoes')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                codexTab === 'faccoes'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Facções (42)
            </button>
            <button
              type="button"
              onClick={() => setCodexTab('especies')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                codexTab === 'especies'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Raças (21)
            </button>
            <button
              type="button"
              onClick={() => setCodexTab('vidas')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                codexTab === 'vidas'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Formas de vida
            </button>
            <button
              type="button"
              onClick={() => setCodexTab('criaturas')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                codexTab === 'criaturas'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Fauna (140)
            </button>
            <button
              type="button"
              onClick={() => setCodexTab('planetas')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer transition-colors ${
                codexTab === 'planetas'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              Mundos ({PLANET_TYPES.length})
            </button>
            <button
              type="button"
              onClick={() => setCodexTab('itens')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer ${codexTab === 'itens' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'bg-slate-900/90 text-slate-300 border border-slate-800'}`}
            >
              Itens
            </button>
            <button
              type="button"
              onClick={() => setCodexTab('habilidades')}
              className={`py-1.5 rounded-xl font-medium cursor-pointer ${codexTab === 'habilidades' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'bg-slate-900/90 text-slate-300 border border-slate-800'}`}
            >
              Habilidades
            </button>
          </div>
        )}

        {mode === 'logbook' && (
          <div className="px-2 py-1 flex items-center justify-between text-xs text-slate-300">
            <span>Eventos recentes da expedição</span>
            <span className="font-mono-tabular text-cyan-300">{campaign.logbook.length} registros</span>
          </div>
        )}
      </section>

      {/* CARD 3: Scrollable Active Content Card */}
      <section className="flex-1 min-h-0 bg-[#0b1222] border border-slate-800 rounded-2xl p-3.5 overflow-y-auto space-y-3 text-xs">
        {mode === 'missions' && missionTab === 'aceitas' && (
          <>
            {acceptedMissions.length === 0 ? (
              <div className="text-slate-500 italic py-6 text-center">
                Nenhuma missão aceita. Veja a aba Disponíveis para contratar serviços.
              </div>
            ) : (
              acceptedMissions.map((m) => {
                const check = checkMissionReadyInLocation(m, campaign);
                const issuer = FACTIONS_BY_ID[m.issuerFactionId];
                const tokens = getMissionColoredSummary(m);
                const reqRes = m.requiredResourceId ? RESOURCES_BY_ID[m.requiredResourceId] : null;
                const reqResStyle = reqRes ? RARITY_STYLES[reqRes.rarity] : null;
                const cargoQty = m.requiredResourceId
                  ? campaign.cargo.find((c) => c.resourceId === m.requiredResourceId)?.qty ?? 0
                  : 0;
                const distLy = Math.hypot(
                  m.targetSystemCoord.x - currentSystem.x,
                  m.targetSystemCoord.y - currentSystem.y,
                  m.targetSystemCoord.z - currentSystem.z
                );
                return (
                  <div
                    key={m.id}
                    className={`bg-slate-950/90 border rounded-xl p-3 space-y-2 ${
                      check.ready ? 'border-emerald-500/50' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {MISSION_ICON[m.type]}
                          <span className="font-semibold text-white">{m.title}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                              check.ready
                                ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                                : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                            }`}
                          >
                            {check.ready ? 'Pronta' : 'Em andamento'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-mono-tabular">
                            {m.targetSystemId === currentSystem.id ? 'Neste sistema' : `${distLy.toFixed(1)} a.l.`}
                          </span>
                        </div>
                        <div className="text-[11px] pt-0.5">
                          {tokens.map((tk, i) => (
                            <span
                              key={i}
                              className={
                                tk.tone === 'item'
                                  ? 'text-sky-400 font-semibold'
                                  : tk.tone === 'loc'
                                  ? 'text-rose-400 font-semibold'
                                  : 'text-slate-300'
                              }
                            >
                              {tk.text}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAbandonMission(m.id)}
                        className="text-[11px] text-slate-400 hover:text-rose-400 underline shrink-0 cursor-pointer"
                      >
                        Abandonar
                      </button>
                    </div>

                    {reqRes && reqResStyle && (
                      <div className={`rounded-lg border p-2 text-[10px] flex items-center gap-2 bg-slate-900/70 ${reqResStyle.border}`}>
                        <ResourceSprite resourceId={reqRes.id} size={30} />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-semibold ${reqResStyle.text}`}>
                              Recurso: {reqRes.name} ({reqResStyle.label})
                            </span>
                            <span className="font-mono-tabular text-slate-200">
                              Compartimento: {cargoQty}/{m.requiredQty ?? 1} unidades
                            </span>
                          </div>
                          <div className="text-slate-400">{reqRes.description}</div>
                        </div>
                      </div>
                    )}

                    {m.rewardBlueprintId && (
                      <div className="rounded-lg border border-purple-500/40 bg-purple-950/35 px-2.5 py-1.5 text-[10px] text-purple-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                        <span>
                          Recompensa extra: <strong>{BLUEPRINTS_BY_ID[m.rewardBlueprintId]?.name ?? m.rewardItemName}</strong>
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] border-t border-slate-800 pt-2">
                      <span className="font-mono-tabular text-amber-300">
                        {m.rewardCredits} cr · +{m.rewardRenown} Reputação ({issuer?.name})
                        {m.isRivalTerritory && ' · 2,25× Risco Rival'}
                      </span>
                      <button
                        type="button"
                        disabled={!check.ready}
                        onClick={() => onCompleteMission(m)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold cursor-pointer"
                      >
                        {check.ready ? 'Concluir Entrega' : 'Ir ao Local'}
                      </button>
                    </div>
                    {!check.ready && <div className="text-[10px] text-amber-300">{check.reason}</div>}
                  </div>
                );
              })
            )}
          </>
        )}

        {mode === 'missions' && missionTab === 'disponiveis' && (
          <>
            {availableMissions.map((m) => {
              const issuer = FACTIONS_BY_ID[m.issuerFactionId];
              const tokens = getMissionColoredSummary(m);
              const reqRes = m.requiredResourceId ? RESOURCES_BY_ID[m.requiredResourceId] : null;
              const reqResStyle = reqRes ? RARITY_STYLES[reqRes.rarity] : null;
              const distLy = Math.hypot(
                m.targetSystemCoord.x - currentSystem.x,
                m.targetSystemCoord.y - currentSystem.y,
                m.targetSystemCoord.z - currentSystem.z
              );
              return (
                <div
                  key={m.id}
                  className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-white flex items-center gap-1.5 min-w-0">
                      {MISSION_ICON[m.type]}
                      <span className="truncate">{m.title}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-mono-tabular shrink-0">
                      {distLy.toFixed(1)} a.l.
                    </span>
                  </div>
                  <div className="text-[11px]">
                    {tokens.map((tk, i) => (
                      <span
                        key={i}
                        className={
                          tk.tone === 'item'
                            ? 'text-sky-400 font-semibold'
                            : tk.tone === 'loc'
                            ? 'text-rose-400 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {tk.text}
                      </span>
                    ))}
                  </div>
                  {reqRes && reqResStyle && (
                    <div className={`rounded-lg border p-2 text-[10px] flex items-center gap-2 bg-slate-900/70 ${reqResStyle.border}`}>
                      <ResourceSprite resourceId={reqRes.id} size={28} />
                      <div className="min-w-0">
                        <span className={`font-semibold ${reqResStyle.text}`}>
                          {reqRes.name} ({reqResStyle.label}) · Base {reqRes.basePrice} cr:
                        </span>{' '}
                        <span className="text-slate-400">{reqRes.description}</span>
                      </div>
                    </div>
                  )}
                  {m.rewardBlueprintId && (
                    <div className="rounded-lg border border-purple-500/40 bg-purple-950/35 px-2.5 py-1 text-[10px] text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                      <span>
                        Desbloqueia Projeto: <strong>{BLUEPRINTS_BY_ID[m.rewardBlueprintId]?.name ?? m.rewardItemName}</strong>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-mono-tabular text-amber-300">
                      {m.rewardCredits} cr · +{m.rewardRenown} Reputação ({issuer?.name})
                      {m.isRivalTerritory && ' · 2,25× Risco Rival'}
                    </span>
                    <button
                      type="button"
                      disabled={acceptedMissions.length >= 5}
                      onClick={() => onAcceptMission(m)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold cursor-pointer shrink-0"
                    >
                      {acceptedMissions.length >= 5 ? 'Limite 5/5' : 'Aceitar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {mode === 'missions' && missionTab === 'finalizadas' && (
          <>
            {finishedMissions.length === 0 ? (
              <div className="text-slate-500 italic py-6 text-center">Nenhuma missão concluída ainda.</div>
            ) : (
              finishedMissions.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{m.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{m.description}</div>
                  </div>
                  <span className="font-mono-tabular text-amber-300 shrink-0">+{m.rewardCredits} cr</span>
                </div>
              ))
            )}
          </>
        )}

        {mode === 'codex' && codexTab === 'faccoes' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-300 bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 space-y-1">
              <div>
              Aliança formal exige reputação maior que <strong className="text-cyan-300">80</strong> com aquela facção e ausência de guerra.
              Distância e facção de origem não importam.
            </div>
              <div className="text-slate-400">
                Doutrina: facções <strong className="text-amber-300">Conservadoras</strong> preservam mundos Nível 2 em suas fronteiras; facções{' '}
                <strong className="text-sky-300">Integradoras</strong> evoluem todos os mundos Nível 2 para Nível 3–4.
              </div>
            </div>
            {sortedFactions.map((fac) => {
              const isPilotedFaction = fac.id === pilotedFactionId;
              const known = isPilotedFaction || campaign.knownFactionIds.includes(fac.id);
              const dist = getFactionDistanceLy(pilotedFactionId, fac.id);
              const renown = campaign.factionRenown[fac.id] ?? 0;
              const isAllied = campaign.formalAlliances.includes(fac.id);
              const homeWars = campaign.activeWars[pilotedFactionId] ?? [];
              const staticWars = FACTIONS_BY_ID[pilotedFactionId]?.warsWith ?? [];
              const atWar = homeWars.includes(fac.id) || staticWars.includes(fac.id) || fac.warsWith.includes(pilotedFactionId);
              const tier = getRenownTierName(renown, isAllied);
              const isConservative = isFactionConservative(fac);
              const sp = SPECIES_BY_ID[fac.speciesId];
              const canAlly = fac.id !== pilotedFactionId && !isAllied && !atWar && renown > 80;

              if (!known) {
                return (
                  <div
                    key={fac.id}
                    className="bg-slate-950/50 border border-slate-800/60 rounded-lg p-2.5 flex items-center justify-between text-slate-500"
                  >
                    <span>Setor Desconhecido ({dist.toFixed(1)} a.l.)</span>
                    <span>Visite ou escaneie para revelar</span>
                  </div>
                );
              }

              return (
                <div
                  key={fac.id}
                  className="bg-slate-950/90 border rounded-xl p-3 space-y-2 cursor-pointer"
                  onClick={() => setDetail({ kind: 'faction', id: fac.id })}
                  style={
                    isPilotedFaction
                      ? {
                          borderColor: fac.color,
                          backgroundImage: `linear-gradient(135deg, ${fac.color}22 0%, rgba(2,6,23,0.96) 55%)`,
                        }
                      : { borderColor: 'rgb(30 41 59)' }
                  }
                >
                  {isPilotedFaction && (
                    <div
                      className="flex items-center justify-between text-[10px] font-bold px-2 py-1 rounded-lg border"
                      style={{
                        color: fac.color,
                        borderColor: `${fac.color}66`,
                        backgroundColor: `${fac.color}1a`,
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        Nave Pilotada · Sua Facção Ativa
                      </span>
                      <span>Em Destaque</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {sp && (
                        <CreatureCard
                          cardId={`species_${sp.id}`}
                          kind="species"
                          name={sp.name}
                          lifeFormId={sp.lifeFormId}
                          description={sp.description}
                          sizeClass="w-11 h-11"
                          allowAiGeneration={false}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fac.color }} />
                          <span className="font-semibold text-white">{fac.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${
                              isConservative
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                            }`}
                          >
                            {isConservative ? 'Conservadora (Nv 2)' : 'Integradora (Sem Nv 2)'}
                          </span>
                        </div>
                        <div className="text-[11px] text-cyan-300 mt-0.5">
                          {sp?.name} · {fac.axis} · Estilo {fac.techStyle}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-slate-400 shrink-0">{dist.toFixed(1)} a.l.</span>
                  </div>

                  <div className="text-[10px] text-slate-300 space-y-0.5 bg-slate-900/60 rounded-lg p-2 border border-slate-800/80">
                    <div>
                      <strong className="text-slate-200">Economia:</strong> {fac.economyFocus}
                    </div>
                    <div className="flex items-start gap-1">
                      <Scale className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-200">Leis & Costumes:</strong> {fac.laws}. {fac.customs}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 gap-2">
                    <span className="text-[11px] flex flex-col gap-0.5 min-w-0">
                      <span className={renown > 80 ? 'text-emerald-300 font-medium' : renown < 0 ? 'text-rose-300 font-medium' : 'text-cyan-200 font-medium'}>
                        Sua reputação com essa facção: {renown} ({tier})
                      </span>
                      {atWar && (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Em guerra com a facção da sua nave
                        </span>
                      )}
                    </span>

                    {fac.id !== pilotedFactionId && !isAllied && (
                      <button
                        type="button"
                        disabled={!canAlly}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFormAlliance(fac.id);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Handshake className="w-3 h-3" />
                        {atWar
                          ? 'Em Guerra'
                          : renown <= 80
                          ? 'Reputação acima de 80'
                          : 'Aliança Formal'}
                      </button>
                    )}
                    {isAllied && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                        <Award className="w-3.5 h-3.5" /> Aliança Formal
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {mode === 'codex' && codexTab === 'especies' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 bg-slate-950/80 border border-slate-800 rounded-lg p-2">
              Passe o mouse em qualquer retrato para gerar Pixel Art 320×320 em cache no servidor.
            </div>
            {SPECIES.map((sp) => {
              const lf = LIFE_FORMS_BY_ID[sp.lifeFormId];
              return (
                <div
                  key={sp.id}
                  className="flex items-start gap-3 bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 cursor-pointer"
                  onClick={() => setDetail({ kind: 'species', id: sp.id })}
                >
                  <CreatureCard
                    cardId={`species_${sp.id}`}
                    kind="species"
                    name={sp.name}
                    lifeFormId={sp.lifeFormId}
                    description={sp.description}
                    sizeClass="w-16 h-16"
                    allowAiGeneration={true}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-cyan-100">{sp.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 capitalize">
                        {lf?.name} · {sp.temperament}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{sp.description}</p>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {sp.traits.map((tr) => (
                        <span
                          key={tr}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          {tr}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {mode === 'codex' && codexTab === 'criaturas' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-300 font-medium">
                Catalogadas: {campaign.scannedCreatureIds.length}/140
              </span>
              <select
                value={lifeFilter}
                onChange={(e) => setLifeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px]"
              >
                <option value="all">Todas as 7 Formas de Vida</option>
                {LIFE_FORMS.map((lf) => (
                  <option key={lf.id} value={lf.id}>
                    {lf.name} (20)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {filteredCreatures.map((cr) => {
                const discovered = campaign.scannedCreatureIds.includes(cr.id);
                return (
                  <div
                    key={cr.id}
                    className={`flex items-start gap-2.5 border rounded-xl p-2.5 cursor-pointer ${
                      discovered
                        ? 'bg-slate-950/90 border-cyan-500/40'
                        : 'bg-slate-950/55 border-slate-800/70 opacity-85'
                    }`}
                    onClick={() => setDetail({ kind: 'creature', id: cr.id })}
                  >
                    <CreatureCard
                      cardId={cr.id}
                      kind="creature"
                      name={cr.name}
                      lifeFormId={cr.lifeFormId}
                      description={cr.description}
                      sizeClass="w-14 h-14"
                      allowAiGeneration={true}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-semibold flex items-center justify-between gap-1.5">
                        <span className={`truncate ${cr.rareNiche ? RARITY_STYLES.raro.text : 'text-slate-100'}`}>{cr.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {cr.rareNiche && (
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${RARITY_STYLES.raro.badge}`}>
                              Nicho Raro
                            </span>
                          )}
                          <span className="text-[10px] font-mono-tabular text-amber-300">{cr.baseValue} cr</span>
                        </div>
                      </div>
                      <div className="text-[10px] capitalize flex items-center gap-1.5 flex-wrap">
                        <span className="text-cyan-300">{cr.ecologicalRole} · {cr.size}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${
                            cr.danger === 'mortal'
                              ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                              : cr.danger === 'alto'
                              ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                              : cr.danger === 'moderado'
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                              : cr.danger === 'baixo'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 border-slate-600 text-slate-300'
                          }`}
                        >
                          Perigo {cr.danger}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 leading-snug">{cr.description}</div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1">
                        <span>Utilidade: {cr.utility}</span>
                        <span>· Mundos: {cr.preferredPlanetCodes.map((code) => PLANET_TYPES_BY_CODE[code]?.name).filter(Boolean).join(', ')}</span>
                        <span>· {discovered ? 'Catalogada' : 'Ainda não escaneada'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'codex' && codexTab === 'planetas' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-cyan-100/90 bg-slate-950/90 border border-cyan-500/30 rounded-xl p-2.5">
              Levantamentos de campo. O nome da classe é o que a tripulação fala — sem código de arquivo na frente do relato.
            </div>
            {PLANET_TYPES.map((pt) => {
              const rStyle = RARITY_STYLES[pt.rarity] ?? RARITY_STYLES.comum;
              return (
                <button
                  key={pt.code}
                  type="button"
                  onClick={() => setDetail({ kind: 'planet', id: pt.code })}
                  className={`relative w-full text-left overflow-hidden border rounded-xl cursor-pointer ${rStyle.border}`}
                >
                  <img
                    src={`/planet-covers/${pt.code}.jpg`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-45"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#050914]/95 via-[#050914]/80 to-[#050914]/35" />
                  <div className="relative p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`font-display text-base font-bold ${rStyle.text}`}>{pt.name}</span>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold capitalize ${rStyle.badge}`}>
                        {rStyle.label}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-slate-100">{pt.lifeRuleText}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pt.typicalResourceIds.map((rid) => {
                        const res = RESOURCES_BY_ID[rid];
                        if (!res) return null;
                        return (
                          <span key={rid} className={`text-[10px] font-semibold ${RARITY_STYLES[res.rarity].text}`}>
                            {res.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {mode === 'codex' && codexTab === 'vidas' && (
          <div className="space-y-2">
            {LIFE_FORMS.map((lf) => (
              <button
                key={lf.id}
                type="button"
                onClick={() => setDetail({ kind: 'life', id: lf.id })}
                className="w-full text-left bg-[#070d18] border border-cyan-500/25 rounded-xl p-3 cursor-pointer shadow-[0_0_18px_rgba(34,211,238,0.06)]"
              >
                <div className="font-display text-base font-bold" style={{ color: lf.color }}>{lf.name}</div>
                <p className="text-[12px] text-slate-200 leading-relaxed mt-1">{lf.biology}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mundos: {lf.compatiblePlanetCodes.map((code) => PLANET_TYPES_BY_CODE[code]?.name).filter(Boolean).join(', ')}
                </p>
              </button>
            ))}
          </div>
        )}

        {mode === 'codex' && codexTab === 'itens' && (
          <ItemCodex query={itemQuery} rarity={itemRarity} onQuery={setItemQuery} onRarity={setItemRarity} onOpen={setDetail} />
        )}

        {mode === 'codex' && codexTab === 'habilidades' && (
          <div className="space-y-2">
            {SPECIAL_ABILITIES.map((ab) => (
              <button
                key={ab.id}
                type="button"
                onClick={() => setDetail({ kind: 'ability', id: ab.id })}
                className="w-full text-left bg-slate-950/90 border border-slate-800 rounded-xl p-3 cursor-pointer"
              >
                <div className="font-semibold text-white">{ab.name}</div>
                <div className="text-[10px] text-cyan-300">{ab.ownerName} · {ab.kind}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{ab.summary}</p>
              </button>
            ))}
          </div>
        )}

        {mode === 'logbook' && (
          <div className="space-y-2">
            {campaign.logbook.length === 0 ? (
              <div className="text-slate-500 italic">Sem registros ainda.</div>
            ) : (
              [...campaign.logbook].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 space-y-0.5"
                >
                  <div className="text-[10px] text-cyan-400 uppercase font-mono-tabular">
                    {entry.category} · T+{Math.floor(entry.timestamp)}s
                  </div>
                  <div className="text-slate-200">{entry.text}</div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
      {detail && <CodexDossier detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};

function ItemCodex({
  query,
  rarity,
  onQuery,
  onRarity,
  onOpen,
}: {
  query: string;
  rarity: string;
  onQuery: (v: string) => void;
  onRarity: (v: string) => void;
  onOpen: (d: CodexDetail) => void;
}) {
  const rows = [
    ...WEAPONS.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, description: i.description, price: i.price, extra: `${i.dps} DPS · alcance ${i.range}` })),
    ...SHIELDS.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, description: i.description, price: i.price, extra: `Escudo ${i.capacity}` })),
    ...HULLS.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, description: i.description, price: i.price, extra: `Casco ${i.maxHull} · carga ${i.cargoCapacity}` })),
    ...JUMP_DRIVES.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, description: i.description, price: i.price, extra: `Salto ${i.jumpRangeLy}` })),
    ...EXTRACTORS.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, description: i.description, price: i.price, extra: i.extractionClass })),
    ...UTILITY_MODULES.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, description: i.description, price: i.price, extra: '' })),
    ...SUIT_GEAR.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, description: i.description, price: i.price, extra: '' })),
    ...CONSUMABLES.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity ?? 'comum', description: i.description, price: i.price, extra: '' })),
    ...RESOURCES.map((i) => ({ id: i.id, name: i.name, rarity: i.rarity, description: i.description, price: i.basePrice, extra: 'Recurso do compartimento de carga' })),
  ].filter((row) => {
    const q = query.trim().toLowerCase();
    if (rarity !== 'todas' && row.rarity !== rarity) return false;
    if (!q) return true;
    return `${row.name} ${row.description}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar item"
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs"
        />
        <select
          value={rarity}
          onChange={(e) => onRarity(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2 text-xs"
        >
          {['todas', 'comum', 'incomum', 'raro', 'épico', 'lendário', 'único'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      {rows.map((row) => (
        <button
          key={`${row.id}-${row.name}`}
          type="button"
          onClick={() => onOpen({ kind: 'item', ...row })}
          className="w-full text-left bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white">{row.name}</span>
            <span className="text-[10px] capitalize text-cyan-300">{row.rarity}</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2">{row.description}</p>
        </button>
      ))}
    </div>
  );
}
