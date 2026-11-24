import React, { useEffect, useMemo, useState } from 'react';
import {
  Radar,
  Pickaxe,
  ShoppingCart,
  Wrench,
  Users,
  MessageSquare,
  Footprints,
  Flag,
  Sparkles,
  Navigation,
  AlertTriangle,
  Info,
  X,
  Thermometer,
  Droplets,
  Gauge,
  Radiation,
  ShieldCheck,
  ShieldAlert,
  Factory,
  Coins,
  Orbit,
  Wind,
  Activity,
  Dna,
  Crosshair,
  Zap,
  CheckCircle2,
  Bomb,
  Building2,
  FileBadge,
  Compass,
  Package,
  LifeBuoy,
  Swords,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  CrewMember,
  CrewRole,
  Mission,
  MissionType,
  PlanetData,
  PlayerCampaignState,
  Rarity,
  StarSystemFull,
  SystemPhenomenon,
} from '../types/game';
import {
  BLUEPRINTS,
  BLUEPRINTS_BY_ID,
  CONSUMABLES,
  EXTRACTORS,
  EXTRACTORS_BY_ID,
  HULLS,
  HULLS_BY_ID,
  JUMP_DRIVES,
  JUMP_DRIVES_BY_ID,
  RESOURCES_BY_ID,
  SHIELDS,
  SHIELDS_BY_ID,
  SUIT_GEAR,
  SUIT_GEAR_BY_ID,
  UTILITY_MODULES,
  WEAPONS,
  WEAPONS_BY_ID,
} from '../data/items';
import {
  CREATURES_BY_ID,
  FACTIONS,
  FACTIONS_BY_ID,
  isFactionConservative,
  LIFE_FORMS_BY_ID,
  SPECIES_BY_ID,
} from '../data/lifeforms';
import { PLANET_TYPES_BY_CODE } from '../data/planets';
import {
  checkMissionReadyInLocation,
  generateMissionsForFaction,
  getEffectivePlanetTechLevel,
  getMissionColoredSummary,
  getPlanetControllingFaction,
  getPlanetCurrentLevel,
  getPlanetEffectiveTypeCode,
  getDisplayedHabitability,
  getRenownTierName,
  planetForRisk,
} from '../data/narrative';
import { compartmentUsed, computeCrewBonuses, computeShipDerivedStats, getEffectiveRoleSkill } from '../engine/combat';
import { formatTablePct, quoteSale, resourceSupplyBand, tableDeltaPct, unitBuyPrice } from '../engine/market';
import { neededResourceIds } from '../engine/resourceNeeds';
import {
  evaluatePlanetConditionRisk,
  getSystemExtractionLicenseStatus,
  HEADQUARTERS_COST,
} from '../engine/planetaryActions';
import {
  EXTRACTION_CLASS_LABELS,
  getEquipmentMeta,
  getLevelStyle,
  PLANET_LEVEL_LABELS,
  RARITY_STYLES,
} from '../utils/formatting';
import { CreatureCard } from './CreatureCard';
import {
  CrewPortraitSprite,
  EquipmentSprite,
  HullSprite,
  PhenomenonSprite,
  PlanetSprite,
  ResourceSprite,
} from './SpriteArt';
import { SeededRNG } from '../utils/rng';

const ROLE_LABELS: Record<CrewRole, { label: string; desc: string }> = {
  piloto_navegador: { label: 'Piloto Navegador', desc: 'Reduz combustível nos saltos e reduz riscos em campos de meteoros' },
  piloto_combate: { label: 'Piloto de Combate', desc: 'Aumenta escudos e ajuda a evadir fragmentos em mineração espacial' },
  engenheiro: { label: 'Engenheiro', desc: 'Regenera o casco automaticamente e potencializa kits de reparo' },
  negociador: { label: 'Negociador', desc: 'Melhora margens de compra e venda em mercados galácticos' },
  explorador: { label: 'Explorador', desc: 'Aumenta sucesso em descidas, coleta de fauna e sobrevivência' },
  minerador: { label: 'Minerador', desc: 'Acelera a extração contínua em depósitos planetários em até +130%' },
  diplomata: { label: 'Diplomata', desc: 'Amplia reputação ganho, reduz recarga de contato e facilita alianças' },
  mestre_tripulacao: { label: 'Mestre de Tripulação', desc: 'Reduz consumo de mantimentos, barateia contratação e recupera aos poucos a saúde da tripulação' },
};

function formatExtractInterval(ratePerSec: number): string {
  if (ratePerSec <= 0) return 'sem extrator compatível';
  const seconds = 1 / ratePerSec;
  const shown = seconds >= 10 ? Math.round(seconds).toString() : seconds.toFixed(1).replace('.', ',');
  return `1 unidade a cada ${shown} segundos`;
}

function ExtractResourceButton({
  name,
  rarity,
  remaining,
  maxAmount,
  intervalLabel,
  active,
  progress,
  disabled,
  hint,
  onToggle,
}: {
  name: string;
  rarity: Rarity;
  remaining: number;
  maxAmount: number;
  intervalLabel: string;
  active: boolean;
  progress: number;
  disabled: boolean;
  hint: string;
  onToggle: () => void;
}) {
  const tone = RARITY_STYLES[rarity] ?? RARITY_STYLES.comum;
  return (
    <div className={`bg-slate-900/65 border ${active ? 'border-cyan-400/70 shadow-[0_0_16px_rgba(34,211,238,0.15)]' : tone.border} rounded-xl p-2.5`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-semibold ${tone.text}`}>{name}</span>
            <RarityBadge rarity={rarity} />
            <span className="ml-auto font-mono-tabular text-cyan-200 text-[11px]">
              {remaining}/{maxAmount}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{intervalLabel}</div>
        </div>
        <button
          type="button"
          disabled={disabled && !active}
          onClick={onToggle}
          className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
            active
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950'
          }`}
        >
          {active ? 'Parar extração' : 'Extrair'}
        </button>
      </div>
      <div className="text-[10px] text-slate-500 mt-1">{hint}</div>
      {active && (
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-cyan-400 transition-all" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

const THREAT_HAZARD_MAP: Record<string, string> = {
  'Calor extremo': 'calor',
  'Frio criogênico': 'frio',
  'Radiação intensa': 'radiacao',
  'Toxicidade atmosférica': 'toxicidade',
  'Alta pressão': 'pressao',
};

const RarityBadge: React.FC<{ rarity: Rarity }> = ({ rarity }) => {
  const st = RARITY_STYLES[rarity] ?? RARITY_STYLES.comum;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold capitalize ${st.badge}`}>
      {st.label}
    </span>
  );
};

function PriceMark({ pct, tone }: { pct: number; tone: 'compra' | 'venda' | 'bonus' }) {
  const n = Math.round(pct);
  const text = formatTablePct(n);
  const color =
    tone === 'compra'
      ? n < 0
        ? 'text-emerald-400'
        : n > 0
          ? 'text-rose-400'
          : 'text-slate-300'
      : tone === 'venda'
        ? n > 0
          ? 'text-emerald-400'
          : n < 0
            ? 'text-rose-400'
            : 'text-slate-300'
        : n >= 0
          ? 'text-emerald-400'
          : 'text-rose-400';
  return <span className={`font-mono-tabular font-semibold ${color}`}>{text}</span>;
}

function MarketRow({
  icon,
  name,
  nameClass,
  rarity,
  qty,
  pct,
  tone,
  detail,
  action,
  borderClass = 'border-slate-800',
  needed = false,
}: {
  icon: React.ReactNode;
  name: string;
  nameClass?: string;
  rarity: Rarity;
  qty: number;
  pct: number;
  tone: 'compra' | 'venda';
  detail: React.ReactNode;
  action: React.ReactNode;
  borderClass?: string;
  needed?: boolean;
}) {
  return (
    <div className={`bg-slate-900/65 border ${borderClass} rounded-xl p-2.5`}>
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 pt-0.5">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-semibold ${nameClass ?? 'text-white'}`}>{name}</span>
            <RarityBadge rarity={rarity} />
            <span className="ml-auto inline-flex flex-wrap items-center justify-end gap-2">
              <span className="font-mono-tabular text-cyan-200">({qty})</span>
              <PriceMark pct={pct} tone={tone} />
              {action}
            </span>
          </div>
          <div className="text-[11px] text-slate-300 leading-snug mt-1">{detail}</div>
          {needed ? (
            <div className="mt-1 text-right text-[11px] font-semibold text-amber-300">você precisa disso</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const MISSION_TYPE_ICON: Record<MissionType, React.ReactNode> = {
  entrega_comercio: <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
  coleta_raro: <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
  escanear_planeta: <Radar className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
  escanear_criatura: <Dna className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
  contato_nivel2: <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />,
  resgate_escolta: <LifeBuoy className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
  combate: <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
  cadeia_faccao: <Compass className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
};

const PlanetBackdropArt: React.FC<{
  typeCode: string;
  palette: [string, string, string];
  atmosphereColor: string;
  hasRings: boolean;
  starColor: string;
  isDestroyed?: boolean;
}> = ({ typeCode, palette, atmosphereColor, hasRings, starColor, isDestroyed = false }) => {
  const gradId = `bg-${typeCode}-${isDestroyed ? 'dead' : 'ok'}`;
  const orbId = `orb-${typeCode}-${isDestroyed ? 'dead' : 'ok'}`;
  return (
    <svg
      viewBox="0 0 600 130"
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-none ${isDestroyed ? 'opacity-60' : 'opacity-40'}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isDestroyed ? '#130709' : '#050914'} />
          <stop offset="55%" stopColor={isDestroyed ? '#45120a' : palette[1]} stopOpacity="0.55" />
          <stop offset="100%" stopColor={isDestroyed ? '#ea580c' : atmosphereColor} stopOpacity="0.38" />
        </linearGradient>
        <radialGradient id={orbId} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={isDestroyed ? '#3f2e2b' : palette[2]} stopOpacity="0.9" />
          <stop offset="55%" stopColor={isDestroyed ? '#241a1c' : palette[0]} stopOpacity="0.75" />
          <stop offset="100%" stopColor={isDestroyed ? '#130c0e' : palette[1]} stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <rect width="600" height="130" fill={`url(#${gradId})`} />
      {/* Star flare on top left */}
      <circle cx="48" cy="22" r="32" fill={isDestroyed ? '#f97316' : starColor} opacity="0.2" />
      <circle cx="48" cy="22" r="8" fill={isDestroyed ? '#fde047' : starColor} opacity="0.38" />
      {/* Horizon terrain silhouette */}
      <path
        d={
          isDestroyed
            ? 'M0 116 L70 92 L120 110 L195 82 L255 108 L335 88 L410 105 L490 80 L550 102 L600 88 L600 130 L0 130 Z'
            : 'M0 112 Q95 88 185 104 T370 96 T520 106 L600 94 L600 130 L0 130 Z'
        }
        fill={isDestroyed ? '#1c1213' : palette[1]}
        opacity="0.7"
      />
      {/* Stylized planetary horizon sphere on right */}
      <circle cx="515" cy="72" r="56" fill={`url(#${orbId})`} opacity="0.78" />
      <circle
        cx="515"
        cy="72"
        r="59"
        fill="none"
        stroke={isDestroyed ? '#f97316' : atmosphereColor}
        strokeWidth="2.5"
        opacity="0.52"
      />
      {isDestroyed && (
        <g strokeLinecap="round" fill="none">
          <path d="M472 52 L494 64 L506 54 L528 70 L548 60" stroke="#f97316" strokeWidth="2.5" opacity="0.95" />
          <path d="M482 88 L504 75 L519 86 L544 74" stroke="#fde047" strokeWidth="1.8" opacity="0.9" />
          <path d="M510 34 L516 56 L534 98" stroke="#ef4444" strokeWidth="2" opacity="0.85" />
          <path d="M90 120 L132 104 L175 118 L230 98" stroke="#f97316" strokeWidth="1.8" opacity="0.7" />
        </g>
      )}
      {hasRings && !isDestroyed && (
        <ellipse
          cx="515"
          cy="72"
          rx="96"
          ry="17"
          transform="rotate(-14 515 72)"
          fill="none"
          stroke={palette[2]}
          strokeWidth="4"
          opacity="0.42"
        />
      )}
      {/* Starfield sparkles */}
      <circle cx="140" cy="24" r="1.2" fill="#e2e8f0" opacity="0.7" />
      <circle cx="245" cy="18" r="1" fill="#e2e8f0" opacity="0.5" />
      <circle cx="330" cy="36" r="1.4" fill={isDestroyed ? '#fb923c' : '#bae6fd'} opacity="0.6" />
      <circle cx="410" cy="19" r="1" fill="#e2e8f0" opacity="0.55" />
    </svg>
  );
};

type PlanetCardTab =
  | 'depositos'
  | 'descida'
  | 'atmosfera'
  | 'solo'
  | 'comercio_estaleiro'
  | 'conversar'
  | 'sede'
  | 'bombardear';

interface PlanetPanelProps {
  system: StarSystemFull;
  planet: PlanetData | null;
  phenomenon: SystemPhenomenon | null;
  campaign: PlayerCampaignState;
  miningTargetId: string | null;
  miningProgress: number;
  atPhenomenon: boolean;
  onClose: () => void;
  onTravelToPlanet: (planetId: string) => void;
  onTravelToPhenomenon: (phenId: string) => void;
  onScanPlanet: (planet: PlanetData) => void;
  onToggleMining: (depositId: string, resourceId: string, ratePerSec: number, surface: boolean) => void;
  onStopMining: () => void;
  onExtractGround: (planet: PlanetData, depositId: string) => void;
  onRevealExistence: (planet: PlanetData) => void;
  onBombardPlanet: (planet: PlanetData) => void;
  onBuyExtractionLicense: () => void;
  onCreateHeadquarters: (planet: PlanetData, targetFactionId: string) => void;
  onAcceptMission: (mission: Mission) => void;
  onCompleteMission: (mission: Mission) => void;
  onContactCiv: (planet: PlanetData) => void;
  onDescendPlanet: (planet: PlanetData) => void;
  onColonizePlanet: (planet: PlanetData) => void;
  onInvestigateAnomaly: (planet: PlanetData) => void;
  onBuyResource: (resourceId: string, qty: number, unitPrice: number) => void;
  onSellResource: (resourceId: string, qty: number) => void;
  onBuyConsumable: (consumableId: string, price: number) => void;
  onBuyEquipment: (
    category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit',
    itemId: string,
    price: number
  ) => void;
  onBuyBlueprint: (blueprintId: string, price: number) => void;
  onCraftBlueprint: (blueprintId: string) => void;
  onBuyHull: (hullId: string, price: number) => void;
  onSellShip: (shipUid: string, sellPrice: number) => void;
  onHireCrew: (candidate: CrewMember) => void;
  onInteractPhenomenon: (phen: SystemPhenomenon) => void;
  onDestroyMovingHazard?: (hazardId: string) => void;
  onTabChange?: (tab: PlanetCardTab) => void;
  onTriggerLanding?: (planetId: string) => void;
}

export const PlanetPanel: React.FC<PlanetPanelProps> = ({
  system,
  planet,
  phenomenon,
  campaign,
  miningTargetId,
  miningProgress,
  atPhenomenon,
  onClose,
  onTravelToPlanet,
  onTravelToPhenomenon,
  onScanPlanet,
  onToggleMining,
  onStopMining,
  onExtractGround,
  onRevealExistence,
  onBombardPlanet,
  onBuyExtractionLicense,
  onCreateHeadquarters,
  onAcceptMission,
  onCompleteMission,
  onContactCiv,
  onDescendPlanet,
  onColonizePlanet,
  onInvestigateAnomaly,
  onBuyResource,
  onSellResource,
  onBuyConsumable,
  onBuyEquipment,
  onBuyBlueprint,
  onCraftBlueprint,
  onBuyHull,
  onSellShip,
  onHireCrew,
  onInteractPhenomenon,
  onDestroyMovingHazard,
  onTabChange,
  onTriggerLanding,
}) => {
  const [cardTab, setCardTab] = useState<PlanetCardTab>('depositos');
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [marketMode, setMarketMode] = useState<'comercio' | 'estaleiro'>('comercio');
  const [selectedHqFactionId, setSelectedHqFactionId] = useState<string>('');
  const [coverFailed, setCoverFailed] = useState(false);

  const isOrbitingCurrent = Boolean(planet && campaign.orbitingPlanetId === planet.id);

  useEffect(() => {
    setCardTab('depositos');
    onTabChange?.('depositos');
    setMarketMode('comercio');
    setCoverFailed(false);
    setInfoCollapsed(false);
  }, [planet?.id, isOrbitingCurrent, onTabChange]);

  const bonuses = useMemo(() => computeCrewBonuses(campaign), [campaign]);
  const activeShip = campaign.ships.find((s) => s.uid === campaign.activeShipUid) ?? campaign.ships[0];
  const shipStats = useMemo(() => computeShipDerivedStats(activeShip, bonuses), [activeShip, bonuses]);
  const hullDef = HULLS_BY_ID[activeShip.hullId] ?? HULLS[0];

  // Phenomenon inspection view (requires traveling to location; meteor fields have pilot-mitigated hull risk)
  if (phenomenon && !planet) {
    const remaining = campaign.phenomenonCooldowns[phenomenon.id] ?? phenomenon.remaining;
    const res = phenomenon.resourceId ? RESOURCES_BY_ID[phenomenon.resourceId] : null;
    const shipMaxTech = activeShip.extractorIds.reduce(
      (m, id) => Math.max(m, EXTRACTORS_BY_ID[id]?.techTier ?? 1),
      1
    );
    const techBlocked = shipMaxTech < phenomenon.minTechTier;
    const reqLevelStyle = getLevelStyle(phenomenon.minTechTier, 'tech');
    const cargoFree = Math.max(0, shipStats.cargoCapacity - compartmentUsed(campaign, activeShip));

    const hasSup = campaign.supplies > 0;
    const navSkill = getEffectiveRoleSkill(campaign.crew, 'piloto_navegador', hasSup);
    const combatPilotSkill = getEffectiveRoleSkill(campaign.crew, 'piloto_combate', hasSup);
    const pilotMitigationPct = Math.min(34, Math.round(navSkill * 0.28 + combatPilotSkill * 0.18));
    const meteorRiskPct = Math.max(8, 42 - pilotMitigationPct);

    return (
      <div className="h-full flex flex-col bg-[#090e1a]/96 border-l border-slate-800 text-slate-100 p-3 gap-2.5 overflow-hidden">
        {/* Card 1: Identidade & Telemetria do Fenômeno */}
        <div className="shrink-0 bg-slate-950/95 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <PhenomenonSprite kind={phenomenon.kind} size={50} />
              <div className="min-w-0">
                <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Singularidade & Fenômeno Espacial
                </div>
                <h2 className="font-display text-lg font-bold text-white leading-tight">{phenomenon.name}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{phenomenon.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!atPhenomenon ? (
              <button
                type="button"
                onClick={() => onTravelToPhenomenon(phenomenon.id)}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                Viajar até o Local
              </button>
            ) : (
              <div className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Nave posicionada no local
              </div>
            )}
            <span className={`px-2 py-1 rounded border font-mono-tabular text-[11px] font-semibold ${reqLevelStyle.badge}`}>
              Extrator de tecnologia nível {phenomenon.minTechTier} ou superior (sua nave: nível {shipMaxTech})
            </span>
          </div>
          {phenomenon.kind === 'cometa_errante' && (
            <button
              type="button"
              disabled={!atPhenomenon || !(WEAPONS_BY_ID[activeShip.weaponId ?? '']?.canBombard && (WEAPONS_BY_ID[activeShip.weaponId ?? '']?.attackLevel ?? 0) >= 2)}
              onClick={() => onDestroyMovingHazard?.(phenomenon.id)}
              className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold cursor-pointer"
            >
              {WEAPONS_BY_ID[activeShip.weaponId ?? '']?.canBombard && (WEAPONS_BY_ID[activeShip.weaponId ?? '']?.attackLevel ?? 0) >= 2
                ? 'Bombardear o cometa'
                : 'Bombardear o cometa exige arma de nível dois ou mais'}
            </button>
          )}
        </div>

        {/* Card 2 & 3: Recompensa, Risco de Meteoros & Ação */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3 text-xs">
          {res ? (
            <div className="flex items-center gap-2.5 bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
              <ResourceSprite resourceId={res.id} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-semibold ${RARITY_STYLES[res.rarity].text}`}>{res.name}</span>
                  <RarityBadge rarity={res.rarity} />
                  <span className="text-[10px] font-mono-tabular text-amber-300">~{res.basePrice} créditos por unidade</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{res.description}</div>
              </div>
            </div>
          ) : (
            <div className="text-cyan-300 font-semibold bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
              Saque de materiais, créditos e possível resgate de sobreviventes
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center justify-between bg-slate-900/60 rounded-lg px-2.5 py-2">
              <span className="text-slate-400">Reserva</span>
              <span className="font-mono-tabular font-semibold text-white">{remaining} unidades</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/60 rounded-lg px-2.5 py-2">
              <span className="text-slate-400">Compartimento</span>
              <span className="font-mono-tabular font-semibold text-cyan-300">{cargoFree} unidades</span>
            </div>
          </div>

          {phenomenon.kind === 'campo_meteoros' && (
            <div className="bg-amber-950/25 border border-amber-500/40 rounded-lg p-2.5 space-y-1 text-[11px]">
              <div className="font-semibold text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Risco de Impacto de Meteoros
                </span>
                <span className="font-mono-tabular text-white">{meteorRiskPct}% chance de dano</span>
              </div>
              <p className="text-slate-300">
                Base 42% reduzido em <strong className="text-emerald-300">-{pilotMitigationPct}%</strong> pela perícia dos Pilotos da tripulação
                (Navegador {Math.round(navSkill)} / Combate {Math.round(combatPilotSkill)}).
              </p>
            </div>
          )}

          {phenomenon.hasSurvivors && (
            <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 shrink-0" />
              Sinal de sobreviventes detectado! Saquear pode concluir missões de resgate.
            </div>
          )}

          <button
            type="button"
            disabled={!atPhenomenon || remaining <= 0 || techBlocked}
            onClick={() => onInteractPhenomenon(phenomenon)}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold cursor-pointer flex items-center justify-center gap-2"
          >
            <Pickaxe className="w-4 h-4" />
            {!atPhenomenon
              ? 'Viaje até o local para minerar ou escanear'
              : remaining <= 0
              ? 'Fenômeno Esgotado'
              : techBlocked
              ? `Requer Extrator Nível ${phenomenon.minTechTier}+`
              : phenomenon.kind === 'destrocos_nave'
              ? 'Saquear Destroços & Resgatar Sobreviventes'
              : phenomenon.kind === 'buraco_negro'
              ? 'Estudar Horizonte & Coletar Energia Exótica'
              : phenomenon.kind === 'campo_meteoros'
              ? `Minerar Campo de Meteoros (${meteorRiskPct}% risco)`
              : `Coletar ${res?.name ?? 'Recursos'}`}
          </button>
        </div>
      </div>
    );
  }

  if (!planet) return null;

  const isScanned = campaign.scannedPlanetIds.includes(planet.id);
  const inOrbit = campaign.orbitingPlanetId === planet.id;
  const actualLevel = getPlanetCurrentLevel(planet, campaign);
  const habit = getDisplayedHabitability(planet, campaign);
  const riskPlanet = planetForRisk(planet, campaign);
  const effectiveTypeCode = getPlanetEffectiveTypeCode(planet, campaign);
  const pt = PLANET_TYPES_BY_CODE[effectiveTypeCode] ?? PLANET_TYPES_BY_CODE['TX01'];
  const ctrlFacId = getPlanetControllingFaction(planet, campaign);
  const ctrlFac = ctrlFacId ? FACTIONS_BY_ID[ctrlFacId] : null;
  const extractorFac = planet.extractorColonyFactionId ? FACTIONS_BY_ID[planet.extractorColonyFactionId] : ctrlFac;
  const planetTech = getEffectivePlanetTechLevel(planet, system, campaign);
  const renown = ctrlFac ? campaign.factionRenown[ctrlFac.id] ?? 0 : 0;
  const isConservativeFac = ctrlFac ? isFactionConservative(ctrlFac) : false;

  const ptRarityStyle = RARITY_STYLES[pt.rarity] ?? RARITY_STYLES.comum;
  const planetLvStyle = getLevelStyle(actualLevel, 'planet');
  const techLvStyle = getLevelStyle(planetTech, 'tech');

  const isCapitalDiscount = actualLevel === 5;
  const renownDiscount = Math.max(-0.15, Math.min(0.22, renown * 0.002));
  const priceMult =
    (isCapitalDiscount ? 0.88 : 1.0) *
    (1 - renownDiscount - bonuses.tradePriceBonus + campaign.priceModifierBias);

  const overrides = campaign.planetOverrides[planet.id] ?? {};
  const descendCooldownSec = Math.max(24, 60 * (1 - Math.min(0.6, bonuses.explorerBonus * 0.006)));
  const descendWait = Math.max(
    0,
    Math.ceil((overrides.lastDescendAt ?? -9999) + descendCooldownSec - campaign.gameTimeSeconds)
  );

  const equippedSuitGear = activeShip.suitGearIds.map((id) => SUIT_GEAR_BY_ID[id]).filter(Boolean);
  const equippedWeapon = activeShip.weaponId ? WEAPONS_BY_ID[activeShip.weaponId] : null;
  const equippedJumpDrive = JUMP_DRIVES_BY_ID[activeShip.jumpDriveId];
  const primaryShield = activeShip.shieldIds[0] ? SHIELDS_BY_ID[activeShip.shieldIds[0]] : null;

  const riskInfo = evaluatePlanetConditionRisk(
    riskPlanet,
    activeShip.suitGearIds,
    bonuses.explorerBonus,
    bonuses.hazardResistBonus
  );
  const licenseStatus = getSystemExtractionLicenseStatus(system, actualLevel, campaign);

  const visibleDeposits = planet.deposits.filter((d) => !d.hiddenUntilHighScan || shipStats.hasLongScanner);
  const atmoDeposits = visibleDeposits.filter((d) => RESOURCES_BY_ID[d.resourceId]?.extractionClass === 'coletor_atmosferico');
  const groundDeposits = visibleDeposits.filter((d) => RESOURCES_BY_ID[d.resourceId]?.extractionClass !== 'coletor_atmosferico');

  const honoredFactions = FACTIONS.filter(
    (f) => (campaign.factionRenown[f.id] ?? 0) >= 80 || campaign.formalAlliances.includes(f.id)
  );
  const canCreateHqHere = actualLevel === 3 && !system.controllingFactionId;
  const chosenHqFactionId =
    honoredFactions.find((f) => f.id === selectedHqFactionId)?.id ?? honoredFactions[0]?.id ?? '';
  const hasHqResources = HEADQUARTERS_COST.resources.every(
    (req) => (campaign.cargo.find((c) => c.resourceId === req.resourceId)?.qty ?? 0) >= req.qty
  );
  const hqPending = (campaign.pendingHeadquarters ?? []).some((entry) => entry.planetId === planet.id);
  const neededResources = neededResourceIds(campaign);

  const localFactionIdForMissions = ctrlFac?.id ?? campaign.chosenFactionId;
  const localAvailableMissions = useMemo(() => {
    if (actualLevel < 3) return [];
    const generated = generateMissionsForFaction(localFactionIdForMissions, system, campaign, 4);
    const activeIds = new Set(campaign.missions.map((m) => m.id));
    return generated.filter((m) => !activeIds.has(m.id));
  }, [actualLevel, localFactionIdForMissions, system, campaign]);

  const localReadyMissions = campaign.missions.filter(
    (m) => m.status === 'aceita' && checkMissionReadyInLocation(m, campaign).ready
  );

  const crewCandidates = useMemo(() => {
    if (actualLevel < 3) return [];
    const rng = new SeededRNG(planet.seed + Math.floor(campaign.gameTimeSeconds / 180));
    const count = actualLevel === 5 ? 6 : actualLevel === 4 ? 4 : 3;
    const roles: CrewRole[] = [
      'piloto_navegador',
      'piloto_combate',
      'engenheiro',
      'negociador',
      'explorador',
      'minerador',
      'diplomata',
      'mestre_tripulacao',
    ];
    const spId = ctrlFac?.speciesId ?? planet.speciesId ?? campaign.chosenSpeciesId;
    const list: CrewMember[] = [];
    for (let i = 0; i < count; i++) {
      const role = rng.pick(roles);
      const minSkill = actualLevel === 5 ? 48 : actualLevel === 4 ? 28 : 12;
      const maxSkill = actualLevel === 5 ? 98 : actualLevel === 4 ? 76 : 55;
      const skill = rng.int(minSkill, maxSkill);
      const hireCost = Math.round((80 + skill * 14) * bonuses.supplyCostMult);
      const firstNames = ['Vael', 'Toren', 'Kira', 'Soren', 'Nyx', 'Dax', 'Mira', 'Zel', 'Orin', 'Luma'];
      list.push({
        id: `cand_${planet.id}_${i}_${skill}`,
        name: `${rng.pick(firstNames)}-${rng.int(10, 99)}`,
        speciesId: spId,
        role,
        skill,
        hireCost,
        status: 'ativo',
      });
    }
    return list;
  }, [
    actualLevel,
    planet.id,
    planet.seed,
    ctrlFac?.speciesId,
    planet.speciesId,
    campaign.chosenSpeciesId,
    bonuses.supplyCostMult,
    Math.floor(campaign.gameTimeSeconds / 180),
  ]);

  const rarityMaxRank =
    planetTech >= 5 ? 5 : planetTech === 4 ? 4 : planetTech === 3 ? 3 : planetTech === 2 ? 2 : 1;
  const rarityRank = (r: string) =>
    r === 'lendário' ? 5 : r === 'épico' ? 4 : r === 'raro' ? 3 : r === 'incomum' ? 2 : 1;
  const isFactionMatch = (style?: string) => Boolean(ctrlFac && style === ctrlFac.techStyle);

  const isOriginAccessible = (item: { speciesExclusiveId?: string; factionExclusiveId?: string }) => {
    if (item.speciesExclusiveId && item.speciesExclusiveId !== campaign.chosenSpeciesId) return false;
    if (item.factionExclusiveId && item.factionExclusiveId !== campaign.chosenFactionId && item.factionExclusiveId !== ctrlFac?.id) return false;
    return true;
  };

  const isShipyardBlueprintAccessible = (bp: (typeof BLUEPRINTS)[number]) => {
    if (campaign.blueprintsOwned.includes(bp.id)) return true;
    if (bp.speciesExclusiveId && bp.speciesExclusiveId !== campaign.chosenSpeciesId) return false;
    if (bp.factionExclusiveId) {
      return bp.factionExclusiveId === ctrlFac?.id || bp.factionExclusiveId === campaign.chosenFactionId;
    }
    return true;
  };

  const isShipyardHullAccessible = (h: (typeof HULLS)[number]) => {
    if (h.speciesExclusiveId && h.speciesExclusiveId !== campaign.chosenSpeciesId) return false;
    if (h.factionExclusiveId) {
      return h.factionExclusiveId === ctrlFac?.id || h.factionExclusiveId === campaign.chosenFactionId;
    }
    return true;
  };

  const marketWeapons = WEAPONS.filter(
    (w) =>
      isOriginAccessible(w) &&
      (rarityRank(w.rarity) <= rarityMaxRank || (isFactionMatch(w.factionStyle) && rarityRank(w.rarity) <= rarityMaxRank + 1))
  );
  const marketShields = SHIELDS.filter(
    (s) =>
      isOriginAccessible(s) &&
      (rarityRank(s.rarity) <= rarityMaxRank || (isFactionMatch(s.factionStyle) && rarityRank(s.rarity) <= rarityMaxRank + 1))
  );
  const marketExtractors = EXTRACTORS.filter((e) => isOriginAccessible(e) && rarityRank(e.rarity) <= rarityMaxRank + 1);
  const marketUtilities = UTILITY_MODULES.filter((u) => isOriginAccessible(u) && rarityRank(u.rarity) <= rarityMaxRank + 1);
  const marketDrives = JUMP_DRIVES.filter((j) => rarityRank(j.rarity) <= rarityMaxRank);
  const marketSuit = SUIT_GEAR.filter((g) => isOriginAccessible(g) && rarityRank(g.rarity) <= rarityMaxRank + 1);

  const cargoFree = Math.max(0, shipStats.cargoCapacity - compartmentUsed(campaign, activeShip));

  const promisingBioNames =
    pt.allowedLifeForms.length > 0
      ? pt.allowedLifeForms.map((lf) => LIFE_FORMS_BY_ID[lf]?.name ?? lf).join(', ')
      : 'Terreno geologicamente estéril (raramente abriga vida complexa)';

  const activeBioName = planet.lifeFormId ? LIFE_FORMS_BY_ID[planet.lifeFormId]?.name : null;

  // Determine valid Card 2 tabs for current planet state
  const cardButtons: Array<{
    id: PlanetCardTab;
    label: string;
    icon: React.ReactNode;
    accent: string;
    visible: boolean;
  }> = [
    {
      id: 'depositos',
      label: 'Depósitos & Fauna',
      icon: <Layers className="w-3.5 h-3.5" />,
      accent: 'border-cyan-500/45 text-cyan-200 bg-cyan-500/15',
      visible: isScanned,
    },
    {
      id: 'descida',
      label: 'Descer em solo para explorar',
      icon: <Footprints className="w-3.5 h-3.5" />,
      accent: 'border-emerald-500/45 text-emerald-200 bg-emerald-500/15',
      visible: isScanned && !pt.noSurface,
    },
    {
      id: 'atmosfera',
      label: 'Extrair recursos da atmosfera',
      icon: <Wind className="w-3.5 h-3.5" />,
      accent: 'border-sky-500/45 text-sky-200 bg-sky-500/15',
      visible: isScanned,
    },
    {
      id: 'solo',
      label: 'Extrair recursos do solo',
      icon: <Pickaxe className="w-3.5 h-3.5" />,
      accent: 'border-amber-500/45 text-amber-200 bg-amber-500/15',
      visible: isScanned && !pt.noSurface,
    },
    {
      id: 'comercio_estaleiro',
      label: 'Comercializar e Estaleiro',
      icon: <ShoppingCart className="w-3.5 h-3.5" />,
      accent: 'border-indigo-500/45 text-indigo-200 bg-indigo-500/15',
      visible: isScanned && actualLevel >= 3,
    },
    {
      id: 'conversar',
      label: actualLevel === 2 ? 'Contato Nível 2' : 'Conversar',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      accent: 'border-teal-500/45 text-teal-200 bg-teal-500/15',
      visible: isScanned && actualLevel >= 2,
    },
    {
      id: 'sede',
      label: 'Criar Sede',
      icon: <Building2 className="w-3.5 h-3.5" />,
      accent: 'border-purple-500/45 text-purple-200 bg-purple-500/15',
      visible: isScanned && canCreateHqHere,
    },
    {
      id: 'bombardear',
      label: 'Bombardear planeta',
      icon: <Bomb className="w-3.5 h-3.5" />,
      accent: 'border-rose-500/45 text-rose-200 bg-rose-500/15',
      visible: isScanned && actualLevel >= 2,
    },
  ];

  const visibleCardButtons = cardButtons.filter((b) => b.visible);
  const currentTabValid = visibleCardButtons.some((b) => b.id === cardTab);
  const effectiveTab: PlanetCardTab = currentTabValid ? cardTab : 'depositos';

  return (
    <div className="h-full flex flex-col bg-[#090e1a]/96 border-l border-slate-800 text-slate-100 p-3 gap-2.5 overflow-hidden">
      {/* ========================================================================
          CARD 1: Ficha do planeta. Recolhe ao abrir comércio ou conversa.
      ======================================================================== */}
      <section className={`shrink-0 relative overflow-hidden rounded-xl border ${actualLevel === -1 ? 'border-orange-500/60' : 'border-slate-700/80'} bg-slate-950 shadow-lg`}>
        {infoCollapsed && (
          <div className="relative z-20 flex items-center gap-2 px-2 py-1.5 bg-[#070d18]">
            <PlanetSprite
              typeCode={effectiveTypeCode}
              level={isScanned ? actualLevel : 0}
              hasExtractorColony={isScanned && actualLevel >= 1 && Boolean(planet.hasExtractorColony)}
              hasRings={actualLevel !== -1 && planet.hasRings}
              size={28}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-display text-sm font-bold text-white truncate">{planet.name}</span>
                {isScanned && (
                  <span className={`shrink-0 px-1 py-0.5 rounded border text-[9px] font-semibold font-mono-tabular ${planetLvStyle.badge}`}>
                    Nv {actualLevel}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {ctrlFac ? ctrlFac.name : 'Espaço Selvagem'} · Índice {habit.score}/100
                {inOrbit ? ' · Em órbita' : ''}
              </div>
            </div>
            {!inOrbit && (
              <button
                type="button"
                onClick={() => onTravelToPlanet(planet.id)}
                className="shrink-0 px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-semibold cursor-pointer"
              >
                Órbita
              </button>
            )}
            <button
              type="button"
              onClick={() => setInfoCollapsed(false)}
              className="p-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
              title="Expandir ficha do planeta"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            infoCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="relative min-h-[210px]">
        <img
          src={`/planet-covers/${effectiveTypeCode}.jpg`}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${coverFailed ? 'hidden' : ''}`}
          onLoad={() => setCoverFailed(false)}
          onError={() => setCoverFailed(true)}
        />
        {coverFailed && (
          <PlanetBackdropArt
            typeCode={pt.code}
            palette={pt.palette}
            atmosphereColor={pt.atmosphereColor}
            hasRings={actualLevel !== -1 && planet.hasRings}
            starColor={system.starColor}
            isDestroyed={actualLevel === -1}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050811]/90 via-[#050811]/55 to-[#050811]/15" />

        <div className="relative z-10 p-3 space-y-2">
          {/* Top Identity Row */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <PlanetSprite
                typeCode={effectiveTypeCode}
                level={isScanned ? actualLevel : 0}
                hasExtractorColony={isScanned && actualLevel >= 1 && Boolean(planet.hasExtractorColony)}
                hasRings={actualLevel !== -1 && planet.hasRings}
                size={50}
              />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${ptRarityStyle.badge}`}>
                    {pt.name} · {ptRarityStyle.label}
                  </span>
                  {isScanned ? (
                    <>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono-tabular ${planetLvStyle.badge}`}>
                        Planeta nível {actualLevel} · {PLANET_LEVEL_LABELS[actualLevel] ?? ''}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono-tabular ${techLvStyle.badge}`}>
                        Tecnologia nível {planetTech}
                      </span>
                    </>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 text-amber-300 text-[10px] font-semibold">
                      Não Escaneado (Entre em órbita)
                    </span>
                  )}
                  {isScanned && planet.hasExtractorColony && (
                    <span className="px-1.5 py-0.5 rounded border border-amber-500/50 bg-amber-500/15 text-amber-300 text-[10px] font-semibold inline-flex items-center gap-1">
                      <Factory className="w-2.5 h-2.5" />
                      Colônia Extratora
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <h2 className="font-display text-lg font-bold text-white leading-tight truncate">{planet.name}</h2>
                  <span className="text-[11px] font-medium" style={{ color: ctrlFac?.color ?? '#94a3b8' }}>
                    {ctrlFac
                      ? `${ctrlFac.name} (${SPECIES_BY_ID[ctrlFac.speciesId]?.name}) · ${
                          isConservativeFac ? 'Conservadora' : 'Integradora'
                        }`
                      : 'Espaço Selvagem (Sem Facção)'}
                  </span>
                  {ctrlFac && (
                    <span className="text-[11px] text-slate-200">
                      Sua reputação com essa facção:{' '}
                      <strong className={renown > 80 ? 'text-emerald-300' : renown < 0 ? 'text-rose-300' : 'text-cyan-200'}>
                        {renown}
                      </strong>{' '}
                      <span className="text-slate-400">({getRenownTierName(renown, campaign.formalAlliances.includes(ctrlFac.id))})</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInfoCollapsed(true)}
              className="p-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
              title="Recolher ficha do planeta"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer shrink-0"
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Telemetries, Habitability, Promising Lifeforms & Planet Risks */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-[11px]">
            {/* Telemetrias 6 células */}
            <div className="sm:col-span-7 grid grid-cols-3 gap-1.5 bg-slate-950/75 border border-slate-800/90 rounded-lg p-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Thermometer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 leading-none">Temp.</div>
                  <div className="font-mono-tabular text-white truncate">{habit.temperatureC}°C</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Gauge className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 leading-none">Gravidade</div>
                  <div className="font-mono-tabular text-white">{habit.gravityG}g</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Wind className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 leading-none">Atmosfera</div>
                  <div className="text-white truncate" title={habit.atmosphere}>
                    {habit.atmosphere}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 leading-none">Água</div>
                  <div className="text-white capitalize truncate">{habit.water}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Radiation className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 leading-none">Radiação</div>
                  <div className="font-mono-tabular text-white">{habit.radiationLevel}%</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 leading-none">Geologia</div>
                  <div className="font-mono-tabular text-white">{habit.geologicalStability}%</div>
                </div>
              </div>
            </div>

            {/* Habitabilidade, Biologia Promissora & Riscos */}
            <div className="sm:col-span-5 bg-slate-950/75 border border-slate-800/90 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-slate-400 font-semibold">Habitabilidade</span>
                <span
                  className={`font-mono-tabular font-bold px-1.5 py-0.5 rounded border text-[10px] ${
                    habit.score >= 70
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : habit.score >= 40
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  Índice {habit.score}/100
                </span>
              </div>

              <div className="text-[10px] text-slate-300 leading-snug" title={promisingBioNames}>
                <span className="text-emerald-300 font-semibold">Biologia:</span>{' '}
                {actualLevel === -1
                  ? 'A vida se apagou com o mundo.'
                  : isScanned
                  ? activeBioName
                    ? `${activeBioName} (Promissor: ${promisingBioNames})`
                    : `Terreno promissor a: ${promisingBioNames}`
                  : `Terreno promissor a: ${promisingBioNames}`}
              </div>

              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${riskInfo.badgeClass}`}>
                  Risco {riskInfo.conditionLabel} ({riskInfo.damageMult}× dano)
                </span>
                {habit.threats.length === 0 ? (
                  <span className="px-1.5 py-0.5 rounded border border-emerald-500/35 bg-emerald-500/10 text-emerald-300 text-[9px]">
                    Sem ameaças extremas
                  </span>
                ) : (
                  habit.threats.map((th) => {
                    const hz = THREAT_HAZARD_MAP[th];
                    const protectedBySuit = hz ? equippedSuitGear.some((g) => g.hazardType === hz) : false;
                    return (
                      <span
                        key={th}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-medium ${
                          protectedBySuit
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-500/15 border-rose-500/45 text-rose-300'
                        }`}
                      >
                        {protectedBySuit ? <ShieldCheck className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                        {th}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Orbit & Scan Row */}
          <div className="flex flex-wrap items-center gap-2">
            {!inOrbit ? (
              <button
                type="button"
                onClick={() => onTravelToPlanet(planet.id)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                Viajar para órbita
              </button>
            ) : (
              <div className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                <Orbit className="w-3.5 h-3.5" />
                Em órbita de {planet.name}
              </div>
            )}

            {!isScanned && (
              <button
                type="button"
                disabled={!inOrbit}
                onClick={() => onScanPlanet(planet)}
                className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                title={inOrbit ? 'Escanear planeta em órbita' : 'É necessário estar em órbita para escanear'}
              >
                <Radar className="w-3.5 h-3.5" />
                {inOrbit ? 'Escanear Planeta' : 'Entre em órbita para escanear'}
              </button>
            )}
          </div>
        </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================
          CARD 2: Botões de Abas Visíveis Conforme Disponíveis no Nível
      ======================================================================== */}
      <section className="shrink-0 bg-slate-950/90 border border-slate-800 rounded-xl p-2">
        {!isScanned ? (
          <div className="text-[11px] text-amber-300 flex items-center gap-2 px-1.5 py-1">
            <Radar className="w-4 h-4 shrink-0" />
            <span>
              Planeta ainda não escaneado. Viaje até a órbita e clique em <strong>Escanear Planeta</strong> para desbloquear as ações do nível planetário.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {visibleCardButtons.map((btn) => {
              const active = effectiveTab === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => {
                    setCardTab(btn.id);
                    onTabChange?.(btn.id);
                    if (btn.id === 'comercio_estaleiro' || btn.id === 'conversar') {
                      setInfoCollapsed(true);
                    } else {
                      setInfoCollapsed(false);
                    }
                    if (inOrbit && (btn.id === 'comercio_estaleiro' || btn.id === 'conversar')) {
                      onTriggerLanding?.(planet.id);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    active
                      ? `${btn.accent} ring-1 ring-white/30 shadow-sm`
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {btn.icon}
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================
          CARD 3: Janela com os Itens, Controles ou Informações da Aba Selecionada
      ======================================================================== */}
      <section className="flex-1 min-h-0 overflow-y-auto bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3.5 text-xs">
        {!isScanned ? (
          <div className="space-y-3 text-slate-300">
            <div className="font-semibold text-white flex items-center gap-2">
              <Radar className="w-4 h-4 text-amber-400" />
              Leitura Orbital Preliminar
            </div>
            <div className="text-[11px] text-slate-300 bg-slate-900/70 rounded-lg p-2.5 border border-slate-800">
              {pt.textureDesc} —{' '}
              {pt.noSurface
                ? 'Gigante sem crosta sólida (extração atmosférica/orbital).'
                : 'Mundo com superfície explorável para expedições e escaneamento.'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-slate-900/60 rounded-lg p-2 flex justify-between">
                <span className="text-slate-400">Órbita</span>
                <span className="font-mono-tabular text-white">{planet.orbitRadius.toFixed(0)} MKm</span>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2 flex justify-between">
                <span className="text-slate-400">Satélites</span>
                <span className="text-white">{planet.moonsCount} luas</span>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2 flex justify-between">
                <span className="text-slate-400">Anéis</span>
                <span className="text-white">{planet.hasRings ? 'Sim' : 'Não'}</span>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2 flex justify-between">
                <span className="text-slate-400">Raridade</span>
                <span className="font-mono-tabular text-emerald-300">{system.rareMultiplier.toFixed(2)}×</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-300 leading-relaxed border-t border-slate-800 pt-2">
              É obrigatório estar em órbita do planeta para realizar o escaneamento orbital completo.
            </p>
          </div>
        ) : effectiveTab === 'depositos' ? (
          <>
            {planet.hasExtractorColony && actualLevel !== -1 && (
              <div className="bg-amber-950/25 border border-amber-500/45 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Factory className="w-4 h-4 text-amber-400" />
                    Colônia Extratora de Recursos
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 text-amber-200 text-[10px] font-semibold">
                    Operação Industrial
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Mundo de Nível 1 sem habitação civil.{' '}
                  <strong style={{ color: extractorFac?.color ?? '#fbbf24' }}>
                    {extractorFac?.name ?? 'Facção Regente'}
                  </strong>{' '}
                  opera plataformas automatizadas de extração mineral neste planeta.
                </p>
              </div>
            )}

            {actualLevel === -1 && (
              <div className="bg-red-950/35 border border-orange-500/55 rounded-xl p-3 space-y-1.5">
                <div className="font-semibold text-orange-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Mundo destruído · habitabilidade 0
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                A crosta virou vidro e brasa. Cidade, água e descida se foram. Nas fendas ainda correm magma e enxofre.
                </p>
              </div>
            )}

            {/* Colonizar / Anomalia */}
            {actualLevel !== -1 && (((actualLevel === 0 || actualLevel === 1) && !overrides.colonizedByPlayer) || (planet.anomaly && !planet.anomaly.investigated)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(actualLevel === 0 || actualLevel === 1) && !overrides.colonizedByPlayer && (
                  <button
                    type="button"
                    disabled={!inOrbit || campaign.credits < 900}
                    onClick={() => onColonizePlanet(planet)}
                    className="p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 disabled:opacity-45 text-left cursor-pointer"
                  >
                    <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5" />
                      Colonizar (900 cr)
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      Eleva a civilização ao nível 3 e abre comércio, conversa e estaleiro.
                    </div>
                  </button>
                )}

                {planet.anomaly && !planet.anomaly.investigated && (
                  <button
                    type="button"
                    disabled={!inOrbit}
                    onClick={() => onInvestigateAnomaly(planet)}
                    className="p-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 disabled:opacity-45 text-left cursor-pointer"
                  >
                    <div className="font-semibold text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Investigar Anomalia
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5 truncate">{planet.anomaly.title}</div>
                  </button>
                )}
              </div>
            )}

            {/* Depósitos Detectados */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Radar className="w-3.5 h-3.5 text-cyan-400" />
                Depósitos Minerais & Atmosféricos ({visibleDeposits.length})
              </div>

              {actualLevel === -1 && (
                <div className="bg-orange-950/40 border border-orange-500/50 rounded-xl p-2.5 text-[11px] text-orange-100">
                  A cinza ainda guarda magma e enxofre. O resto deste mundo queimou.
                </div>
              )}
              {actualLevel === 5 && (
                <div className="bg-amber-950/25 border border-amber-500/40 rounded-xl p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sede Imperial (Nível 5):</strong> Todos os recursos superficiais já foram exauridos. Mundos Nível 1 com Colônia Extratora no sistema preservam reservas.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visibleDeposits.map((dep) => {
                  if (dep.hiddenUntilHighScan && !shipStats.hasLongScanner) {
                    return (
                      <div
                        key={dep.id}
                        className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-500 flex justify-between items-center"
                      >
                        <span className="flex items-center gap-1.5">
                          <Radar className="w-3.5 h-3.5" /> Veio Profundo Oculto
                        </span>
                        <span className="text-[10px]">Scanner Longo Alc.</span>
                      </div>
                    );
                  }
                  const res = RESOURCES_BY_ID[dep.resourceId];
                  if (!res) return null;
                  const rStyle = RARITY_STYLES[res.rarity];
                  const pctLeft = dep.maxAmount > 0 ? Math.round((dep.remaining / dep.maxAmount) * 100) : 0;
                  return (
                    <div
                      key={dep.id}
                      className={`p-2 rounded-xl border bg-slate-900/65 ${rStyle.border} flex items-center gap-2.5`}
                    >
                      <ResourceSprite resourceId={res.id} size={32} />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`font-semibold ${rStyle.text}`}>{res.name}</span>
                          <RarityBadge rarity={res.rarity} />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {EXTRACTION_CLASS_LABELS[res.extractionClass]} ·{' '}
                          <strong className={`font-mono-tabular ${dep.remaining > 0 ? 'text-white' : 'text-rose-400'}`}>
                            {dep.remaining}/{dep.maxAmount} ({pctLeft}%)
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fauna Planetária */}
            {actualLevel === -1 ? (
              <div className="bg-slate-900/70 border border-orange-500/40 rounded-xl p-3 space-y-1">
                <div className="font-semibold text-orange-200 flex items-center gap-1.5">
                  <Dna className="w-4 h-4 text-orange-300" />
                  Fauna extinta
                </div>
                <p className="text-[11px] text-slate-400">Nenhum rastro de animal restou na cinza.</p>
              </div>
            ) : actualLevel === 5 ? (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Dna className="w-4 h-4 text-slate-400" />
                  Fauna Planetária (0 animais novos)
                </div>
                <p className="text-[11px] text-slate-400">
                  Mundos de Nível 5 possuem toda a biodiversidade nativa já catalogada nos arquivos galácticos.
                </p>
              </div>
            ) : (
              planet.creatureIds.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Dna className="w-4 h-4 text-emerald-400" />
                    Fauna Detectada ({planet.creatureIds.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {planet.creatureIds.map((cid) => {
                      const cr = CREATURES_BY_ID[cid];
                      if (!cr) return null;
                      const cataloged = campaign.scannedCreatureIds.includes(cid);
                      return (
                        <div
                          key={cid}
                          className="flex items-center gap-2.5 bg-slate-900/65 border border-slate-800 rounded-xl p-2.5"
                        >
                          <CreatureCard
                            cardId={cr.id}
                            kind="creature"
                            name={cr.name}
                            lifeFormId={cr.lifeFormId}
                            description={cr.description}
                            sizeClass="w-14 h-14"
                            allowAiGeneration={cataloged}
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white truncate">
                                {cataloged ? cr.name : 'Espécime Não Catalogado'}
                              </span>
                              {cataloged && (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" /> Catalogado
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-cyan-300 capitalize">
                              {cr.ecologicalRole} · Porte {cr.size} · Perigo {cr.danger} · Valor {cr.baseValue} cr
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-2">
                              {cataloged
                                ? `${cr.description} (Utilidade: ${cr.utility})`
                                : 'Use "Descer em solo para explorar" para escanear e catalogar esta espécie.'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </>
        ) : effectiveTab === 'descida' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 bg-slate-900/75 border border-slate-800 rounded-xl p-3">
              <div>
                <div className="font-semibold text-emerald-200 flex items-center gap-1.5 text-sm">
                  <Footprints className="w-4 h-4 text-emerald-400" />
                  Descer em solo para explorar
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {actualLevel === 2
                    ? 'Médio risco de revelar existência da civilização primitiva e sofrer dano ambiental.'
                    : 'Médio risco de dano potencializado pela condição planetária. Coleta recursos e cataloga fauna local.'}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold shrink-0 ${riskInfo.badgeClass}`}>
                {riskInfo.conditionLabel} ({riskInfo.damageMult}× dano)
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2 text-[11px]">
              <div className="font-semibold text-slate-200">Proteção do Traje & Tripulação Exploradora</div>
              <div className="text-slate-300">
                Ameaças descobertas sem traje adequado: <strong className="text-amber-300">{riskInfo.uncoveredThreats}</strong> ·
                Bônus de Explorador: <strong className="text-emerald-300">+{Math.round(bonuses.explorerBonus)}</strong>
              </div>
            </div>

            <button
              type="button"
              disabled={!inOrbit || descendWait > 0}
              onClick={() => onDescendPlanet(planet)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Footprints className="w-4 h-4" />
              {!inOrbit
                ? 'Entre em órbita para iniciar expedição em solo'
                : descendWait > 0
                ? `Aguarde ${descendWait}s para nova expedição`
                : 'Iniciar Descida Exploratória em Solo'}
            </button>
          </div>
        ) : effectiveTab === 'atmosfera' ? (
          (() => {
            const atmoExtractors = activeShip.extractorIds
              .map((id) => EXTRACTORS_BY_ID[id])
              .filter((ex) => ex && ex.extractionClass === 'coletor_atmosferico');
            const atmoRate = atmoExtractors.reduce((sum, ex) => sum + ex.ratePerSec, 0) * bonuses.minerRateMult;

            const riskBadge =
              actualLevel <= 1
                ? { label: 'Sem risco', cls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' }
                : actualLevel === 2
                ? { label: 'Baixo risco: revelar existência', cls: 'border-amber-500/40 bg-amber-500/15 text-amber-300' }
                : licenseStatus.licensed
                ? { label: 'Sem risco com licença', cls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' }
                : { label: 'Baixo risco de dano (sem licença)', cls: 'border-amber-500/40 bg-amber-500/15 text-amber-300' };

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 bg-slate-900/75 border border-slate-800 rounded-xl p-3">
                  <div>
                    <div className="font-semibold text-sky-200 flex items-center gap-1.5 text-sm">
                      <Wind className="w-4 h-4 text-sky-400" />
                      Extrair recursos da atmosfera
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pouse em solo firme e recolha o que a atmosfera ainda guarda.
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold shrink-0 ${riskBadge.cls}`}>
                    {riskBadge.label}
                  </span>
                </div>

                {actualLevel >= 3 && system.controllingFactionId && (
                  <div
                    className={`rounded-lg px-3 py-2 border text-[11px] flex items-center justify-between gap-2 ${
                      licenseStatus.licensed
                        ? 'bg-emerald-950/25 border-emerald-500/35 text-emerald-300'
                        : 'bg-amber-950/30 border-amber-500/45 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileBadge className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {licenseStatus.licensed ? 'Licença de Extração Ativa' : 'Sem Licença de Extração neste Sistema'}
                        </div>
                        <div className="text-[10px] opacity-85 truncate">{licenseStatus.reason}</div>
                      </div>
                    </div>
                    {!licenseStatus.licensed && licenseStatus.canBuy && (
                      <button
                        type="button"
                        disabled={campaign.credits < licenseStatus.buyCost}
                        onClick={onBuyExtractionLicense}
                        className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-[10px] shrink-0 cursor-pointer"
                      >
                        Comprar Licença ({licenseStatus.buyCost} cr)
                      </button>
                    )}
                  </div>
                )}

                {atmoDeposits.length === 0 ? (
                  <div className="text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
                    Atmosfera sem gases coletáveis.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {atmoDeposits.map((d) => {
                      const r = RESOURCES_BY_ID[d.resourceId];
                      if (!r) return null;
                      const active = miningTargetId === d.id;
                      const noTool = atmoExtractors.length === 0;
                      const empty = d.remaining <= 0;
                      return (
                        <ExtractResourceButton
                          key={d.id}
                          name={r.name}
                          rarity={r.rarity}
                          remaining={d.remaining}
                          maxAmount={d.maxAmount}
                          intervalLabel={noTool ? 'Equipe um coletor atmosférico' : formatExtractInterval(atmoRate)}
                          active={active}
                          progress={miningProgress}
                          disabled={!inOrbit || empty || noTool}
                          hint={
                            !inOrbit
                              ? 'Entre em órbita para começar'
                              : empty
                              ? 'Reserva esgotada'
                              : noTool
                              ? 'Sem coletor atmosférico na nave'
                              : pt.noSurface
                              ? 'Gigante sem solo: a coleta fica em órbita'
                              : 'A coleta começa em seguida'
                          }
                          onToggle={() => {
                            if (!inOrbit || empty || noTool) return;
                            if (active) onStopMining();
                            else onToggleMining(d.id, r.id, atmoRate, !pt.noSurface);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()
        ) : effectiveTab === 'solo' ? (
          (() => {
            const groundBadge =
              actualLevel <= 1
                ? { label: 'Com risco · Pouso na superfície', cls: 'border-amber-500/40 bg-amber-500/15 text-amber-300' }
                : actualLevel === 2
                ? { label: 'Alto risco: revelar & dano', cls: 'border-rose-500/45 bg-rose-500/15 text-rose-300' }
                : licenseStatus.licensed
                ? { label: 'Risco baixo com licença', cls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' }
                : { label: 'Alto risco de dano (sem licença)', cls: 'border-rose-500/45 bg-rose-500/15 text-rose-300' };

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 bg-slate-900/75 border border-slate-800 rounded-xl p-3">
                  <div>
                    <div className="font-semibold text-amber-200 flex items-center gap-1.5 text-sm">
                      <Pickaxe className="w-4 h-4 text-amber-400" />
                      Extrair recursos do solo
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pouse a nave em solo firme e explore minas de recursos naturais.
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold shrink-0 ${groundBadge.cls}`}>
                    {groundBadge.label}
                  </span>
                </div>

                {actualLevel >= 3 && system.controllingFactionId && (
                  <div
                    className={`rounded-lg px-3 py-2 border text-[11px] flex items-center justify-between gap-2 ${
                      licenseStatus.licensed
                        ? 'bg-emerald-950/25 border-emerald-500/35 text-emerald-300'
                        : 'bg-amber-950/30 border-amber-500/45 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileBadge className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {licenseStatus.licensed ? 'Licença de Extração Ativa' : 'Sem Licença de Extração neste Sistema'}
                        </div>
                        <div className="text-[10px] opacity-85 truncate">{licenseStatus.reason}</div>
                      </div>
                    </div>
                    {!licenseStatus.licensed && licenseStatus.canBuy && (
                      <button
                        type="button"
                        disabled={campaign.credits < licenseStatus.buyCost}
                        onClick={onBuyExtractionLicense}
                        className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-[10px] shrink-0 cursor-pointer"
                      >
                        Comprar Licença ({licenseStatus.buyCost} cr)
                      </button>
                    )}
                  </div>
                )}

                {groundDeposits.length === 0 ? (
                  <div className="text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
                    Nenhum depósito de solo neste mundo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groundDeposits.map((d) => {
                      const r = RESOURCES_BY_ID[d.resourceId];
                      if (!r) return null;
                      const tools = activeShip.extractorIds
                        .map((id) => EXTRACTORS_BY_ID[id])
                        .filter((ex) => ex && ex.extractionClass === r.extractionClass);
                      const rate = tools.reduce((sum, ex) => sum + ex.ratePerSec, 0) * bonuses.minerRateMult;
                      const active = miningTargetId === d.id;
                      const empty = d.remaining <= 0;
                      const noTool = tools.length === 0;
                      return (
                        <ExtractResourceButton
                          key={d.id}
                          name={r.name}
                          rarity={r.rarity}
                          remaining={d.remaining}
                          maxAmount={d.maxAmount}
                          intervalLabel={noTool ? `Requer ${EXTRACTION_CLASS_LABELS[r.extractionClass]}` : formatExtractInterval(rate)}
                          active={active}
                          progress={miningProgress}
                          disabled={!inOrbit || empty || noTool}
                          hint={
                            !inOrbit
                              ? 'Entre em órbita para pousar'
                              : empty
                              ? 'Depósito esgotado'
                              : 'Mina pronta no solo firme'
                          }
                          onToggle={() => {
                            if (!inOrbit) return;
                            onExtractGround(planet, d.id);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()
        ) : effectiveTab === 'sede' && canCreateHqHere ? (
          <div className="space-y-3">
            <div className="bg-purple-950/30 border border-purple-500/45 rounded-xl p-3 space-y-1.5">
              <div className="font-semibold text-purple-200 flex items-center gap-1.5 text-sm">
                <Building2 className="w-4 h-4 text-purple-400" />
                Criar Sede (Evolui planeta para Nível 4)
              </div>
              <p className="text-[11px] text-slate-300">
                Este planeta Nível 3 está em sistema sem facção regente. Escolha uma facção em que você possui grau{' '}
                <strong>Honrado (80+ Reputação ou Aliança Formal)</strong> para reivindicar todo este sistema solar.
              </p>
            </div>

            {honoredFactions.length === 0 ? (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs">
                Você ainda não atingiu grau <strong>Honrado</strong> (80+ Reputação ou Aliança Formal) com nenhuma facção.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold">Facção Honrada para Posse:</label>
                  <select
                    value={chosenHqFactionId}
                    onChange={(e) => setSelectedHqFactionId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    {honoredFactions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} (Reputação: {campaign.factionRenown[f.id] ?? 0} ·{' '}
                        {getRenownTierName(campaign.factionRenown[f.id] ?? 0, campaign.formalAlliances.includes(f.id))})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span
                    className={`px-2 py-1 rounded border font-mono-tabular ${
                      campaign.credits >= HEADQUARTERS_COST.credits
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    Créditos: {campaign.credits.toLocaleString('pt-BR')}/{HEADQUARTERS_COST.credits.toLocaleString('pt-BR')}
                  </span>
                  {HEADQUARTERS_COST.resources.map((req) => {
                    const have = campaign.cargo.find((c) => c.resourceId === req.resourceId)?.qty ?? 0;
                    return (
                      <span
                        key={req.resourceId}
                        className={`px-2 py-1 rounded border font-mono-tabular ${
                          have >= req.qty
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        {RESOURCES_BY_ID[req.resourceId]?.name}: {have}/{req.qty}
                      </span>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={!inOrbit || !chosenHqFactionId}
                  onClick={() => onCreateHeadquarters(planet, chosenHqFactionId)}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs cursor-pointer"
                >
                  {!inOrbit
                    ? 'Entre em órbita para construir a sede'
                    : !hasHqResources
                      ? hqPending
                        ? 'A sede já foi iniciada. Faltam os recursos.'
                        : 'Iniciar a sede e marcar os recursos'
                      : `Confirmar a sede em ${planet.name}`}
                </button>
              </div>
            )}
          </div>
        ) : effectiveTab === 'bombardear' && actualLevel >= 2 ? (
          <div className="space-y-3">
            <div className="bg-rose-950/35 border border-rose-500/45 rounded-xl p-3 space-y-1.5">
              <div className="font-semibold text-rose-200 flex items-center gap-1.5 text-sm">
                <Bomb className="w-4 h-4 text-rose-400" />
                Bombardear Planeta (Nível {actualLevel})
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                O fogo orbital pode derrubar a civilização deste mundo. As defesas locais sobem assim que o primeiro tiro cai.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 text-[11px] flex items-center justify-between">
              <span className="text-slate-400">Arma Equipada</span>
              <span className={equippedWeapon?.canBombard ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                {equippedWeapon?.name ?? 'Nenhuma'}{' '}
                {equippedWeapon?.canBombard ? '(Apta a Bombardeio)' : '(Não bombardeia planetas)'}
              </span>
            </div>

            <button
              type="button"
              disabled={!inOrbit || !equippedWeapon?.canBombard}
              onClick={() => onBombardPlanet(planet)}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bomb className="w-4 h-4" />
              {!inOrbit
                ? 'Entre em órbita para bombardear'
                : !equippedWeapon?.canBombard
                ? 'Equipe uma arma de Bombardeio Orbital'
                : `Executar Bombardeio Orbital em ${planet.name}`}
            </button>
          </div>
        ) : effectiveTab === 'comercio_estaleiro' && actualLevel >= 3 ? (
          <div className="space-y-3">
            {/* Switcher Mercado / Estaleiro */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMarketMode('comercio')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                  marketMode === 'comercio'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Mercado & Comércio
              </button>
              <button
                type="button"
                onClick={() => setMarketMode('estaleiro')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                  marketMode === 'estaleiro'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Estaleiro & Projetos
              </button>
            </div>

            {!inOrbit ? (
              <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/40 text-amber-200 text-xs">
                Entre em órbita de {planet.name} para comprar ou vender mercadorias, equipamentos, naves e projetos.
              </div>
            ) : marketMode === 'comercio' ? (
              <div className="space-y-4">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-300">
                    Cada porcentagem compara o preço com o valor de tabela.
                  </span>
                  <span className="font-mono-tabular text-slate-300">
                    Compartimento livre: <strong className="text-cyan-300">{cargoFree} unidades</strong>
                  </span>
                </div>

                {/* Consumíveis */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Suprimentos & Consumíveis
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {CONSUMABLES.filter((con) => isOriginAccessible(con)).map((con) => {
                      const table = con.id === 'mantimentos' ? 1 : con.price;
                      const p = Math.max(1, Math.round(table * priceMult));
                      const owned = campaign.consumables[con.id] ?? 0;
                      const pct = tableDeltaPct(p, table);
                      return (
                        <MarketRow
                          key={con.id}
                          icon={<EquipmentSprite category="consumable" itemId={con.id} size={32} />}
                          name={con.name}
                          rarity={con.rarity ?? 'comum'}
                          qty={owned}
                          pct={pct}
                          tone="compra"
                          detail={con.description}
                          action={
                            <button
                              type="button"
                              disabled={campaign.credits < p}
                              onClick={() => onBuyConsumable(con.id, p)}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                            >
                              {p} créditos
                            </button>
                          }
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    Vender recursos do compartimento
                  </div>
                  {campaign.cargo.length === 0 ? (
                    <div className="text-slate-500 italic">O compartimento não tem recursos.</div>
                  ) : (
                    campaign.cargo.map((c) => {
                      const res = RESOURCES_BY_ID[c.resourceId];
                      if (!res || c.qty <= 0) return null;
                      const rStyle = RARITY_STYLES[res.rarity];
                      const band = resourceSupplyBand(res.id, planet.id, system.planets);
                      const already = campaign.planetSales?.[planet.id]?.[res.id] ?? 0;
                      const quote = quoteSale(res.basePrice, band, bonuses.tradePriceBonus, already, c.qty, true);
                      const pct = tableDeltaPct(quote.nextUnit, res.basePrice);
                      return (
                        <MarketRow
                          key={c.resourceId}
                          icon={<ResourceSprite resourceId={res.id} size={34} />}
                          name={res.name}
                          nameClass={rStyle.text}
                          rarity={res.rarity}
                          qty={c.qty}
                          pct={pct}
                          tone="venda"
                          borderClass={rStyle.border}
                          needed={neededResources.has(res.id)}
                          detail={res.description}
                          action={
                            <span className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => onSellResource(c.resourceId, 1)}
                                className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold cursor-pointer"
                              >
                                {quote.nextUnit} créditos
                              </button>
                              {c.qty > 1 && (
                                <button
                                  type="button"
                                  onClick={() => onSellResource(c.resourceId, c.qty)}
                                  className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
                                >
                                  Tudo {quote.total} créditos
                                </button>
                              )}
                            </span>
                          }
                        />
                      );
                    })
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-cyan-400" />
                    Comprar recursos
                  </div>
                  {(() => {
                    const rows: Array<{ id: string; qty: number; band: 'local' | 'sistema' }> = [];
                    const seen = new Set<string>();
                    for (const deposit of planet.deposits) {
                      if (seen.has(deposit.resourceId)) {
                        const row = rows.find((entry) => entry.id === deposit.resourceId);
                        if (row) row.qty += deposit.remaining;
                        continue;
                      }
                      seen.add(deposit.resourceId);
                      rows.push({ id: deposit.resourceId, qty: deposit.remaining, band: 'local' });
                    }
                    for (const other of system.planets) {
                      if (other.id === planet.id) continue;
                      for (const deposit of other.deposits) {
                        if (seen.has(deposit.resourceId)) continue;
                        seen.add(deposit.resourceId);
                        const stock = system.planets.reduce(
                          (sum, world) =>
                            sum +
                            world.deposits
                              .filter((item) => item.resourceId === deposit.resourceId)
                              .reduce((inner, item) => inner + item.remaining, 0),
                          0
                        );
                        rows.push({ id: deposit.resourceId, qty: stock, band: 'sistema' });
                      }
                    }
                    if (rows.length === 0) {
                      return <div className="text-slate-500 italic">Este mundo não oferece recursos.</div>;
                    }
                    return rows.map((row) => {
                      const res = RESOURCES_BY_ID[row.id];
                      if (!res) return null;
                      const rStyle = RARITY_STYLES[res.rarity];
                      const unitBuy = unitBuyPrice(res.basePrice, row.band, priceMult);
                      const pct = tableDeltaPct(unitBuy, res.basePrice);
                      return (
                        <MarketRow
                          key={row.id}
                          icon={<ResourceSprite resourceId={res.id} size={34} />}
                          name={res.name}
                          nameClass={rStyle.text}
                          rarity={res.rarity}
                          qty={row.qty}
                          pct={pct}
                          tone="compra"
                          borderClass={rStyle.border}
                          needed={neededResources.has(res.id)}
                          detail={res.description}
                          action={
                            <button
                              type="button"
                              disabled={campaign.credits < unitBuy || cargoFree <= 0 || row.qty <= 0}
                              onClick={() => onBuyResource(res.id, 1, unitBuy)}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                            >
                              {unitBuy} créditos
                            </button>
                          }
                        />
                      );
                    });
                  })()}
                </div>

                {/* Equipamentos */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    Equipamentos de Nave & Traje
                  </div>

                  {[
                    { label: 'Armas', cat: 'weapon' as const, items: marketWeapons },
                    { label: 'Escudos', cat: 'shield' as const, items: marketShields },
                    { label: 'Extratores', cat: 'extractor' as const, items: marketExtractors },
                    { label: 'Motores de Salto', cat: 'jumpDrive' as const, items: marketDrives },
                    { label: 'Utilidades', cat: 'utility' as const, items: marketUtilities },
                    { label: 'Trajes & Superfície', cat: 'suit' as const, items: marketSuit },
                  ].map((grp) => (
                    <div key={grp.label} className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-cyan-300">{grp.label}</div>
                      {grp.items.map((item) => {
                        const meta = getEquipmentMeta(grp.cat, item.id);
                        const rStyle = RARITY_STYLES[meta.rarity];
                        const styleDiscount = isFactionMatch((item as { factionStyle?: string }).factionStyle) ? 0.85 : 1.0;
                        const finalP = Math.max(50, Math.round(item.price * styleDiscount * priceMult));

                        let deltaHint: string | null = null;
                        if (grp.cat === 'weapon' && equippedWeapon) {
                          const w = WEAPONS_BY_ID[item.id];
                          if (w) {
                            const diff = w.dps - equippedWeapon.dps;
                            deltaHint = diff === 0 ? 'Igual à arma atual' : `${diff > 0 ? '+' : ''}${diff} DPS vs atual`;
                          }
                        } else if (grp.cat === 'shield' && primaryShield) {
                          const s = SHIELDS_BY_ID[item.id];
                          if (s) {
                            const diff = s.capacity - primaryShield.capacity;
                            deltaHint = diff === 0 ? 'Mesma cap. do escudo 1' : `${diff > 0 ? '+' : ''}${diff} Escudo vs atual`;
                          }
                        } else if (grp.cat === 'jumpDrive' && equippedJumpDrive) {
                          const j = JUMP_DRIVES_BY_ID[item.id];
                          if (j) {
                            const diff = j.jumpRangeLy - equippedJumpDrive.jumpRangeLy;
                            deltaHint = diff === 0 ? 'Igual ao motor atual' : `${diff > 0 ? '+' : ''}${diff} anos-luz de alcance`;
                          }
                        }

                        return (
                          <MarketRow
                            key={item.id}
                            icon={<EquipmentSprite category={grp.cat} itemId={item.id} size={34} />}
                            name={meta.name}
                            nameClass={rStyle.text}
                            rarity={meta.rarity}
                            qty={1}
                            pct={tableDeltaPct(finalP, item.price)}
                            tone="compra"
                            borderClass={rStyle.border}
                            detail={
                              <>
                                <span className="font-mono-tabular text-cyan-300/90">{meta.statsLine}</span>
                                {deltaHint ? ` · ${deltaHint.replace(/^[+-]/, '')}` : ''}
                                {meta.description ? ` — ${meta.description}` : ''}
                              </>
                            }
                            action={
                              <button
                                type="button"
                                disabled={campaign.credits < finalP}
                                onClick={() => onBuyEquipment(grp.cat, item.id, finalP)}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                              >
                                {finalP.toLocaleString('pt-BR')} créditos
                              </button>
                            }
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-2.5">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    Estaleiro & Produção
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Compre o projeto (diagrama técnico) para fabricar usando seus minérios coletados com custo reduzido em créditos, ou compre a nave completa imediatamente.
                  </p>
                </div>

                {/* Projetos */}
                <div className="space-y-2">
                  <div className="font-semibold text-slate-300">Plantas & Produção</div>
                  {BLUEPRINTS.filter(
                    (bp) =>
                      isShipyardBlueprintAccessible(bp) &&
                      (campaign.blueprintsOwned.includes(bp.id) || planetTech >= bp.minPlanetLevel)
                  )
                    .sort((a, b) => {
                      const aOwned = campaign.blueprintsOwned.includes(a.id) ? 1 : 0;
                      const bOwned = campaign.blueprintsOwned.includes(b.id) ? 1 : 0;
                      if (bOwned !== aOwned) return bOwned - aOwned;
                      const aLocal = a.factionExclusiveId === ctrlFac?.id ? 1 : 0;
                      const bLocal = b.factionExclusiveId === ctrlFac?.id ? 1 : 0;
                      return bLocal - aLocal;
                    })
                    .map((bp) => {
                    const owned = campaign.blueprintsOwned.includes(bp.id);
                    const buyPrice = Math.round(bp.price * priceMult);
                    const hasAllResources = bp.requiredResources.every(
                      (req) => (campaign.cargo.find((c) => c.resourceId === req.resourceId)?.qty ?? 0) >= req.qty
                    );
                    const targetMeta = getEquipmentMeta(bp.targetCategory === 'hull' ? 'hull' : bp.targetCategory, bp.targetId);
                    const rStyle = RARITY_STYLES[targetMeta.rarity];
                    return (
                      <div
                        key={bp.id}
                        className={`bg-slate-900/70 border ${rStyle.border} rounded-xl p-2.5 space-y-2`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <EquipmentSprite
                              category={owned ? bp.targetCategory : 'blueprint'}
                              itemId={owned ? bp.targetId : bp.id}
                              size={36}
                            />
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`font-semibold ${rStyle.text}`}>{bp.name}</span>
                                <RarityBadge rarity={targetMeta.rarity} />
                              </div>
                              <div className="text-[10px] font-mono-tabular text-cyan-300">{targetMeta.statsLine}</div>
                              <div className="text-[11px] text-slate-300">{bp.description}</div>
                            </div>
                          </div>
                          {!owned ? (
                            <button
                              type="button"
                              disabled={campaign.credits < buyPrice}
                              onClick={() => onBuyBlueprint(bp.id, buyPrice)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                            >
                              Projeto {buyPrice.toLocaleString('pt-BR')} cr
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!hasAllResources || campaign.credits < bp.craftCredits}
                              onClick={() => onCraftBlueprint(bp.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                            >
                              Construir ({bp.craftCredits.toLocaleString('pt-BR')} cr)
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/70">
                          {bp.requiredResources.map((r) => {
                            const have = campaign.cargo.find((c) => c.resourceId === r.resourceId)?.qty ?? 0;
                            const ok = have >= r.qty;
                            return (
                              <div
                                key={r.resourceId}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                                  ok
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}
                              >
                                <ResourceSprite resourceId={r.resourceId} size={16} />
                                <span>
                                  {RESOURCES_BY_ID[r.resourceId]?.name}: {have}/{r.qty}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comprar Casco Completo */}
                <div className="space-y-2">
                  <div className="font-semibold text-slate-300">Comprar Casco Completo</div>
                  {HULLS.filter(
                    (h) =>
                      isShipyardHullAccessible(h) &&
                      (h.factionExclusiveId === ctrlFac?.id || rarityRank(h.rarity) <= rarityMaxRank + 1)
                  )
                    .sort((a, b) => {
                      const aLocal = a.factionExclusiveId === ctrlFac?.id ? 1 : 0;
                      const bLocal = b.factionExclusiveId === ctrlFac?.id ? 1 : 0;
                      return bLocal - aLocal;
                    })
                    .map((h) => {
                    const hullPrice = Math.round(h.price * priceMult);
                    const rStyle = RARITY_STYLES[h.rarity];
                    const hullFac = h.factionExclusiveId ? FACTIONS_BY_ID[h.factionExclusiveId] : undefined;
                    const switchesFaction = Boolean(hullFac && hullFac.id !== campaign.chosenFactionId);
                    return (
                      <div
                        key={h.id}
                        className={`bg-slate-900/70 border ${rStyle.border} rounded-xl p-2.5 flex items-start justify-between gap-2.5`}
                        style={hullFac ? { borderColor: `${hullFac.color}88` } : undefined}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <HullSprite hullId={h.id} size={40} colorOverride={h.color} />
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold ${rStyle.text}`}>{h.name}</span>
                              <RarityBadge rarity={h.rarity} />
                              <span className="font-mono-tabular text-cyan-200">(1)</span>
                              <PriceMark pct={tableDeltaPct(hullPrice, h.price)} tone="compra" />
                              {hullFac && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold"
                                  style={{
                                    color: hullFac.color,
                                    borderColor: `${hullFac.color}66`,
                                    backgroundColor: `${hullFac.color}1a`,
                                  }}
                                >
                                  <Flag className="w-2.5 h-2.5" />
                                  {hullFac.name}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono-tabular text-cyan-300">
                              Casco {h.maxHull} · Blind. {h.armor} · Vel. {h.speed} · Comb. {h.fuelCapacity} · Carga {h.cargoCapacity}
                            </div>
                            <div className="text-[10px] font-mono-tabular text-slate-400">
                              Slots: Arma {h.weaponSlots} · Esc. {h.defenseSlots} · Ext. {h.extractionSlots} · Util. {h.utilitySlots} · Trip. {h.activeCrewPosts}+{h.reserveQuarters}
                            </div>
                            <div className="text-[11px] text-slate-300">{h.description}</div>
                            {switchesFaction && hullFac && (
                              <div className="text-[10px] font-semibold" style={{ color: hullFac.color }}>
                                Comprar & pilotar esta nave muda sua facção ativa para {hullFac.name}.
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={campaign.credits < hullPrice}
                          onClick={() => onBuyHull(h.id, hullPrice)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                        >
                          {hullPrice.toLocaleString('pt-BR')} créditos
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Vender Naves Sobressalentes */}
                {campaign.ships.length > 1 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="font-semibold text-slate-300">Vender Naves Sobressalentes</div>
                    {campaign.ships
                      .filter((s) => s.uid !== campaign.activeShipUid)
                      .map((s) => {
                        const hd = HULLS_BY_ID[s.hullId] ?? HULLS[0];
                        if (!hd) return null;
                        const sellVal = Math.round(hd.price * 0.72 * (1 + bonuses.tradePriceBonus));
                        const pct = tableDeltaPct(sellVal, hd.price);
                        return (
                          <div
                            key={s.uid}
                            className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-xl p-2 gap-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <HullSprite hullId={s.hullId} size={34} />
                              <div className="min-w-0">
                                <div className="font-medium text-white truncate">{s.customName} ({hd.name})</div>
                                <div className="text-[11px] text-slate-300">
                                  <PriceMark pct={pct} tone="venda" />
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSellShip(s.uid, sellVal)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shrink-0 cursor-pointer"
                            >
                              Vender ({sellVal.toLocaleString('pt-BR')} créditos)
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : effectiveTab === 'conversar' && actualLevel === 2 ? (
          <div className="space-y-3">
            <div className="bg-indigo-950/30 border border-indigo-500/45 rounded-xl p-3 space-y-1.5">
              <div className="font-semibold text-indigo-200 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-indigo-300" />
                Civilização Primitiva (Nível 2)
              </div>
              <p className="text-[11px] text-slate-300">
                Você pode revelar formalmente sua existência para elevar esta civilização para <strong>Nível 3 de baixa tecnologia</strong>, ou iniciar um primeiro contato diplomático em órbita.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!inOrbit}
                onClick={() => onRevealExistence(planet)}
                className="p-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/50 disabled:opacity-45 text-left cursor-pointer"
              >
                <div className="font-semibold text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  Revelar existência
                </div>
                <div className="text-[10px] text-slate-300 mt-1">
                  A civilização sobe ao nível 3, ainda de tecnologia baixa.
                </div>
              </button>

              <button
                type="button"
                disabled={!inOrbit}
                onClick={() => {
                  onTriggerLanding?.(planet.id);
                  onContactCiv(planet);
                }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-45 text-left cursor-pointer"
              >
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Contato Diplomático
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Diálogo de primeiro contato ou troca cultural em órbita
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Conversar (Nível 3–5): Missões & Contratar Tripulação */
          <div className="space-y-4">
            {!inOrbit ? (
              <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/40 text-amber-200 text-xs">
                Entre em órbita de {planet.name} para aceitar missões e contratar tripulação.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-2.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      Painel de Missões · {ctrlFac?.name ?? 'Posto Independente'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Conclua contratos pendentes neste setor ou aceite novas missões diplomáticas e de exploração.
                    </p>
                  </div>

                  {localReadyMissions.map((m) => (
                    <div
                      key={m.id}
                      className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold text-emerald-200 flex items-center gap-1.5">
                          {MISSION_TYPE_ICON[m.type]}
                          <span className="truncate">{m.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-300">
                          {getMissionColoredSummary(m).map((t) => t.text).join('')} · +{m.rewardCredits} cr
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCompleteMission(m)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-[11px] shrink-0 cursor-pointer"
                      >
                        Concluir
                      </button>
                    </div>
                  ))}

                  {localAvailableMissions.map((m) => {
                    const fac = FACTIONS_BY_ID[m.issuerFactionId];
                    return (
                      <div
                        key={m.id}
                        className="bg-slate-900/65 border border-slate-800 rounded-xl p-2.5 flex items-start justify-between gap-2.5"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {MISSION_TYPE_ICON[m.type]}
                            <span className="font-semibold text-white">{m.title}</span>
                            <span className="text-[10px] font-medium" style={{ color: fac?.color ?? '#94a3b8' }}>
                              {fac?.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-snug">{m.description}</p>
                          {m.rewardBlueprintId && (
                            <div className="text-[10px] text-purple-300 font-semibold">
                              Projeto incluído: {BLUEPRINTS_BY_ID[m.rewardBlueprintId]?.name ?? m.rewardItemName}
                            </div>
                          )}
                          <div className="text-[10px] text-amber-300 font-mono-tabular">
                            Recompensa: +{m.rewardCredits} cr · +{m.rewardRenown} Reputação
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAcceptMission(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-[11px] shrink-0 cursor-pointer"
                        >
                          Aceitar
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Contratar Tripulação */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-2.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-400" />
                      Contratar Tripulação (Planeta Nível {actualLevel})
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Ativos: <strong className="text-white">{campaign.crew.filter((c) => c.status === 'ativo').length}/{hullDef.activeCrewPosts}</strong> ·
                      Reserva: <strong className="text-white">{campaign.crew.filter((c) => c.status === 'reserva').length}/{hullDef.reserveQuarters}</strong> ·
                      Cada membro na reserva dá <strong className="text-emerald-400">+5%</strong> ao especialista ativo da função.
                    </div>
                  </div>

                  {crewCandidates.map((cand) => {
                    const activeInRole = campaign.crew.some((c) => c.status === 'ativo' && c.role === cand.role);
                    const activeCount = campaign.crew.filter((c) => c.status === 'ativo').length;
                    const reserveCount = campaign.crew.filter((c) => c.status === 'reserva').length;
                    const canTakeActive = !activeInRole && activeCount < hullDef.activeCrewPosts;
                    const canTakeReserve = reserveCount < hullDef.reserveQuarters;
                    const canHire = (canTakeActive || canTakeReserve) && campaign.credits >= cand.hireCost;
                    const skillTier = cand.skill >= 80 ? 5 : cand.skill >= 60 ? 4 : cand.skill >= 40 ? 3 : cand.skill >= 20 ? 2 : 1;
                    const candSpecies = SPECIES_BY_ID[cand.speciesId];

                    return (
                      <div
                        key={cand.id}
                        className="bg-slate-900/65 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <CrewPortraitSprite speciesId={cand.speciesId} role={cand.role} size={38} />
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-white">{cand.name}</span>
                              <span className="text-cyan-300 font-medium">{ROLE_LABELS[cand.role].label}</span>
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono-tabular ${getLevelStyle(skillTier, 'tech').badge}`}>
                                Perícia {cand.skill}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-300">{ROLE_LABELS[cand.role].desc}</div>
                            <div className="text-[10px] text-slate-400 font-mono-tabular flex flex-wrap gap-x-2">
                              <span>Espécie: {candSpecies?.name}</span>
                              <span>· Consumo: {cand.skill} mant./min</span>
                              <span>· {canTakeActive ? 'Posto Ativo' : canTakeReserve ? 'Reserva (+5%)' : 'Sem vaga'}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!canHire}
                          onClick={() =>
                            onHireCrew({
                              ...cand,
                              status: canTakeActive ? 'ativo' : 'reserva',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                        >
                          {!canTakeActive && !canTakeReserve ? 'Sem vaga' : `Contratar (${cand.hireCost} cr)`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
