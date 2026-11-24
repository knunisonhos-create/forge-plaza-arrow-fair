import React from 'react';
import type { CrewRole, PhenomenonKind, Rarity } from '../types/game';
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
import { PLANET_TYPES_BY_CODE } from '../data/planets';
import { SPECIES_BY_ID } from '../data/lifeforms';
import { RARITY_STYLES } from '../utils/formatting';
import { SpeciesPortraitSvg } from './SpeciesPortraits';

const RESOURCE_PALETTES: Record<string, [string, string, string]> = {
  ferro: ['#94a3b8', '#64748b', '#e2e8f0'],
  cobre: ['#ea580c', '#9a3412', '#fdba74'],
  silicio: ['#6366f1', '#312e81', '#a5b4fc'],
  pedra: ['#78716c', '#44403c', '#d6d3d1'],
  enxofre: ['#eab308', '#854d0e', '#fef08a'],
  quartzo: ['#f472b6', '#9d174d', '#fbcfe8'],
  niquel: ['#a1a1aa', '#52525b', '#f4f4f5'],
  ouro: ['#facc15', '#b45309', '#fef9c3'],
  platina: ['#e2e8f0', '#64748b', '#ffffff'],
  titanio: ['#38bdf8', '#0369a1', '#bae6fd'],
  prata: ['#cbd5e1', '#475569', '#f8fafc'],
  vidro: ['#67e8f9', '#0e7490', '#ecfeff'],
  diamante: ['#22d3ee', '#0284c7', '#ffffff'],
  carbono_cristalizado: ['#334155', '#0f172a', '#94a3b8'],
  metais_densos: ['#64748b', '#1e293b', '#cbd5e1'],
  minerais_sombrios: ['#7c3aed', '#2e1065', '#c4b5fd'],
  minerais_leves: ['#bae6fd', '#38bdf8', '#f0f9ff'],
  hidrogenio: ['#38bdf8', '#0284c7', '#e0f2fe'],
  gas_natural: ['#f97316', '#9a3412', '#fed7aa'],
  metano: ['#2dd4bf', '#115e59', '#99f6e4'],
  helio_3: ['#f59e0b', '#92400e', '#fde68a'],
  gases_exoticos: ['#c084fc', '#6b21a8', '#f3e8ff'],
  eter: ['#e879f9', '#701a75', '#fae8ff'],
  agua: ['#0ea5e9', '#075985', '#7dd3fc'],
  gelo: ['#bae6fd', '#0284c7', '#ffffff'],
  sais: ['#f8fafc', '#94a3b8', '#ffffff'],
  hidrocarbonetos: ['#a855f7', '#3b0764', '#d8b4fe'],
  agua_subterranea: ['#06b6d4', '#164e63', '#67e8f9'],
  magma: ['#ef4444', '#7f1d1d', '#fde047'],
  biomassa: ['#22c55e', '#14532d', '#86efac'],
  madeira: ['#b45309', '#451a03', '#fcd34d'],
  turfa: ['#65a30d', '#365314', '#bef264'],
  fungos: ['#a855f7', '#581c87', '#e9d5ff'],
  sementes: ['#4ade80', '#166534', '#fef08a'],
  compostos_organicos: ['#10b981', '#064e3b', '#6ee7b7'],
  biomassa_marinha: ['#14b8a6', '#134e4a', '#5eead4'],
  biomassa_viva: ['#f43f5e', '#881337', '#fda4af'],
  enzimas: ['#84cc16', '#3f6212', '#ecfccb'],
  couro: ['#d97706', '#78350f', '#fde68a'],
  ossos: ['#f5f5f4', '#78716c', '#ffffff'],
  toxinas: ['#a3e635', '#365314', '#d9f99d'],
  esporos: ['#c084fc', '#4c1d95', '#f5d0fe'],
  compostos_luminosos: ['#22d3ee', '#0e7490', '#a7f3d0'],
  uranio: ['#84cc16', '#365314', '#ecfccb'],
  plutonio: ['#22c55e', '#052e16', '#bef264'],
  isotopos: ['#eab308', '#713f12', '#fef08a'],
  cristais_energeticos: ['#38bdf8', '#1e3a8a', '#e0f2fe'],
  plasma: ['#e879f9', '#701a75', '#f5d0fe'],
  energia: ['#facc15', '#854d0e', '#ffffff'],
  antimateria: ['#f43f5e', '#4c0519', '#fecdd3'],
  materia_fantasma: ['#818cf8', '#1e1b4b', '#e0e7ff'],
  materia_exotica: ['#ec4899', '#500724', '#fbcfe8'],
  materia_escura: ['#a855f7', '#09090b', '#e9d5ff'],
  cristal_fenda: ['#22d3ee', '#4c1d95', '#f0abfc'],
  cristais_celestiais: ['#fbbf24', '#78350f', '#fef9c3'],
  nucleo_estelar: ['#fb923c', '#7c2d12', '#fef08a'],
  cristais_refletores: ['#e2e8f0', '#334155', '#ffffff'],
  cristais_flutuacao: ['#67e8f9', '#0c4a6e', '#bbf7d0'],
  aerogel_vivo: ['#2dd4bf', '#134e4a', '#ccfbf1'],
  cronocristais: ['#14b8a6', '#134e4a', '#fde047'],
  reliquias: ['#f59e0b', '#78350f', '#fef3c7'],
  tecnologia_antiga: ['#06b6d4', '#083344', '#a5f3fc'],
  ligas_avancadas: ['#60a5fa', '#1e3a8a', '#dbeafe'],
  artefatos: ['#fbbf24', '#451a03', '#38bdf8'],
};

function getRarityFrameClass(rarity: Rarity): string {
  switch (rarity) {
    case 'lendário':
      return 'border-amber-400/70 bg-amber-950/35';
    case 'épico':
      return 'border-purple-400/60 bg-purple-950/35';
    case 'raro':
      return 'border-sky-400/55 bg-sky-950/35';
    case 'incomum':
      return 'border-emerald-400/50 bg-emerald-950/35';
    case 'único':
      return 'border-rose-400/70 bg-rose-950/35';
    default:
      return 'border-slate-700/80 bg-slate-900/90';
  }
}

export const ResourceSprite: React.FC<{
  resourceId: string;
  size?: number;
  className?: string;
}> = ({ resourceId, size = 32, className = '' }) => {
  const res = RESOURCES_BY_ID[resourceId];
  const rarity: Rarity = res?.rarity ?? 'comum';
  const [c1, c2, c3] = RESOURCE_PALETTES[resourceId] ?? ['#94a3b8', '#475569', '#e2e8f0'];
  const ext = res?.extractionClass ?? 'broca_mineral';

  return (
    <div
      className={`shrink-0 rounded-lg border flex items-center justify-center p-0.5 ${getRarityFrameClass(rarity)} ${className}`}
      style={{ width: size, height: size }}
      title={res?.name}
    >
      <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
        {ext === 'broca_mineral' && (
          <>
            <rect x="5" y="2" width="4" height="2" fill={c3} />
            <rect x="4" y="4" width="7" height="3" fill={c1} />
            <rect x="3" y="6" width="9" height="5" fill={c1} />
            <rect x="9" y="5" width="3" height="6" fill={c2} />
            <rect x="4" y="11" width="8" height="3" fill={c2} />
            <rect x="5" y="5" width="2" height="2" fill={c3} />
            <rect x="11" y="3" width="2" height="3" fill={c3} />
          </>
        )}
        {ext === 'coletor_atmosferico' && (
          <>
            <rect x="6" y="1" width="4" height="2" fill="#94a3b8" />
            <rect x="4" y="3" width="8" height="2" fill="#64748b" />
            <rect x="4" y="5" width="8" height="8" fill={c2} />
            <rect x="5" y="6" width="6" height="6" fill={c1} />
            <rect x="6" y="7" width="2" height="4" fill={c3} />
            <rect x="4" y="13" width="8" height="2" fill="#475569" />
          </>
        )}
        {ext === 'bomba_liquida' && (
          <>
            <rect x="6" y="1" width="4" height="2" fill="#cbd5e1" />
            <rect x="5" y="3" width="6" height="2" fill="#64748b" />
            <rect x="4" y="5" width="8" height="8" fill="#1e293b" />
            <rect x="5" y="7" width="6" height="5" fill={c1} />
            <rect x="5" y="9" width="6" height="3" fill={c2} />
            <rect x="6" y="7" width="2" height="2" fill={c3} />
            <rect x="4" y="13" width="8" height="2" fill="#94a3b8" />
          </>
        )}
        {ext === 'coletor_biologico' && (
          <>
            <rect x="7" y="2" width="3" height="2" fill={c3} />
            <rect x="5" y="4" width="6" height="3" fill={c1} />
            <rect x="4" y="6" width="8" height="6" fill={c1} />
            <rect x="8" y="6" width="4" height="6" fill={c2} />
            <rect x="6" y="7" width="2" height="3" fill={c3} />
            <rect x="5" y="12" width="6" height="2" fill={c2} />
          </>
        )}
        {ext === 'extrator_energia' && (
          <>
            <rect x="7" y="1" width="2" height="2" fill={c3} />
            <rect x="5" y="3" width="6" height="2" fill={c1} />
            <rect x="3" y="5" width="10" height="6" fill={c2} />
            <rect x="5" y="5" width="6" height="6" fill={c1} />
            <rect x="6" y="6" width="4" height="4" fill={c3} />
            <rect x="5" y="11" width="6" height="2" fill={c1} />
            <rect x="7" y="13" width="2" height="2" fill={c3} />
          </>
        )}
        {ext === 'escavador_arqueologico' && (
          <>
            <rect x="7" y="1" width="2" height="2" fill={c3} />
            <rect x="5" y="3" width="6" height="3" fill={c1} />
            <rect x="4" y="6" width="8" height="7" fill={c2} />
            <rect x="5" y="7" width="6" height="4" fill={c1} />
            <rect x="7" y="8" width="2" height="2" fill={c3} />
            <rect x="3" y="13" width="10" height="2" fill="#475569" />
          </>
        )}
      </svg>
    </div>
  );
};

export const HullSprite: React.FC<{
  hullId: string;
  size?: number;
  className?: string;
  colorOverride?: string;
}> = ({ hullId, size = 38, className = '', colorOverride }) => {
  const hullColors: Record<string, { body: string; dark: string; trim: string; glow: string; rarity: Rarity }> = {
    balsa_estelar_civil: { body: '#94a3b8', dark: '#475569', trim: '#cbd5e1', glow: '#38bdf8', rarity: 'comum' },
    explorador_silvar: { body: '#34d399', dark: '#065f46', trim: '#a7f3d0', glow: '#22d3ee', rarity: 'incomum' },
    cargueiro_mercantil: { body: '#fbbf24', dark: '#92400e', trim: '#fde68a', glow: '#38bdf8', rarity: 'incomum' },
    corveta_patrulha: { body: '#38bdf8', dark: '#075985', trim: '#e0f2fe', glow: '#f43f5e', rarity: 'raro' },
    minerador_pesado: { body: '#f97316', dark: '#7c2d12', trim: '#fdba74', glow: '#facc15', rarity: 'raro' },
    cruzador_guerra: { body: '#c084fc', dark: '#581c87', trim: '#f3e8ff', glow: '#fb7185', rarity: 'épico' },
    arca_colonial: { body: '#818cf8', dark: '#312e81', trim: '#fde047', glow: '#34d399', rarity: 'épico' },
    fragata_dobra_metalocto: { body: '#facc15', dark: '#78350f', trim: '#fef9c3', glow: '#22d3ee', rarity: 'lendário' },
  };
  const hullDef = HULLS_BY_ID[hullId];
  const spColor = hullDef?.speciesExclusiveId ? SPECIES_BY_ID[hullDef.speciesExclusiveId]?.color : undefined;
  const basePal = hullColors[hullId] ?? {
    body: hullDef?.color ?? spColor ?? '#38bdf8',
    dark: '#1e293b',
    trim: '#f8fafc',
    glow: hullDef?.color ?? spColor ?? '#38bdf8',
    rarity: hullDef?.rarity ?? 'raro',
  };
  const pal = colorOverride
    ? { ...basePal, body: colorOverride, glow: colorOverride }
    : basePal;

  const isRaceHull = hullId.startsWith('nave_') && !hullId.startsWith('nave_fac_');
  const shape = hullDef?.hullShape;

  return (
    <div
      className={`shrink-0 rounded-lg border flex items-center justify-center p-0.5 ${getRarityFrameClass(pal.rarity)} ${className}`}
      style={{ width: size, height: size, borderColor: colorOverride ? `${colorOverride}88` : undefined }}
    >
      <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
        {isRaceHull ? (
          <>
            {/* Bespoke Race Special Vessel */}
            <rect x="7" y="1" width="2" height="3" fill={pal.trim} />
            <rect x="6" y="4" width="4" height="7" fill={pal.body} />
            <rect x="3" y="7" width="3" height="4" fill={pal.body} />
            <rect x="10" y="7" width="3" height="4" fill={pal.body} />
            <rect x="2" y="9" width="2" height="3" fill={pal.dark} />
            <rect x="12" y="9" width="2" height="3" fill={pal.dark} />
            <rect x="7" y="5" width="2" height="2" fill="#e0f2fe" />
            <rect x="5" y="11" width="6" height="2" fill={pal.dark} />
            <rect x="5" y="13" width="2" height="2" fill={pal.glow} />
            <rect x="9" y="13" width="2" height="2" fill={pal.glow} />
          </>
        ) : shape === 'cargueiro' || hullId === 'cargueiro_mercantil' || hullId === 'minerador_pesado' || hullId === 'arca_colonial' ? (
          <>
            {/* Heavy industrial/cargo silhouette */}
            <rect x="6" y="1" width="4" height="3" fill={pal.trim} />
            <rect x="4" y="4" width="8" height="8" fill={pal.body} />
            <rect x="2" y="6" width="2" height="5" fill={pal.dark} />
            <rect x="12" y="6" width="2" height="5" fill={pal.dark} />
            <rect x="6" y="4" width="4" height="2" fill="#0ea5e9" />
            <rect x="5" y="7" width="6" height="4" fill={pal.dark} />
            <rect x="4" y="12" width="3" height="2" fill={pal.glow} />
            <rect x="9" y="12" width="3" height="2" fill={pal.glow} />
          </>
        ) : shape === 'cruzador' || shape === 'fragata' || hullId === 'fragata_dobra_metalocto' || hullId === 'cruzador_guerra' ? (
          <>
            {/* Heavy warship / flagship */}
            <rect x="7" y="1" width="2" height="3" fill={pal.trim} />
            <rect x="6" y="3" width="4" height="3" fill={pal.body} />
            <rect x="4" y="6" width="8" height="5" fill={pal.body} />
            <rect x="2" y="8" width="2" height="4" fill={pal.dark} />
            <rect x="12" y="8" width="2" height="4" fill={pal.dark} />
            <rect x="7" y="5" width="2" height="3" fill="#22d3ee" />
            <rect x="5" y="11" width="6" height="2" fill={pal.dark} />
            <rect x="5" y="13" width="2" height="2" fill={pal.glow} />
            <rect x="9" y="13" width="2" height="2" fill={pal.glow} />
          </>
        ) : (
          <>
            {/* Agile fighter / explorer / shuttle */}
            <rect x="7" y="2" width="2" height="3" fill={pal.trim} />
            <rect x="6" y="5" width="4" height="6" fill={pal.body} />
            <rect x="4" y="8" width="2" height="3" fill={pal.dark} />
            <rect x="10" y="8" width="2" height="3" fill={pal.dark} />
            <rect x="7" y="6" width="2" height="2" fill="#38bdf8" />
            <rect x="6" y="11" width="4" height="2" fill={pal.dark} />
            <rect x="7" y="13" width="2" height="2" fill={pal.glow} />
          </>
        )}
      </svg>
    </div>
  );
};

export const EquipmentSprite: React.FC<{
  category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit' | 'consumable' | 'blueprint' | 'hull';
  itemId: string;
  size?: number;
  className?: string;
}> = ({ category, itemId, size = 34, className = '' }) => {
  if (category === 'hull') {
    return <HullSprite hullId={itemId} size={size} className={className} />;
  }

  let rarity: Rarity = 'comum';
  let accent = '#38bdf8';
  let secondary = '#0369a1';

  if (category === 'weapon') {
    const w = WEAPONS_BY_ID[itemId];
    rarity = w?.rarity ?? 'comum';
    accent = w?.color ?? '#38bdf8';
    secondary = '#475569';
  } else if (category === 'shield') {
    const s = SHIELDS_BY_ID[itemId];
    rarity = s?.rarity ?? 'comum';
    accent = RARITY_STYLES[rarity].dot;
    secondary = '#1e293b';
  } else if (category === 'jumpDrive') {
    const j = JUMP_DRIVES_BY_ID[itemId];
    rarity = j?.rarity ?? 'comum';
    accent = RARITY_STYLES[rarity].dot;
  } else if (category === 'extractor') {
    const e = EXTRACTORS_BY_ID[itemId];
    rarity = e?.rarity ?? 'comum';
    accent = RARITY_STYLES[rarity].dot;
  } else if (category === 'utility') {
    const u = UTILITY_BY_ID[itemId];
    rarity = u?.rarity ?? 'comum';
    accent = RARITY_STYLES[rarity].dot;
  } else if (category === 'suit') {
    const g = SUIT_GEAR_BY_ID[itemId];
    rarity = g?.rarity ?? 'comum';
    accent = RARITY_STYLES[rarity].dot;
  } else if (category === 'consumable') {
    const c = CONSUMABLES_BY_ID[itemId];
    rarity = c?.rarity ?? (c?.kind === 'especial_raca' ? 'raro' : 'incomum');
    accent =
      c?.kind === 'especial_raca'
        ? (c.speciesExclusiveId ? SPECIES_BY_ID[c.speciesExclusiveId]?.color : undefined) ?? '#fbbf24'
        : c?.kind === 'reparo'
        ? '#4ade80'
        : c?.kind === 'combustivel'
        ? '#f59e0b'
        : c?.kind === 'escudo_desc'
        ? '#38bdf8'
        : c?.kind === 'sonda'
        ? '#c084fc'
        : c?.kind === 'antidoto'
        ? '#a3e635'
        : '#38bdf8';
  } else if (category === 'blueprint') {
    rarity = 'raro';
    accent = '#22d3ee';
  }

  return (
    <div
      className={`shrink-0 rounded-lg border flex items-center justify-center p-0.5 ${getRarityFrameClass(rarity)} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
        {category === 'weapon' && (
          <>
            <rect x="2" y="6" width="5" height="5" fill="#475569" />
            <rect x="4" y="4" width="6" height="3" fill="#94a3b8" />
            <rect x="7" y="5" width="5" height="2" fill={secondary} />
            <rect x="12" y="5" width="3" height="2" fill={accent} />
            <rect x="3" y="11" width="3" height="3" fill="#334155" />
            <rect x="9" y="8" width="3" height="2" fill={accent} />
          </>
        )}
        {category === 'shield' && (
          <>
            <rect x="5" y="2" width="6" height="2" fill={accent} />
            <rect x="3" y="4" width="10" height="6" fill={accent} fillOpacity="0.35" />
            <rect x="3" y="4" width="2" height="6" fill={accent} />
            <rect x="11" y="4" width="2" height="6" fill={accent} />
            <rect x="6" y="5" width="4" height="4" fill="#e2e8f0" />
            <rect x="4" y="10" width="8" height="2" fill={accent} />
            <rect x="6" y="12" width="4" height="2" fill={accent} />
          </>
        )}
        {category === 'jumpDrive' && (
          <>
            <rect x="5" y="2" width="6" height="2" fill="#94a3b8" />
            <rect x="3" y="4" width="2" height="8" fill="#64748b" />
            <rect x="11" y="4" width="2" height="8" fill="#64748b" />
            <rect x="5" y="4" width="6" height="8" fill={accent} fillOpacity="0.3" />
            <rect x="6" y="6" width="4" height="4" fill={accent} />
            <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
            <rect x="5" y="12" width="6" height="2" fill="#94a3b8" />
          </>
        )}
        {category === 'extractor' && (
          <>
            <rect x="6" y="2" width="4" height="3" fill="#94a3b8" />
            <rect x="4" y="5" width="8" height="3" fill="#64748b" />
            <rect x="5" y="8" width="6" height="2" fill={accent} />
            <rect x="6" y="10" width="4" height="2" fill="#cbd5e1" />
            <rect x="7" y="12" width="2" height="3" fill={accent} />
          </>
        )}
        {category === 'utility' && (
          <>
            <rect x="4" y="3" width="8" height="10" fill="#334155" />
            <rect x="5" y="4" width="6" height="8" fill="#475569" />
            <rect x="6" y="5" width="4" height="3" fill={accent} />
            <rect x="5" y="9" width="2" height="2" fill="#94a3b8" />
            <rect x="9" y="9" width="2" height="2" fill={accent} />
          </>
        )}
        {category === 'suit' && (
          <>
            <rect x="5" y="2" width="6" height="5" fill="#cbd5e1" />
            <rect x="6" y="3" width="4" height="3" fill={accent} />
            <rect x="4" y="7" width="8" height="5" fill="#64748b" />
            <rect x="6" y="8" width="4" height="2" fill={accent} />
            <rect x="4" y="12" width="3" height="2" fill="#475569" />
            <rect x="9" y="12" width="3" height="2" fill="#475569" />
          </>
        )}
        {category === 'consumable' && (
          <>
            <rect x="6" y="2" width="4" height="2" fill="#cbd5e1" />
            <rect x="4" y="4" width="8" height="10" fill="#1e293b" />
            <rect x="5" y="5" width="6" height="8" fill={accent} fillOpacity="0.35" />
            <rect x="7" y="6" width="2" height="6" fill={accent} />
            <rect x="5" y="8" width="6" height="2" fill={accent} />
          </>
        )}
        {category === 'blueprint' && (
          <>
            <rect x="2" y="2" width="12" height="12" fill="#083344" />
            <rect x="3" y="3" width="10" height="10" fill="#0e7490" fillOpacity="0.4" />
            <rect x="7" y="4" width="2" height="2" fill="#67e8f9" />
            <rect x="5" y="6" width="6" height="4" fill="#22d3ee" />
            <rect x="4" y="9" width="8" height="2" fill="#a5f3fc" />
          </>
        )}
      </svg>
    </div>
  );
};

export const PlanetSprite: React.FC<{
  typeCode: string;
  level?: number;
  hasExtractorColony?: boolean;
  hasRings?: boolean;
  size?: number;
  className?: string;
}> = ({ typeCode, level = 0, hasExtractorColony = false, hasRings = false, size = 44, className = '' }) => {
  const isDestroyed = level === -1;
  const pt = PLANET_TYPES_BY_CODE[isDestroyed ? 'TX01' : typeCode] ?? PLANET_TYPES_BY_CODE['TX01'];
  const [c1, c2, c3] = pt.palette;
  const atmo = pt.atmosphereColor;

  return (
    <div
      className={`shrink-0 rounded-xl border ${
        isDestroyed ? 'border-orange-500/75 bg-red-950/50' : 'border-slate-700/80 bg-slate-950/90'
      } flex items-center justify-center p-0.5 relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
        {isDestroyed ? (
          <>
            {/* Volcanic ember glow */}
            <rect x="4" y="2" width="7" height="1" fill="#ea580c" fillOpacity="0.45" />
            <rect x="4" y="13" width="8" height="1" fill="#dc2626" fillOpacity="0.45" />
            {/* Irregular shattered basalt crust (chipped chunks missing) */}
            <rect x="5" y="3" width="5" height="2" fill="#272024" />
            <rect x="3" y="5" width="9" height="6" fill="#1f191c" />
            <rect x="4" y="4" width="7" height="8" fill="#292126" />
            <rect x="11" y="6" width="2" height="4" fill="#171215" />
            <rect x="5" y="11" width="6" height="2" fill="#1c161a" />
            {/* Chipped detached rock fragments */}
            <rect x="12" y="3" width="2" height="2" fill="#3b2f35" />
            <rect x="2" y="11" width="2" height="1" fill="#3b2f35" />
            {/* Deep molten lava cracks */}
            <rect x="5" y="4" width="1" height="2" fill="#ea580c" />
            <rect x="6" y="6" width="3" height="1" fill="#f97316" />
            <rect x="8" y="7" width="1" height="3" fill="#fde047" />
            <rect x="4" y="8" width="3" height="1" fill="#ef4444" />
            <rect x="9" y="10" width="2" height="1" fill="#f97316" />
            <rect x="7" y="5" width="1" height="1" fill="#fef08a" />
            <rect x="10" y="7" width="2" height="1" fill="#ea580c" />
          </>
        ) : (
          <>
            {/* Atmosphere glow corners */}
            <rect x="5" y="2" width="6" height="1" fill={atmo} fillOpacity="0.45" />
            <rect x="5" y="13" width="6" height="1" fill={atmo} fillOpacity="0.45" />
            {/* Disc */}
            <rect x="5" y="3" width="6" height="10" fill={c1} />
            <rect x="3" y="5" width="10" height="6" fill={c1} />
            <rect x="4" y="4" width="8" height="8" fill={c1} />
            {/* Shading */}
            <rect x="8" y="4" width="4" height="8" fill={c2} />
            <rect x="10" y="5" width="3" height="6" fill={c2} />
            {/* Surface details / clouds */}
            <rect x="5" y="5" width="3" height="2" fill={c3} />
            {pt.hasClouds && <rect x="4" y="8" width="5" height="1" fill="#ffffff" fillOpacity="0.55" />}
            {/* City lights for Level 3-5 */}
            {level >= 3 && (
              <>
                <rect x="6" y="7" width="1" height="1" fill="#fef08a" />
                <rect x="9" y="9" width="1" height="1" fill="#fbbf24" />
              </>
            )}
            {level >= 4 && (
              <>
                <rect x="8" y="6" width="1" height="1" fill="#fef08a" />
                <rect x="10" y="8" width="1" height="1" fill="#fde047" />
              </>
            )}
            {level >= 5 && (
              <>
                <rect x="7" y="8" width="2" height="1" fill="#fef9c3" />
                <rect x="5" y="10" width="2" height="1" fill="#fbbf24" />
              </>
            )}
            {/* Planetary rings */}
            {hasRings && (
              <>
                <rect x="1" y="9" width="2" height="1" fill={c3} />
                <rect x="13" y="6" width="2" height="1" fill={c3} />
                <rect x="2" y="8" width="12" height="1" fill={c3} fillOpacity="0.6" />
              </>
            )}
            {/* Extractor Colony rig beacon */}
            {hasExtractorColony && (
              <>
                <rect x="7" y="1" width="2" height="2" fill="#f59e0b" />
                <rect x="6" y="2" width="4" height="1" fill="#fef08a" />
              </>
            )}
          </>
        )}
      </svg>
    </div>
  );
};

export const PhenomenonSprite: React.FC<{
  kind: PhenomenonKind;
  size?: number;
  className?: string;
}> = ({ kind, size = 40, className = '' }) => {
  return (
    <div
      className={`shrink-0 rounded-xl border border-amber-500/40 bg-slate-950/90 flex items-center justify-center p-0.5 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
        {kind === 'buraco_negro' && (
          <>
            <rect x="4" y="3" width="8" height="10" fill="#a855f7" />
            <rect x="2" y="6" width="12" height="4" fill="#e879f9" />
            <rect x="5" y="5" width="6" height="6" fill="#020617" />
            <rect x="1" y="7" width="14" height="2" fill="#fde047" fillOpacity="0.7" />
            <rect x="6" y="6" width="4" height="4" fill="#000000" />
          </>
        )}
        {kind === 'nebulosa_sistema' && (
          <>
            <rect x="3" y="4" width="6" height="5" fill="#ec4899" fillOpacity="0.65" />
            <rect x="6" y="6" width="7" height="6" fill="#06b6d4" fillOpacity="0.65" />
            <rect x="5" y="5" width="5" height="5" fill="#a855f7" fillOpacity="0.75" />
            <rect x="4" y="6" width="1" height="1" fill="#ffffff" />
            <rect x="10" y="9" width="1" height="1" fill="#fef08a" />
            <rect x="8" y="4" width="1" height="1" fill="#ffffff" />
          </>
        )}
        {kind === 'cometa_errante' && (
          <>
            <rect x="2" y="10" width="4" height="4" fill="#7dd3fc" />
            <rect x="3" y="11" width="2" height="2" fill="#ffffff" />
            <rect x="5" y="8" width="4" height="3" fill="#38bdf8" />
            <rect x="8" y="5" width="4" height="3" fill="#0284c7" />
            <rect x="11" y="2" width="3" height="3" fill="#38bdf8" fillOpacity="0.5" />
          </>
        )}
        {kind === 'campo_meteoros' && (
          <>
            <rect x="3" y="3" width="4" height="4" fill="#94a3b8" />
            <rect x="4" y="4" width="1" height="1" fill="#e2e8f0" />
            <rect x="9" y="5" width="5" height="4" fill="#78716c" />
            <rect x="10" y="6" width="2" height="1" fill="#d6d3d1" />
            <rect x="4" y="10" width="5" height="4" fill="#64748b" />
            <rect x="5" y="11" width="1" height="1" fill="#cbd5e1" />
          </>
        )}
        {kind === 'destrocos_nave' && (
          <>
            <rect x="3" y="6" width="5" height="4" fill="#64748b" />
            <rect x="9" y="5" width="4" height="3" fill="#475569" />
            <rect x="7" y="9" width="5" height="3" fill="#94a3b8" />
            <rect x="5" y="7" width="1" height="1" fill="#fbbf24" />
            <rect x="10" y="6" width="1" height="1" fill="#f43f5e" />
          </>
        )}
      </svg>
    </div>
  );
};

const ROLE_TRIM: Record<CrewRole, string> = {
  piloto_navegador: '#38bdf8',
  piloto_combate: '#f43f5e',
  engenheiro: '#f59e0b',
  negociador: '#facc15',
  explorador: '#34d399',
  minerador: '#fb923c',
  diplomata: '#c084fc',
  mestre_tripulacao: '#2dd4bf',
};

export const CrewPortraitSprite: React.FC<{
  speciesId: string;
  role: CrewRole;
  size?: number;
  className?: string;
}> = ({ speciesId, role, size = 36, className = '' }) => {
  const sp = SPECIES_BY_ID[speciesId];
  const suit = ROLE_TRIM[role] ?? '#38bdf8';

  return (
    <div
      className={`shrink-0 rounded-lg border bg-slate-950 overflow-hidden relative ${className}`}
      style={{ width: size, height: size, borderColor: `${suit}99` }}
      title={sp?.name}
    >
      <SpeciesPortraitSvg speciesId={speciesId} name={sp?.name ?? speciesId} />
      <span
        className="absolute bottom-0 inset-x-0 h-1"
        style={{ backgroundColor: suit }}
      />
    </div>
  );
};

export const FactionCrest: React.FC<{
  color: string;
  axis: 'Tradicionalistas' | 'Reformistas' | 'Mercantil' | 'Militar';
  size?: number;
  className?: string;
}> = ({ color, axis, size = 28, className = '' }) => {
  return (
    <div
      className={`shrink-0 rounded-lg border border-slate-700/80 bg-slate-950/90 flex items-center justify-center p-0.5 ${className}`}
      style={{ width: size, height: size, borderColor: `${color}66` }}
    >
      <svg viewBox="0 0 16 16" className="w-full h-full" shapeRendering="crispEdges">
        <rect x="3" y="2" width="10" height="8" fill={color} fillOpacity="0.28" />
        <rect x="4" y="10" width="8" height="3" fill={color} fillOpacity="0.28" />
        <rect x="6" y="13" width="4" height="1" fill={color} fillOpacity="0.5" />
        <rect x="3" y="2" width="1" height="8" fill={color} />
        <rect x="12" y="2" width="1" height="8" fill={color} />
        <rect x="4" y="2" width="8" height="1" fill={color} />
        {axis === 'Militar' && (
          <>
            <rect x="7" y="4" width="2" height="7" fill="#f8fafc" />
            <rect x="5" y="9" width="6" height="1" fill={color} />
          </>
        )}
        {axis === 'Mercantil' && (
          <>
            <rect x="6" y="5" width="4" height="4" fill="#fbbf24" />
            <rect x="7" y="4" width="2" height="6" fill="#fef08a" />
          </>
        )}
        {axis === 'Tradicionalistas' && (
          <>
            <rect x="5" y="5" width="6" height="2" fill={color} />
            <rect x="7" y="4" width="2" height="7" fill="#fde68a" />
          </>
        )}
        {axis === 'Reformistas' && (
          <>
            <rect x="7" y="4" width="2" height="6" fill="#38bdf8" />
            <rect x="5" y="6" width="6" height="2" fill="#e0f2fe" />
          </>
        )}
      </svg>
    </div>
  );
};
