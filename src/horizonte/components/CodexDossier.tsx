import { X } from 'lucide-react';
import {
  CREATURES_BY_ID,
  FACTIONS_BY_ID,
  LIFE_FORMS_BY_ID,
  SPECIES_BY_ID,
} from '../data/lifeforms';
import type { LifeFormId } from '../types/game';
import { PLANET_TYPES_BY_CODE } from '../data/planets';
import { RESOURCES_BY_ID } from '../data/items';
import { SPECIAL_ABILITIES_BY_ID } from '../data/originPerks';
import { RARITY_STYLES } from '../utils/formatting';
import { CreatureCard } from './CreatureCard';

export type CodexDetail = { kind: 'faction' | 'species' | 'life' | 'planet' | 'creature' | 'ability'; id: string } | {
  kind: 'item';
  id: string;
  name: string;
  rarity: string;
  description: string;
  price?: number;
  extra?: string;
};

function worldNames(codes: string[]): string {
  const names = codes.map((code) => PLANET_TYPES_BY_CODE[code]?.name).filter(Boolean);
  return names.length ? names.join(', ') : 'rotas ainda não cartografadas';
}

function rarityTone(rarity: string | undefined) {
  if (!rarity) return RARITY_STYLES.comum;
  return RARITY_STYLES[rarity as keyof typeof RARITY_STYLES] ?? RARITY_STYLES.comum;
}

export function CodexDossier({ detail, onClose }: { detail: CodexDetail; onClose: () => void }) {
  let title = 'Registro';
  let kicker = 'Arquivo de bordo';
  let titleClass = 'text-cyan-100';
  let paragraphs: string[] = [];
  let chips: Array<{ label: string; className: string }> = [];
  let cover: string | null = null;
  let portrait: { cardId: string; kind: 'species' | 'creature'; name: string; lifeFormId: LifeFormId; description: string } | null = null;

  if (detail.kind === 'faction') {
    const fac = FACTIONS_BY_ID[detail.id];
    const sp = fac ? SPECIES_BY_ID[fac.speciesId] : undefined;
    title = fac?.name ?? 'Facção';
    kicker = 'Despacho diplomático';
    titleClass = 'text-white';
    if (fac && sp) {
      portrait = {
        cardId: `species_${sp.id}`,
        kind: 'species',
        name: sp.name,
        lifeFormId: sp.lifeFormId,
        description: sp.description,
      };
      paragraphs = [
        `Quem cruza a fronteira de ${fac.name} não encontra um estatuto. Encontra um modo de pensar. São ${fac.axis.toLowerCase()}, de mão ${fac.techStyle}, e a voz que fala por eles é a da raça ${sp.name}.`,
        `No convés, o que se ouve: ${fac.customs}`,
        `O que cobram de quem desembarca: ${fac.laws}`,
        `O que entra e sai dos porões: ${fac.economyFocus}.`,
        `Frentes abertas: ${fac.warsWith.map((id) => FACTIONS_BY_ID[id]?.name ?? 'uma potência sem nome').join(', ') || 'nenhuma que o arquivo reconheça'}.`,
        'Uma aliança formal não olha para a origem da sua nave nem para a distância. Olha para a sua reputação com esta facção — e para a ausência de guerra.',
      ];
      chips = [
        { label: sp.name, className: 'border-cyan-400/40 text-cyan-200' },
        { label: fac.axis, className: 'border-amber-400/40 text-amber-200' },
      ];
    }
  } else if (detail.kind === 'species') {
    const sp = SPECIES_BY_ID[detail.id];
    const lf = sp ? LIFE_FORMS_BY_ID[sp.lifeFormId] : undefined;
    title = sp?.name ?? 'Raça';
    kicker = 'Relato xenológico';
    titleClass = 'text-cyan-100';
    if (sp) {
      portrait = {
        cardId: `species_${sp.id}`,
        kind: 'species',
        name: sp.name,
        lifeFormId: sp.lifeFormId,
        description: sp.description,
      };
      paragraphs = [
        sp.description,
        `O temperamento registrado em campo é ${sp.temperament}. Não é um rótulo de laboratório: é o que a equipe sente quando a escotilha abre e eles já estão olhando.`,
        lf
          ? `A forma de vida ${lf.name} explica o corpo antes de explicar a política. ${lf.biology}`
          : '',
        `Traços que a expedição aprendeu a respeitar: ${sp.traits.join(', ')}.`,
      ].filter(Boolean);
    }
  } else if (detail.kind === 'life') {
    const lf = LIFE_FORMS_BY_ID[detail.id as keyof typeof LIFE_FORMS_BY_ID];
    title = lf?.name ?? 'Forma de vida';
    kicker = 'Caderno de biologia';
    titleClass = 'text-emerald-200';
    if (lf) {
      paragraphs = [
        lf.biology,
        lf.nicheSummary,
        `Onde o arquivo espera encontrá-los: ${worldNames(lf.compatiblePlanetCodes)}.`,
      ];
    }
  } else if (detail.kind === 'planet') {
    const pt = PLANET_TYPES_BY_CODE[detail.id];
    const tone = rarityTone(pt?.rarity);
    title = pt?.name ?? 'Mundo';
    kicker = 'Levantamento planetário';
    titleClass = tone.text;
    if (pt) {
      cover = `/planet-covers/${pt.code}.jpg`;
      const reserves = pt.typicalResourceIds
        .map((id) => RESOURCES_BY_ID[id]?.name)
        .filter(Boolean)
        .join(', ');
      paragraphs = [
        `Classe ${pt.name}. ${pt.textureDesc.charAt(0).toUpperCase()}${pt.textureDesc.slice(1)}.`,
        pt.lifeRuleText,
        reserves
          ? `O que o solo e o céu costumam entregar: ${reserves}.`
          : 'Nenhuma reserva típica consta neste levantamento.',
        pt.allowsCivilization45
          ? 'Há mundos desta classe que sustentam impérios inteiros, com docas, leis e memória longa.'
          : 'Esta classe raramente segura uma sede imperial. Serve de fronteira, de mina ou de silêncio.',
      ];
      chips = [{ label: tone.label, className: tone.badge }];
    }
  } else if (detail.kind === 'creature') {
    const cr = CREATURES_BY_ID[detail.id];
    title = cr?.name ?? 'Criatura';
    kicker = 'Ficha de fauna';
    const dangerTone =
      cr?.danger === 'mortal' || cr?.danger === 'alto'
        ? 'text-rose-200'
        : cr?.rareNiche
        ? 'text-sky-200'
        : 'text-emerald-200';
    titleClass = dangerTone;
    if (cr) {
      portrait = {
        cardId: cr.id,
        kind: 'creature',
        name: cr.name,
        lifeFormId: cr.lifeFormId,
        description: cr.description,
      };
      paragraphs = [
        cr.description,
        `No ecossistema ocupa o papel de ${cr.ecologicalRole}. O porte é ${cr.size}. O perigo, para quem desce sem leitura prévia, é ${cr.danger}.`,
        `Foi visto em mundos ${worldNames(cr.preferredPlanetCodes)}.`,
        `O que a expedição leva de volta, quando leva: ${cr.utility}.`,
        cr.rareNiche
          ? 'Colecionadores pagam caro por um espécime destes. Não é rota comum.'
          : 'Espécime de rota. Útil, mas não muda o preço de um setor.',
      ];
    }
  } else if (detail.kind === 'ability') {
    const ab = SPECIAL_ABILITIES_BY_ID[detail.id];
    title = ab?.name ?? 'Habilidade';
    kicker = 'Doutrina de bordo';
    titleClass = ab?.healthRegenPerSec ? 'text-rose-200' : 'text-cyan-100';
    if (ab) {
      paragraphs = [
        ab.description,
        ab.summary,
        `Quem a carrega: ${ab.ownerName}.`,
        ab.healthRegenPerSec
          ? 'Em campo, a tripulação sente a saúde voltar devagar, mesmo sem o mestre por perto.'
          : 'Não restaura saúde por si. Age no combate, no comércio ou na leitura do terreno.',
      ];
    }
  } else if (detail.kind === 'item') {
    const tone = rarityTone(detail.rarity);
    title = detail.name;
    kicker = 'Peça de arsenal';
    titleClass = tone.text;
    paragraphs = [
      detail.description,
      detail.extra ?? '',
      detail.price != null
        ? 'O preço de tabela muda no mercado local. Verde favorece quem vende ou compra com vantagem. Vermelho cobra mais do que devia.'
        : '',
    ].filter(Boolean);
    chips = [{ label: tone.label, className: tone.badge }];
  }

  return (
    <aside className="fixed left-3 top-16 bottom-16 z-[70] w-[min(480px,calc(var(--fit-w)-1.5rem))] overflow-y-auto rounded-2xl border border-cyan-400/40 bg-[#050914]/95 text-slate-100 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
      <div className="relative min-h-[140px] overflow-hidden border-b border-cyan-500/25">
        {cover && (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-[#050914]/75 to-[#050914]/20" />
        <div className="relative p-4 flex items-start gap-3">
          {portrait && (
            <CreatureCard
              cardId={portrait.cardId}
              kind={portrait.kind}
              name={portrait.name}
              lifeFormId={portrait.lifeFormId}
              description={portrait.description}
              sizeClass="w-20 h-20"
              allowAiGeneration={false}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/90">{kicker}</div>
            <h3 className={`font-display text-2xl font-bold leading-tight ${titleClass}`}>{title}</h3>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {chips.map((chip) => (
                  <span key={chip.label} className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${chip.className}`}>
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg border border-cyan-500/40 bg-slate-950/70 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 64)} className="text-sm leading-relaxed text-slate-200 border-l-2 border-cyan-500/30 pl-3">
            {paragraph}
          </p>
        ))}
      </div>
    </aside>
  );
}
