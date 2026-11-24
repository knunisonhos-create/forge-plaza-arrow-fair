import type {
  FactionAxis,
  FactionTechStyle,
  LifeFormId,
  OriginPassiveBonuses,
  SpecialAbilityDef,
  VisualNovelChoice,
} from '../types/game';
import { FACTIONS, LIFE_FORMS_BY_ID, SPECIES_BY_ID } from './lifeforms';
import { CONSUMABLES_BY_ID, HULLS_BY_ID } from './items';

export const DEFAULT_ORIGIN_BONUSES: OriginPassiveBonuses = {
  combatDpsMult: 1,
  hullFlatBonus: 0,
  shieldCapMult: 1,
  shieldRegenMult: 1,
  hullRegenPerSec: 0,
  fuelCostMult: 1,
  cargoFlatBonus: 0,
  minerRateMult: 1,
  tradePriceBonus: 0,
  explorerBonus: 0,
  hazardResistBonus: 0,
  renownGainMult: 1,
  warScoreMult: 1,
  cloakBonus: 0,
  supplyCostMult: 1,
  fleeBonusPct: 0,
};

export function mergeOriginBonuses(
  base: OriginPassiveBonuses,
  delta?: Partial<OriginPassiveBonuses>
): OriginPassiveBonuses {
  if (!delta) return base;
  return {
    combatDpsMult: Math.round((base.combatDpsMult + ((delta.combatDpsMult ?? 1) - 1)) * 1000) / 1000,
    hullFlatBonus: base.hullFlatBonus + (delta.hullFlatBonus ?? 0),
    shieldCapMult: Math.round((base.shieldCapMult + ((delta.shieldCapMult ?? 1) - 1)) * 1000) / 1000,
    shieldRegenMult: Math.round((base.shieldRegenMult + ((delta.shieldRegenMult ?? 1) - 1)) * 1000) / 1000,
    hullRegenPerSec: Math.round((base.hullRegenPerSec + (delta.hullRegenPerSec ?? 0)) * 100) / 100,
    fuelCostMult: Math.max(0.55, Math.round((base.fuelCostMult * (delta.fuelCostMult ?? 1)) * 1000) / 1000),
    cargoFlatBonus: base.cargoFlatBonus + (delta.cargoFlatBonus ?? 0),
    minerRateMult: Math.round((base.minerRateMult + ((delta.minerRateMult ?? 1) - 1)) * 1000) / 1000,
    tradePriceBonus: Math.min(0.4, Math.round((base.tradePriceBonus + (delta.tradePriceBonus ?? 0)) * 1000) / 1000),
    explorerBonus: base.explorerBonus + (delta.explorerBonus ?? 0),
    hazardResistBonus: base.hazardResistBonus + (delta.hazardResistBonus ?? 0),
    renownGainMult: Math.round((base.renownGainMult + ((delta.renownGainMult ?? 1) - 1)) * 1000) / 1000,
    warScoreMult: Math.round((base.warScoreMult + ((delta.warScoreMult ?? 1) - 1)) * 1000) / 1000,
    cloakBonus: Math.min(0.35, Math.round((base.cloakBonus + (delta.cloakBonus ?? 0)) * 1000) / 1000),
    supplyCostMult: Math.max(0.45, Math.round((base.supplyCostMult * (delta.supplyCostMult ?? 1)) * 1000) / 1000),
    fleeBonusPct: Math.min(45, (base.fleeBonusPct ?? 0) + (delta.fleeBonusPct ?? 0)),
  };
}

// ============================================================================
// SPECIAL ABILITIES (LifeForm, Race & Faction Exclusives)
// ============================================================================

const BASE_ABILITIES: SpecialAbilityDef[] = [
  // 7 LifeForm Abilities
  {
    id: 'hab_lf_humanoide_tratado',
    name: 'Pacto de Fronteira Aberta',
    scope: 'forma_vida',
    ownerName: 'Humanoides',
    kind: 'diplomacia_passiva',
    summary: 'Licença automática em mundos Humanoides +15% Reputação',
    description: 'Protocolo social versátil que garante livre extração em sistemas Humanoides neutros e amplia reputação em missões.',
  },
  {
    id: 'hab_lf_espectroid_surto',
    name: 'Descarga de Campo Etérico',
    scope: 'forma_vida',
    ownerName: 'Espectroid',
    kind: 'combate_ativa',
    cooldownSec: 26,
    summary: 'Ativa: 38 dano + remove 35% dos escudos inimigos',
    description: 'Pulso eletromagnético direto do seu núcleo espectral que rompe escudos inimigos em combate.',
    combatAction: { damageAllEnemies: 38, stripEnemyShieldPct: 0.35, shieldRestore: 25 },
  },
  {
    id: 'hab_lf_metalocto_autorreparo',
    name: 'Solda Nanometálica',
    scope: 'forma_vida',
    ownerName: 'Metalocto',
    kind: 'combate_ativa',
    cooldownSec: 28,
    summary: 'Ativa: Restaura +48 de Casco imediatamente',
    description: 'Micro-ligas metálicas percorrem a fuselagem selando brechas críticas durante batalhas.',
    combatAction: { hullHeal: 48 },
  },
  {
    id: 'hab_lf_plantideo_fotossintese',
    name: 'Simbiose Fotossintética',
    scope: 'forma_vida',
    ownerName: 'Plantídeos',
    kind: 'passiva',
    summary: 'Passiva: a seiva viva recupera a saúde da tripulação e reduz mantimentos',
    description: 'Tecidos simbióticos convertem luz em vigor. A tripulação recupera saúde aos poucos, mesmo fora da enfermaria.',
    healthRegenPerSec: 0.05,
  },
  {
    id: 'hab_lf_grutoide_carapaca',
    name: 'Resonância Siliciosa',
    scope: 'forma_vida',
    ownerName: 'Grutoides',
    kind: 'combate_ativa',
    cooldownSec: 26,
    summary: 'Ativa: +40 Escudo & 30 dano de estilhaço',
    description: 'Cristais ressonadores criam um pico defensivo enquanto disparam fragmentos piezoelétricos.',
    combatAction: { shieldRestore: 40, damageAllEnemies: 30 },
  },
  {
    id: 'hab_lf_insectoide_enxame',
    name: 'Reflexo de Colmeia',
    scope: 'forma_vida',
    ownerName: 'Insectoides',
    kind: 'combate_ativa',
    cooldownSec: 24,
    summary: 'Ativa: Rajada coordenada (48 dano em todos os alvos)',
    description: 'Sincronia neural acelera todos os sistemas de mira para uma descarga concentrada simultânea.',
    combatAction: { damageAllEnemies: 48 },
  },
  {
    id: 'hab_lf_anfibio_pressao',
    name: 'Ecolocalização Abissal',
    scope: 'forma_vida',
    ownerName: 'Anfíbios Aqualíferos',
    kind: 'exploracao_passiva',
    summary: 'Passiva: +28 Exploração & reduz dano ambiental em solo',
    description: 'Sensores hidrodinâmicos detectam perigos geológicos e fauna rara antes da aproximação.',
  },

  // 21 Species Signature Abilities
  {
    id: 'hab_sp_solarianos',
    name: 'Salvo-Conduto Mercantil',
    scope: 'raca',
    ownerName: 'Solarianos',
    kind: 'diplomacia_passiva',
    summary: 'Licença automática em sistemas pacíficos · +8% lucro comercial',
    description: 'Credencial histórica Solariana reconhecida nos portos mercantis e reformistas da galáxia.',
  },
  {
    id: 'hab_sp_valdris',
    name: 'Investida de Vanguarda',
    scope: 'raca',
    ownerName: 'Valdris',
    kind: 'combate_ativa',
    cooldownSec: 22,
    summary: 'Ativa: Golpe tático de 55 dano em todos os inimigos',
    description: 'Manobra ofensiva Valdris que concentra reatores e baterias num disparo devastador.',
    combatAction: { damageAllEnemies: 55 },
  },
  {
    id: 'hab_sp_nyxianos',
    name: 'Manto de Penumbra',
    scope: 'raca',
    ownerName: 'Nyxianos',
    kind: 'combate_ativa',
    cooldownSec: 24,
    summary: 'Ativa: +50 Escudo & 32 dano direto em todos os alvos',
    description: 'Distorce sensores inimigos enquanto desfere um ataque preciso pelas frestas da blindagem.',
    combatAction: { shieldRestore: 50, damageAllEnemies: 32 },
  },
  {
    id: 'hab_sp_luminares',
    name: 'Coro de Ressonância',
    scope: 'raca',
    ownerName: 'Luminares de Éter',
    kind: 'combate_ativa',
    cooldownSec: 24,
    summary: 'Ativa: Recarrega +65 de Escudo instantaneamente',
    description: 'Canto harmônico de fótons restaura barreiras energéticas quase instantaneamente.',
    combatAction: { shieldRestore: 65 },
  },
  {
    id: 'hab_sp_pulsari',
    name: 'Pulso de Supernova',
    scope: 'raca',
    ownerName: 'Pulsari',
    kind: 'combate_ativa',
    cooldownSec: 25,
    summary: 'Ativa: 62 dano gama & -40% escudos inimigos',
    description: 'Libera plasma estelar comprimido varrendo naves hostis no alcance orbital.',
    combatAction: { damageAllEnemies: 62, stripEnemyShieldPct: 0.4 },
  },
  {
    id: 'hab_sp_umbrais',
    name: 'Fenda Espectral',
    scope: 'raca',
    ownerName: 'Umbrais Fotônicos',
    kind: 'combate_ativa',
    cooldownSec: 24,
    summary: 'Ativa: Drena 42 de dano e recupera +38 Escudo',
    description: 'Sifão quântico desvia energia cinética inimiga diretamente para seus escudos.',
    combatAction: { damageAllEnemies: 42, shieldRestore: 38 },
  },
  {
    id: 'hab_sp_ferronitas',
    name: 'Têmpera de Bigorna',
    scope: 'raca',
    ownerName: 'Ferronitas',
    kind: 'combate_ativa',
    cooldownSec: 26,
    summary: 'Ativa: +55 Casco & +25 Escudo',
    description: 'Ativa ligas de memória térmica para reconstruir placas críticas em combate.',
    combatAction: { hullHeal: 55, shieldRestore: 25 },
  },
  {
    id: 'hab_sp_titanios',
    name: 'Bastião de Aço Titânio',
    scope: 'raca',
    ownerName: 'Titânios de Forja',
    kind: 'combate_ativa',
    cooldownSec: 24,
    summary: 'Ativa: +45 Casco, +45 Escudo & 30 dano de choque',
    description: 'Sobrecarga blindada que transforma a nave em um aríete inabalável.',
    combatAction: { hullHeal: 45, shieldRestore: 45, damageAllEnemies: 30 },
  },
  {
    id: 'hab_sp_cromalitas',
    name: 'Espelho Prateado Total',
    scope: 'raca',
    ownerName: 'Cromálitas',
    kind: 'combate_ativa',
    cooldownSec: 25,
    summary: 'Ativa: +60 Escudo & 36 dano refratado',
    description: 'Reorienta facetas espelhadas devolvendo energia concentrada aos atacantes.',
    combatAction: { shieldRestore: 60, damageAllEnemies: 36 },
  },
  {
    id: 'hab_sp_sylvaris',
    name: 'Florada Regenerativa',
    scope: 'raca',
    ownerName: 'Sylvaris',
    kind: 'combate_ativa',
    cooldownSec: 24,
    summary: 'A florada devolve saúde à tripulação o tempo todo e fecha o casco em combate',
    description: 'Estímulo simbiótico regenera o casco vivo e, fora da batalha, costura a saúde de quem desceu ao solo.',
    healthRegenPerSec: 0.08,
    combatAction: { hullHeal: 60 },
  },
  {
    id: 'hab_sp_vex',
    name: 'Chuva de Esporos Ácidos',
    scope: 'raca',
    ownerName: 'Espinhões de Vex',
    kind: 'combate_ativa',
    cooldownSec: 23,
    summary: 'Ativa: 54 dano corrosivo em todos os alvos',
    description: 'Projeta nuvem bio-ácida que corrói escudos e cascos inimigos simultaneamente.',
    combatAction: { damageAllEnemies: 54 },
  },
  {
    id: 'hab_sp_lotus',
    name: 'Serenidade do Lótus',
    scope: 'raca',
    ownerName: 'Lótus Silenciosos',
    kind: 'exploracao_passiva',
    summary: 'Passiva: expedições mais seguras e saúde da tripulação que se refaz devagar',
    description: 'A disciplina do lótus acalma o corpo depois do solo. A saúde sobe aos poucos e a fauna se deixa catalogar.',
    healthRegenPerSec: 0.06,
  },
  {
    id: 'hab_sp_litoides',
    name: 'Ancoragem Sísmica',
    scope: 'raca',
    ownerName: 'Litóides de Basalto',
    kind: 'passiva',
    summary: 'Passiva: +30% velocidade de extração & +22 Casco base',
    description: 'Sintonia com campos gravitacionais planetários estabiliza brocas e reforça a fuselagem.',
  },
  {
    id: 'hab_sp_drakolitos',
    name: 'Sopro de Magma',
    scope: 'raca',
    ownerName: 'Drakólitos',
    kind: 'combate_ativa',
    cooldownSec: 22,
    summary: 'Ativa: 58 dano térmico & quebra 25% dos escudos',
    description: 'Descarga de plasma vulcânico capaz de derreter rapidamente escoltas inimigas.',
    combatAction: { damageAllEnemies: 58, stripEnemyShieldPct: 0.25 },
  },
  {
    id: 'hab_sp_thul',
    name: 'Refração de Arquivo Thul',
    scope: 'raca',
    ownerName: 'Quartzos de Thul',
    kind: 'combate_ativa',
    cooldownSec: 25,
    summary: 'Ativa: +55 Escudo & 34 dano de prisma',
    description: 'Memórias cristalinas alinham lentes defensivas enquanto disparam feixes coerentes.',
    combatAction: { shieldRestore: 55, damageAllEnemies: 34 },
  },
  {
    id: 'hab_sp_vespideos',
    name: 'Logística de Colmeia Dourada',
    scope: 'raca',
    ownerName: 'Vespídeos de Mel',
    kind: 'diplomacia_passiva',
    summary: 'Passiva: +40 compartimento de carga · -25% gasto de combustível & mantimentos',
    description: 'Organização de enxame otimiza cada centímetro de estoque e rota de viagem.',
  },
  {
    id: 'hab_sp_krikkari',
    name: 'Assalto de Enxame Krikkari',
    scope: 'raca',
    ownerName: 'Krikkari',
    kind: 'combate_ativa',
    cooldownSec: 20,
    summary: 'Ativa: 52 dano veloz (recarga rápida 20s)',
    description: 'Ataque relâmpago de alta cadência com recarga tática mais curta da galáxia.',
    combatAction: { damageAllEnemies: 52 },
  },
  {
    id: 'hab_sp_mantis',
    name: 'Golpe Letal de Eclipse',
    scope: 'raca',
    ownerName: 'Mantis de Sombra',
    kind: 'combate_ativa',
    cooldownSec: 23,
    summary: 'Ativa: 60 dano cirúrgico direto',
    description: 'Intercepção silenciosa mirando exatamente nos reatores das naves inimigas.',
    combatAction: { damageAllEnemies: 60 },
  },
  {
    id: 'hab_sp_vaelorianos',
    name: 'Fluxo Coralino',
    scope: 'raca',
    ownerName: 'Vaelorianos',
    kind: 'combate_ativa',
    cooldownSec: 24,
    summary: 'O fluxo coralino recupera saúde da tripulação e fecha casco e escudo em combate',
    description: 'Compressores líquidos equilibram a pressão do corpo. Quem volta do mar profundo recupera saúde sem pressa.',
    healthRegenPerSec: 0.07,
    combatAction: { hullHeal: 45, shieldRestore: 40 },
  },
  {
    id: 'hab_sp_mael',
    name: 'Salva Criogênica de Fossa',
    scope: 'raca',
    ownerName: 'Nautilídeos de Mael',
    kind: 'combate_ativa',
    cooldownSec: 23,
    summary: 'Ativa: 56 dano glacial & +25 Casco',
    description: 'Dispara ogivas de gelo comprimido enquanto sela a blindagem externa.',
    combatAction: { damageAllEnemies: 56, hullHeal: 25 },
  },
  {
    id: 'hab_sp_glacio',
    name: 'Estase Subglacial',
    scope: 'raca',
    ownerName: 'Abissais de Glácio',
    kind: 'combate_ativa',
    cooldownSec: 25,
    summary: 'A estase devolve saúde à tripulação e levanta escudo e casco',
    description: 'O frio profundo desacelera feridas. A tripulação recupera saúde aos poucos depois de uma descida gelada.',
    healthRegenPerSec: 0.05,
    combatAction: { shieldRestore: 62, hullHeal: 25 },
  },
];

// Generate 42 distinct Faction Special Abilities (1 bespoke doctrine ability per Faction)
const FACTION_ABILITIES: SpecialAbilityDef[] = FACTIONS.map((fac) => {
  const isMil = fac.axis === 'Militar';
  const isMer = fac.axis === 'Mercantil';
  const isTrad = fac.axis === 'Tradicionalistas';

  if (isMil) {
    return {
      id: `hab_fac_${fac.id}`,
      name: `Doutrina Bélica: ${fac.name.split(' ')[0]}`,
      scope: 'faccao',
      ownerName: fac.name,
      kind: 'combate_ativa',
      cooldownSec: 26,
      summary: `Ativa: Barragem de facção (64 dano) · +25% impacto na Guerra Galáctica`,
      description: `Protocolo militar exclusivo de ${fac.name}: dispara salva coordenada contra inimigos e amplia conquistas territoriais.`,
      combatAction: { damageAllEnemies: 64, stripEnemyShieldPct: 0.2 },
    };
  }
  if (isMer) {
    return {
      id: `hab_fac_${fac.id}`,
      name: `Carta Mercantil: ${fac.name.split(' ')[0]}`,
      scope: 'faccao',
      ownerName: fac.name,
      kind: 'diplomacia_passiva',
      summary: `Passiva: +10% lucro comercial · +55 Carga · Licença livre em ${fac.speciesId}`,
      description: `Selo econômico exclusivo de ${fac.name}, otimizando tarifas portuárias e capacidade logística.`,
    };
  }
  if (isTrad) {
    return {
      id: `hab_fac_${fac.id}`,
      name: `Édito Sagrado: ${fac.name.split(' ')[0]}`,
      scope: 'faccao',
      ownerName: fac.name,
      kind: 'combate_ativa',
      cooldownSec: 25,
      summary: `Ativa: +52 Escudo & +38 Casco · +20% Reputação em missões`,
      description: `Liturgia defensiva de ${fac.name} que blinda a nave e fortalece sua autoridade diplomática.`,
      combatAction: { shieldRestore: 52, hullHeal: 38 },
    };
  }
  return {
    id: `hab_fac_${fac.id}`,
    name: `Vanguarda Científica: ${fac.name.split(' ')[0]}`,
    scope: 'faccao',
    ownerName: fac.name,
    kind: 'exploracao_passiva',
    summary: `Passiva: +22% Extração · -16% Combustível · +22 Exploração`,
    description: `Pesquisa aplicada exclusiva de ${fac.name}, elevando eficiência de saltos, mineração e ciência planetária.`,
  };
});

export const SPECIAL_ABILITIES: SpecialAbilityDef[] = [...BASE_ABILITIES, ...FACTION_ABILITIES];

export const SPECIAL_ABILITIES_BY_ID: Record<string, SpecialAbilityDef> = Object.fromEntries(
  SPECIAL_ABILITIES.map((a) => [a.id, a])
);

// ============================================================================
// 1. FORMA DE VIDA: 3 Opções Exclusivas por Forma de Vida (7 x 3 = 21)
// ============================================================================

export const LIFEFORM_ORIGIN_CHOICES: Record<LifeFormId, VisualNovelChoice[]> = {
  humanoide: [
    {
      id: 'lf_hum_diplomacia',
      label: 'Protocolo Diplomático Humanoide',
      categoryTag: 'Habilidade de Forma de Vida',
      hint: 'Habilidade: Pacto de Fronteira Aberta · +15% Reputação · +6% Comércio',
      consequenceText: 'Seu carisma social abre portos humanoides e garante licenças automáticas na espécie natal.',
      effects: {
        grantAbilityId: 'hab_lf_humanoide_tratado',
        bonusModifiers: { renownGainMult: 1.15, tradePriceBonus: 0.06 },
        unlockHomeSectorLicenses: true,
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_hum_traje',
      label: 'Exotraje Modular de Fronteira',
      categoryTag: 'Tecnologia Biológica',
      previewEquipment: { category: 'suit', itemId: 'mochila_jato' },
      hint: 'Equipamento: Mochila a Jato Orbital · +18 Exploração em solo',
      consequenceText: 'Você adapta um exotraje humanoide com propulsão vertical para exploração planetária.',
      effects: {
        giveEquipment: [{ category: 'suit', itemId: 'mochila_jato' }],
        bonusModifiers: { explorerBonus: 18 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_hum_logistica',
      label: 'Adaptação Logística Versátil',
      categoryTag: 'Bônus Fixo de Área',
      hint: '+45 Carga permanente · -18% gasto de Mantimentos · +12% Extração',
      consequenceText: 'Treinamento multifuncional otimiza o compartimento de carga e a dieta de longa viagem.',
      effects: {
        bonusModifiers: { cargoFlatBonus: 45, supplyCostMult: 0.82, minerRateMult: 1.12 },
      },
      nextNodeId: 'open_3',
    },
  ],
  espectroid: [
    {
      id: 'lf_esp_surto',
      label: 'Núcleo de Sobrecarga Espectral',
      categoryTag: 'Habilidade de Combate',
      hint: 'Habilidade Ativa: Descarga de Campo Etérico · +14% DPS',
      consequenceText: 'Seu corpo de plasma aprende a canalizar descargas diretamente para os emissores da nave.',
      effects: {
        grantAbilityId: 'hab_lf_espectroid_surto',
        bonusModifiers: { combatDpsMult: 1.14 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_esp_plasma',
      label: 'Sintonizador de Escudos Etéricos',
      categoryTag: 'Bônus Fixo de Área',
      hint: '+28% Capacidade de Escudos · +30% Recarga de Escudos · +15% Furtividade',
      consequenceText: 'Campos magnéticos biológicos amplificam permanentemente todos os escudos equipados.',
      effects: {
        bonusModifiers: { shieldCapMult: 1.28, shieldRegenMult: 1.3, cloakBonus: 0.15 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_esp_energia',
      label: 'Coletor Fotônico de Hiperespaço',
      categoryTag: 'Tecnologia & Autonomia',
      previewEquipment: { category: 'utility', itemId: 'estabilizador_dobra' },
      hint: 'Módulo: Estabilizador de Dobra Econômico · -15% Combustível adicional',
      consequenceText: 'Seu metabolismo radiante estabiliza o motor de dobra reduzindo drasticamente o consumo.',
      effects: {
        giveEquipment: [{ category: 'utility', itemId: 'estabilizador_dobra' }],
        bonusModifiers: { fuelCostMult: 0.85 },
      },
      nextNodeId: 'open_3',
    },
  ],
  metalocto: [
    {
      id: 'lf_met_autorreparo',
      label: 'Glândulas de Solda Nanometálica',
      categoryTag: 'Habilidade de Combate',
      hint: 'Habilidade Ativa: Solda Nanometálica (+48 Casco) · +0.8 Casco/s passivo',
      consequenceText: 'Seu organismo ciber-mineral regenera continuamente a blindagem externa da nave.',
      effects: {
        grantAbilityId: 'hab_lf_metalocto_autorreparo',
        bonusModifiers: { hullRegenPerSec: 0.8 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_met_casco',
      label: 'Fusão Estrutural Pesada',
      categoryTag: 'Bônus Fixo de Área',
      hint: '+35 Casco máximo fixo · +25% Resistência a Riscos Ambientais',
      consequenceText: 'Placas vivas de titânio se fundem ao esqueleto da sua nave.',
      effects: {
        bonusModifiers: { hullFlatBonus: 35, hazardResistBonus: 0.25 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_met_forja',
      label: 'Perfuratriz Bio-Mineral Nativa',
      categoryTag: 'Tecnologia Metalocto',
      previewEquipment: { category: 'extractor', itemId: 'broca_pesada_silicoide' },
      hint: 'Extrator Nv 3: Perfuratriz Bio-Mineral (2.2/s) · +20% Mineração',
      consequenceText: 'Ferramentas de alta dureza são integradas diretamente aos braços extratores da nave.',
      effects: {
        giveEquipment: [{ category: 'extractor', itemId: 'broca_pesada_silicoide' }],
        bonusModifiers: { minerRateMult: 1.2 },
      },
      nextNodeId: 'open_3',
    },
  ],
  plantideo: [
    {
      id: 'lf_pla_foto',
      label: 'Rede Vascular Fotossintética',
      categoryTag: 'Habilidade Biológica',
      hint: 'Habilidade: Simbiose Fotossintética · +1.1 Casco/s · -30% Mantimentos',
      consequenceText: 'Raízes fotossintéticas crescem pelo convés sustentando tripulação e reparando o casco.',
      effects: {
        grantAbilityId: 'hab_lf_plantideo_fotossintese',
        bonusModifiers: { hullRegenPerSec: 1.1, supplyCostMult: 0.7 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_pla_fauna',
      label: 'Simbiose de Esporos Biológicos',
      categoryTag: 'Tecnologia Botânica',
      previewEquipment: { category: 'extractor', itemId: 'coletor_biologico_mk1' },
      hint: 'Extrator: Coletor Biológico de Esporos · +24 Exploração · +15% Mineração',
      consequenceText: 'Você equipa coletores vivos que captam biomassa, fungos e compostos raros sem danificar o solo.',
      effects: {
        giveEquipment: [{ category: 'extractor', itemId: 'coletor_biologico_mk1' }],
        bonusModifiers: { explorerBonus: 24, minerRateMult: 1.15 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_pla_toxin',
      label: 'Imunidade Celular Antitóxica',
      categoryTag: 'Bônus Fixo de Área',
      previewEquipment: { category: 'suit', itemId: 'prot_toxicidade' },
      hint: 'Traje: Filtro Antitóxico · +30 Resistência Ambiental · +20 Casco fixo',
      consequenceText: 'Sua fisiologia vegetal filtra gases letais e fortalece a resistência biológica da nave.',
      effects: {
        giveEquipment: [{ category: 'suit', itemId: 'prot_toxicidade' }],
        bonusModifiers: { hazardResistBonus: 0.3, hullFlatBonus: 20 },
      },
      nextNodeId: 'open_3',
    },
  ],
  grutoide: [
    {
      id: 'lf_gru_carapaca',
      label: 'Núcleo Piezoelétrico Ressonante',
      categoryTag: 'Habilidade de Combate',
      hint: 'Habilidade Ativa: Resonância Siliciosa (+40 Escudo +30 Dano) · +18 Casco',
      consequenceText: 'Cristais internos amplificam barreiras de impacto e estilhaçam alvos próximos.',
      effects: {
        grantAbilityId: 'hab_lf_grutoide_carapaca',
        bonusModifiers: { hullFlatBonus: 18 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_gru_profunda',
      label: 'Sentido Tectônico de Veios',
      categoryTag: 'Bônus Fixo de Área',
      hint: '+32% Velocidade de Mineração · +50 Carga permanente',
      consequenceText: 'Micélios siliciosos localizam instantaneamente os depósitos mais densos do subsolo.',
      effects: {
        bonusModifiers: { minerRateMult: 1.32, cargoFlatBonus: 50 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_gru_pressao',
      label: 'Exoesqueleto Mineral Subterrâneo',
      categoryTag: 'Tecnologia Grutoide',
      previewEquipment: { category: 'suit', itemId: 'prot_pressao' },
      hint: 'Traje: Exoesqueleto Alta Pressão · +20 Exploração · +20 Resist. Riscos',
      consequenceText: 'Blindagem cristalina suporta gravidades extremas e cavernas profundas.',
      effects: {
        giveEquipment: [{ category: 'suit', itemId: 'prot_pressao' }],
        bonusModifiers: { explorerBonus: 20, hazardResistBonus: 0.2 },
      },
      nextNodeId: 'open_3',
    },
  ],
  insectoide: [
    {
      id: 'lf_ins_enxame',
      label: 'Sincronia Neural de Enxame',
      categoryTag: 'Habilidade de Combate',
      hint: 'Habilidade Ativa: Reflexo de Colmeia (48 Dano) · +16% DPS fixo',
      consequenceText: 'Percepção múltipla antecipa manobras inimigas multiplicando sua cadência efetiva.',
      effects: {
        grantAbilityId: 'hab_lf_insectoide_enxame',
        bonusModifiers: { combatDpsMult: 1.16 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_ins_colmeia',
      label: 'Metabolismo Eficiente de Colmeia',
      categoryTag: 'Bônus Fixo de Área',
      hint: '-28% Consumo de Mantimentos · -16% Combustível · +40 Carga',
      consequenceText: 'Logística quitinosa otimiza o consumo energético e libera espaço útil no compartimento de carga.',
      effects: {
        bonusModifiers: { supplyCostMult: 0.72, fuelCostMult: 0.84, cargoFlatBonus: 40 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_ins_sensor',
      label: 'Antenas Químicas & Cortador',
      categoryTag: 'Tecnologia Insectoide',
      previewEquipment: { category: 'suit', itemId: 'cortador_plasma' },
      hint: 'Traje: Cortador de Plasma Portátil · +20 Exploração · +12% Furtividade',
      consequenceText: 'Ferramentas cirúrgicas e sensores químicos detectam emboscadas antes do ataque.',
      effects: {
        giveEquipment: [{ category: 'suit', itemId: 'cortador_plasma' }],
        bonusModifiers: { explorerBonus: 20, cloakBonus: 0.12 },
      },
      nextNodeId: 'open_3',
    },
  ],
  anfibio: [
    {
      id: 'lf_anf_eco',
      label: 'Sonar Bioluminescente Abissal',
      categoryTag: 'Habilidade de Exploração',
      hint: 'Habilidade: Ecolocalização Abissal · +28 Exploração · +22 Resist. Riscos',
      consequenceText: 'Sua percepção subaquática guia expedições por mares ácidos e fossas escuras.',
      effects: {
        grantAbilityId: 'hab_lf_anfibio_pressao',
        bonusModifiers: { explorerBonus: 28, hazardResistBonus: 0.22 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_anf_bomba',
      label: 'Sifão Hidropressurizado Orbital',
      categoryTag: 'Tecnologia Aqualífera',
      previewEquipment: { category: 'extractor', itemId: 'bomba_liquida_mk1' },
      hint: 'Extrator: Bomba Líquida Orbital · +22% Extração · +40 Carga',
      consequenceText: 'Bombas criogênicas e líquidas extraem oceanos, gelo e magma com extrema eficiência.',
      effects: {
        giveEquipment: [{ category: 'extractor', itemId: 'bomba_liquida_mk1' }],
        bonusModifiers: { minerRateMult: 1.22, cargoFlatBonus: 40 },
      },
      nextNodeId: 'open_3',
    },
    {
      id: 'lf_anf_crio',
      label: 'Sangue Criogênico Pressurizado',
      categoryTag: 'Bônus Fixo de Área',
      previewEquipment: { category: 'suit', itemId: 'prot_frio' },
      hint: 'Traje: Isolamento Criogênico · +25% Escudos · +0.6 Casco/s passivo',
      consequenceText: 'Membranas adaptadas a altas pressões protegem você e estabilizam escudos térmicos.',
      effects: {
        giveEquipment: [{ category: 'suit', itemId: 'prot_frio' }],
        bonusModifiers: { shieldCapMult: 1.25, hullRegenPerSec: 0.6 },
      },
      nextNodeId: 'open_3',
    },
  ],
};

// ============================================================================
// 2. RAÇA — ETAPA 1 & ETAPA 3 (3 opções diferentes em cada etapa por espécie)
// ============================================================================

interface SpeciesPackSpec {
  hullId: string;
  consumableId: string;
  abilityId: string;
  techCategory: 'weapon' | 'shield' | 'extractor' | 'utility' | 'suit';
  techId: string;
  techLabel: string;
  techHint: string;
  stage1BonusTitle: string;
  stage1BonusHint: string;
  stage1BonusMod: Partial<OriginPassiveBonuses>;
  stage1SecondaryMod: Partial<OriginPassiveBonuses>;
  stage3SecLabel: string;
  stage3SecHint: string;
  stage3SecEquip?: { category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit'; itemId: string };
  stage3SecMod?: Partial<OriginPassiveBonuses>;
  stage3BlueprintId?: string;
}

const SPECIES_PACKS: Record<string, SpeciesPackSpec> = {
  solarianos: {
    hullId: 'nave_solarianos_corveta',
    consumableId: 'con_solarianos',
    abilityId: 'hab_sp_solarianos',
    techCategory: 'weapon',
    techId: 'laser_helio_solariano',
    techLabel: 'Emissor Solar de Solis',
    techHint: 'Arma Nv 2 Exclusiva (16 DPS Laser, Alc. 22) + +6% Comércio',
    stage1BonusTitle: 'Carta de Rotas Mercantis Solis',
    stage1BonusHint: '+12% Lucro Comercial fixo · +50 Carga permanente · +15 Reputação',
    stage1BonusMod: { tradePriceBonus: 0.12, cargoFlatBonus: 50 },
    stage1SecondaryMod: { tradePriceBonus: 0.06 },
    stage3SecLabel: 'Navegador de Longo Alcance Solis',
    stage3SecHint: 'Motor Setorial Mk.II (24 a.l.) + Scanner de Longo Alcance',
    stage3SecEquip: { category: 'jumpDrive', itemId: 'motor_setorial_mk2' },
    stage3SecMod: { fuelCostMult: 0.88 },
  },
  valdris: {
    hullId: 'nave_valdris_lanca',
    consumableId: 'con_valdris',
    abilityId: 'hab_sp_valdris',
    techCategory: 'weapon',
    techId: 'canhao_cerco_valdris',
    techLabel: 'Canhão de Brecha Valdris',
    techHint: 'Arma Nv 2 Exclusiva (23 DPS Cinética + Bombardeio Orbital)',
    stage1BonusTitle: 'Doutrina Marcial das Fronteiras',
    stage1BonusHint: '+20% Dano de Armas (DPS) · +30% Avanço na Guerra Galáctica',
    stage1BonusMod: { combatDpsMult: 1.2, warScoreMult: 1.3 },
    stage1SecondaryMod: { combatDpsMult: 1.08 },
    stage3SecLabel: 'Projeto Tático: Corveta de Patrulha',
    stage3SecHint: 'Projeto desbloqueado: Corveta de Patrulha + +25 Casco fixo',
    stage3BlueprintId: 'bp_corveta_patrulha',
    stage3SecMod: { hullFlatBonus: 25 },
  },
  nyxianos: {
    hullId: 'nave_nyxianos_sombra',
    consumableId: 'con_nyxianos',
    abilityId: 'hab_sp_nyxianos',
    techCategory: 'weapon',
    techId: 'lanca_penumbra_nyx',
    techLabel: 'Lança Sombria de Nyx',
    techHint: 'Arma Nv 2 Exclusiva (21 DPS Plasma, Alc. 23)',
    stage1BonusTitle: 'Protocolo de Vigilância Oculta',
    stage1BonusHint: '+25% Furtividade · +18% Chance de Fuga · +12% DPS · -15% Combustível',
    stage1BonusMod: { cloakBonus: 0.25, fleeBonusPct: 18, combatDpsMult: 1.12, fuelCostMult: 0.85 },
    stage1SecondaryMod: { cloakBonus: 0.1, fleeBonusPct: 8 },
    stage3SecLabel: 'Módulo de Camuflagem & Scanner Nyx',
    stage3SecHint: 'Camuflagem Tática (-45% risco) + Escudo Defletor',
    stage3SecEquip: { category: 'utility', itemId: 'camuflagem_tatica' },
    stage3SecMod: { explorerBonus: 14 },
  },
  luminares_eter: {
    hullId: 'nave_luminares_eter',
    consumableId: 'con_luminares',
    abilityId: 'hab_sp_luminares',
    techCategory: 'shield',
    techId: 'veu_eter_luminar',
    techLabel: 'Véu Harmônico Luminar',
    techHint: 'Escudo Exclusivo (+75 Cap., 7.2/s recarga, 65% anti-plasma)',
    stage1BonusTitle: 'Sinfonia Fotônica Orbital',
    stage1BonusHint: '+35% Recarga de Escudos · +12% Chance de Fuga · -20% Combustível · +15% Reputação',
    stage1BonusMod: { shieldRegenMult: 1.35, fleeBonusPct: 12, fuelCostMult: 0.8, renownGainMult: 1.15 },
    stage1SecondaryMod: { shieldCapMult: 1.15 },
    stage3SecLabel: 'Coletor Atmosférico de Éter',
    stage3SecHint: 'Extrator: Aspirador Gasoso Nv 3 + +20% Taxa de Extração',
    stage3SecEquip: { category: 'extractor', itemId: 'coletor_atmosferico_mk2' },
    stage3SecMod: { minerRateMult: 1.2 },
  },
  pulsari: {
    hullId: 'nave_pulsari_anel',
    consumableId: 'con_pulsari',
    abilityId: 'hab_sp_pulsari',
    techCategory: 'weapon',
    techId: 'arco_pulsar_radiante',
    techLabel: 'Arco Gama de Pulsar',
    techHint: 'Arma Nv 2 Exclusiva (24 DPS Laser, Cadência 2.5/s)',
    stage1BonusTitle: 'Fúria Eletromagnética Estelar',
    stage1BonusHint: '+22% Dano (DPS) · +20% Capacidade de Escudo · +20% Guerra Galáctica',
    stage1BonusMod: { combatDpsMult: 1.22, shieldCapMult: 1.2, warScoreMult: 1.2 },
    stage1SecondaryMod: { combatDpsMult: 1.1 },
    stage3SecLabel: 'Blindagem Anti-Radiação & Traje Pulsar',
    stage3SecHint: 'Blindagem Anti-Radiação + +25% Capacidade de Escudos',
    stage3SecEquip: { category: 'suit', itemId: 'prot_radiacao' },
    stage3SecMod: { shieldCapMult: 1.25 },
  },
  umbrais_fotonicos: {
    hullId: 'nave_umbrais_espectro',
    consumableId: 'con_umbrais',
    abilityId: 'hab_sp_umbrais',
    techCategory: 'shield',
    techId: 'barreira_umbral_fotonica',
    techLabel: 'Manto Refrator Umbral',
    techHint: 'Escudo Exclusivo (+70 Cap., Reflete 14% do dano ao atacante)',
    stage1BonusTitle: 'Cartografia de Fendas & Nebulosas',
    stage1BonusHint: '+26% Furtividade · +14% Chance de Fuga · +25 Exploração · -18% Combustível',
    stage1BonusMod: { cloakBonus: 0.26, fleeBonusPct: 14, explorerBonus: 25, fuelCostMult: 0.82 },
    stage1SecondaryMod: { cloakBonus: 0.1 },
    stage3SecLabel: 'Propulsor de Fenda & Scanner Profundo',
    stage3SecHint: 'Scanner Longo Alcance + +22% Extração de Energia',
    stage3SecEquip: { category: 'utility', itemId: 'scanner_longo_alcance' },
    stage3SecMod: { minerRateMult: 1.22 },
  },
  ferronitas: {
    hullId: 'nave_ferronitas_barcaca',
    consumableId: 'con_ferronitas',
    abilityId: 'hab_sp_ferronitas',
    techCategory: 'extractor',
    techId: 'broca_pesada_silicoide',
    techLabel: 'Perfuratriz de Forja Ferronita',
    techHint: 'Extrator Nv 3 (2.2/s) + +18% Velocidade de Mineração',
    stage1BonusTitle: 'Maestria Metalúrgica dos Fundidores',
    stage1BonusHint: '+65 Carga fixa · +25% Mineração · +10% Preços Comerciais',
    stage1BonusMod: { cargoFlatBonus: 65, minerRateMult: 1.25, tradePriceBonus: 0.1 },
    stage1SecondaryMod: { minerRateMult: 1.12 },
    stage3SecLabel: 'Projeto: Cargueiro Interestelar',
    stage3SecHint: 'Projeto Cargueiro Interestelar + Contêiner Gravitacional (+90 Carga)',
    stage3BlueprintId: 'bp_cargueiro_mercantil',
    stage3SecEquip: { category: 'utility', itemId: 'rebocador_mercantil_mk2' },
  },
  titanios_forja: {
    hullId: 'nave_titanios_ariete',
    consumableId: 'con_titanios',
    abilityId: 'hab_sp_titanios',
    techCategory: 'shield',
    techId: 'couraca_forja_titanio',
    techLabel: 'Escudo de Forja Titânio',
    techHint: 'Escudo Exclusivo (+95 Cap., 68% anti-cinética, 62% anti-míssil)',
    stage1BonusTitle: 'Blindagem Suprema Metalocto',
    stage1BonusHint: '+45 Casco fixo · +16% DPS · +25% Impacto em Guerra',
    stage1BonusMod: { hullFlatBonus: 45, combatDpsMult: 1.16, warScoreMult: 1.25 },
    stage1SecondaryMod: { hullFlatBonus: 20 },
    stage3SecLabel: 'Artilharia Pesada & Morteiro Orbital',
    stage3SecHint: 'Arma: Morteiro de Bombardeio Orbital (24 DPS) + +20 Casco',
    stage3SecEquip: { category: 'weapon', itemId: 'morteiro_bombardeio_orbital' },
    stage3SecMod: { hullFlatBonus: 20 },
  },
  cromalitas: {
    hullId: 'nave_cromalitas_sentinela',
    consumableId: 'con_cromalitas',
    abilityId: 'hab_sp_cromalitas',
    techCategory: 'shield',
    techId: 'espelho_cromalita',
    techLabel: 'Égide Espelhada Cromálita',
    techHint: 'Escudo Exclusivo (+85 Cap., 76% anti-laser, Reflete 22% do dano)',
    stage1BonusTitle: 'Matriz de Refração Perfeita',
    stage1BonusHint: '+30% Capacidade de Escudos · +30% Recarga · +10% Comércio',
    stage1BonusMod: { shieldCapMult: 1.3, shieldRegenMult: 1.3, tradePriceBonus: 0.1 },
    stage1SecondaryMod: { shieldCapMult: 1.15 },
    stage3SecLabel: 'Laser de Pulso Prismático Nv 3',
    stage3SecHint: 'Arma Nv 3: Laser de Pulso Prismático (33 DPS, Alc. 22)',
    stage3SecEquip: { category: 'weapon', itemId: 'laser_pulso_prismático' },
  },
  sylvaris: {
    hullId: 'nave_sylvaris_viva',
    consumableId: 'con_sylvaris',
    abilityId: 'hab_sp_sylvaris',
    techCategory: 'shield',
    techId: 'casulo_vivo_sylvaris',
    techLabel: 'Casulo Simbiótico Sylvaris',
    techHint: 'Escudo Exclusivo (+80 Cap., recarga orgânica veloz 8.8/s)',
    stage1BonusTitle: 'Pacto dos Ecossistemas Vivos',
    stage1BonusHint: '+1.2 Casco/s passivo · +26 Exploração · +18% Reputação',
    stage1BonusMod: { hullRegenPerSec: 1.2, explorerBonus: 26, renownGainMult: 1.18 },
    stage1SecondaryMod: { hullRegenPerSec: 0.6 },
    stage3SecLabel: 'Extrator Simbiótico & Escâner de Fauna',
    stage3SecHint: 'Extrator Biológico Nv 3 (1.6/s) + Escâner de Fauna',
    stage3SecEquip: { category: 'extractor', itemId: 'coletor_biologico_mk2' },
    stage3SecMod: { explorerBonus: 18 },
  },
  espinhoes_vex: {
    hullId: 'nave_vex_esporao',
    consumableId: 'con_vex',
    abilityId: 'hab_sp_vex',
    techCategory: 'weapon',
    techId: 'lanca_espora_vex',
    techLabel: 'Lança Esporal de Vex',
    techHint: 'Arma Nv 2 Exclusiva (22 DPS Plasma Corrosivo)',
    stage1BonusTitle: 'Frenesi Esporal de Fronteira',
    stage1BonusHint: '+20% Dano (DPS) · +18% Extração · +25% Guerra Galáctica',
    stage1BonusMod: { combatDpsMult: 1.2, minerRateMult: 1.18, warScoreMult: 1.25 },
    stage1SecondaryMod: { combatDpsMult: 1.08 },
    stage3SecLabel: 'Casulo Bio-Adaptativo & Toxinas',
    stage3SecHint: 'Filtro Antitóxico + +28 Casco + +0.7 Casco/s',
    stage3SecEquip: { category: 'suit', itemId: 'prot_toxicidade' },
    stage3SecMod: { hullFlatBonus: 28, hullRegenPerSec: 0.7 },
  },
  lotus_silenciosos: {
    hullId: 'nave_lotus_santuario',
    consumableId: 'con_lotus',
    abilityId: 'hab_sp_lotus',
    techCategory: 'suit',
    techId: 'drone_superficie',
    techLabel: 'Drone Autônomo do Mosteiro',
    techHint: 'Drone Épico de Superfície (+22 Exploração, +22 Poder Solo)',
    stage1BonusTitle: 'Contemplação & Sabedoria Botânica',
    stage1BonusHint: '+32 Exploração · +30 Resist. Riscos · +20% Reputação',
    stage1BonusMod: { explorerBonus: 32, hazardResistBonus: 0.3, renownGainMult: 1.2 },
    stage1SecondaryMod: { explorerBonus: 15 },
    stage3SecLabel: 'Escâner de Fauna & Coletor Biológico',
    stage3SecHint: 'Escâner de Fauna + -25% consumo de mantimentos',
    stage3SecEquip: { category: 'suit', itemId: 'escaner_fauna' },
    stage3SecMod: { supplyCostMult: 0.75 },
  },
  litoides_basalto: {
    hullId: 'nave_litoides_escavador',
    consumableId: 'con_litoides',
    abilityId: 'hab_sp_litoides',
    techCategory: 'extractor',
    techId: 'escavador_arqueologico_mk1',
    techLabel: 'Escavador de Precisão Basalto',
    techHint: 'Extrator Nv 3 (2.2/s Arqueológico) + +15% Mineração',
    stage1BonusTitle: 'Solidez Geológica Milenar',
    stage1BonusHint: '+32% Velocidade de Mineração · +40 Casco · +50 Carga',
    stage1BonusMod: { minerRateMult: 1.32, hullFlatBonus: 40, cargoFlatBonus: 50 },
    stage1SecondaryMod: { minerRateMult: 1.15 },
    stage3SecLabel: 'Placas de Basalto Reforçado',
    stage3SecHint: 'Escudo Nv 3: Placas de Basalto (+115 Cap., 62% anti-míssil)',
    stage3SecEquip: { category: 'shield', itemId: 'placas_basalto_reforcado' },
  },
  drakolitos: {
    hullId: 'nave_drakolitos_drakar',
    consumableId: 'con_drakolitos',
    abilityId: 'hab_sp_drakolitos',
    techCategory: 'weapon',
    techId: 'bateria_magma_drakolito',
    techLabel: 'Morteiro Magmático Drakólito',
    techHint: 'Arma Nv 2 Exclusiva (25 DPS Míssil + Bombardeio Orbital)',
    stage1BonusTitle: 'Fúria Tectônica de Cratera',
    stage1BonusHint: '+24% DPS · +30 Casco · +25% Guerra Galáctica',
    stage1BonusMod: { combatDpsMult: 1.24, hullFlatBonus: 30, warScoreMult: 1.25 },
    stage1SecondaryMod: { combatDpsMult: 1.1 },
    stage3SecLabel: 'Revestimento Térmico de Magma',
    stage3SecHint: 'Proteção Térmica + Canhão Gauss de Basalto (21 DPS)',
    stage3SecEquip: { category: 'suit', itemId: 'prot_calor' },
    stage3SecMod: { hazardResistBonus: 0.25, combatDpsMult: 1.1 },
  },
  quartzos_thul: {
    hullId: 'nave_thul_prisma',
    consumableId: 'con_thul',
    abilityId: 'hab_sp_thul',
    techCategory: 'weapon',
    techId: 'prisma_fotonico_thul',
    techLabel: 'Lente Prismática de Thul',
    techHint: 'Arma Nv 2 Exclusiva (22 DPS Laser, Alcance 25)',
    stage1BonusTitle: 'Memória Cristalina dos Arquivos',
    stage1BonusHint: '+28% Escudos · +24 Exploração · +15% Reputação',
    stage1BonusMod: { shieldCapMult: 1.28, explorerBonus: 24, renownGainMult: 1.15 },
    stage1SecondaryMod: { shieldRegenMult: 1.2 },
    stage3SecLabel: 'Escavador Arqueológico & Refrator',
    stage3SecHint: 'Escudo Refrator Prisma (+65 Cap., Reflete 12%)',
    stage3SecEquip: { category: 'shield', itemId: 'escudo_refrator_prisma' },
  },
  vespideos_mel: {
    hullId: 'nave_vespideos_colmeia',
    consumableId: 'con_vespideos',
    abilityId: 'hab_sp_vespideos',
    techCategory: 'utility',
    techId: 'rebocador_mercantil_mk2',
    techLabel: 'Contêiner de Enxame Vespídeo',
    techHint: 'Módulo Nv 3 (+90 Carga no compartimento de carga) + +6% Comércio',
    stage1BonusTitle: 'Logística Cooperativa da Colmeia',
    stage1BonusHint: '+75 Carga fixa · +14% Lucro Comercial · -25% Mantimentos',
    stage1BonusMod: { cargoFlatBonus: 75, tradePriceBonus: 0.14, supplyCostMult: 0.75 },
    stage1SecondaryMod: { tradePriceBonus: 0.06 },
    stage3SecLabel: 'Tanque Criogênico & Autonomia',
    stage3SecHint: 'Tanque Auxiliar (+100 Combustível máx.) + -20% Consumo',
    stage3SecEquip: { category: 'utility', itemId: 'tanque_auxiliar' },
    stage3SecMod: { fuelCostMult: 0.8 },
  },
  krikkari: {
    hullId: 'nave_krikkari_cacador',
    consumableId: 'con_krikkari',
    abilityId: 'hab_sp_krikkari',
    techCategory: 'weapon',
    techId: 'enxame_agulha_krikkari',
    techLabel: 'Bateria Enxame Krikkari',
    techHint: 'Arma Nv 2 Exclusiva (24 DPS Míssil, Alc. 24, 1.4/s)',
    stage1BonusTitle: 'Tática de Raide Rápido',
    stage1BonusHint: '+22% DPS · +16% Chance de Fuga · -15% Combustível · +25% Guerra Galáctica',
    stage1BonusMod: { combatDpsMult: 1.22, fleeBonusPct: 16, fuelCostMult: 0.85, warScoreMult: 1.25 },
    stage1SecondaryMod: { combatDpsMult: 1.1, fleeBonusPct: 6 },
    stage3SecLabel: 'Propulsor de Raide Setorial',
    stage3SecHint: 'Motor de Salto Setorial Mk.II (24 a.l.) + +15% Furtividade',
    stage3SecEquip: { category: 'jumpDrive', itemId: 'motor_setorial_mk2' },
    stage3SecMod: { cloakBonus: 0.15 },
  },
  mantis_sombra: {
    hullId: 'nave_mantis_predadora',
    consumableId: 'con_mantis',
    abilityId: 'hab_sp_mantis',
    techCategory: 'weapon',
    techId: 'lanca_toxina_mantis',
    techLabel: 'Dardo Sombrio Mantis',
    techHint: 'Arma Nv 2 Exclusiva (23 DPS Plasma Cirúrgico, Alc. 23)',
    stage1BonusTitle: 'Emboscada Letal nas Sombras',
    stage1BonusHint: '+28% Furtividade · +15% Chance de Fuga · +20% DPS · +18 Exploração',
    stage1BonusMod: { cloakBonus: 0.28, fleeBonusPct: 15, combatDpsMult: 1.2, explorerBonus: 18 },
    stage1SecondaryMod: { cloakBonus: 0.12, fleeBonusPct: 6 },
    stage3SecLabel: 'Camuflagem Tática Avançada Mantis',
    stage3SecHint: 'Módulo de Camuflagem Tática + Escâner de Fauna',
    stage3SecEquip: { category: 'utility', itemId: 'camuflagem_tatica' },
    stage3SecMod: { combatDpsMult: 1.1 },
  },
  vaelorianos: {
    hullId: 'nave_vaelor_hidro',
    consumableId: 'con_vaelorianos',
    abilityId: 'hab_sp_vaelorianos',
    techCategory: 'extractor',
    techId: 'bomba_criogenica_mk2',
    techLabel: 'Bomba Hidrodinâmica Vaelor',
    techHint: 'Extrator Nv 3 (1.6/s Líquidos/Gelo) + +18% Mineração',
    stage1BonusTitle: 'Talassocracia das Rotas Líquidas',
    stage1BonusHint: '+12% Comércio · +60 Carga · +10% Chance de Fuga · +18% Reputação Diplomático',
    stage1BonusMod: { tradePriceBonus: 0.12, cargoFlatBonus: 60, fleeBonusPct: 10, renownGainMult: 1.18 },
    stage1SecondaryMod: { tradePriceBonus: 0.06 },
    stage3SecLabel: 'Manto Dissipador & Pactos Marinhos',
    stage3SecHint: 'Escudo Nv 3: Manto Criogênico (+105 Cap., 7.5/s recarga)',
    stage3SecEquip: { category: 'shield', itemId: 'manto_criogenico_dissipador' },
  },
  nautilideos_mael: {
    hullId: 'nave_mael_nautilus',
    consumableId: 'con_mael',
    abilityId: 'hab_sp_mael',
    techCategory: 'weapon',
    techId: 'torpedo_abissal_mael',
    techLabel: 'Torpedo Abissal de Mael',
    techHint: 'Arma Nv 2 Exclusiva (24 DPS Míssil + Bombardeio Orbital)',
    stage1BonusTitle: 'Corsários das Fossas Geladas',
    stage1BonusHint: '+20% DPS · +32 Casco · +25% Guerra Galáctica',
    stage1BonusMod: { combatDpsMult: 1.2, hullFlatBonus: 32, warScoreMult: 1.25 },
    stage1SecondaryMod: { combatDpsMult: 1.08 },
    stage3SecLabel: 'Exoesqueleto Abissal de Pressão',
    stage3SecHint: 'Traje: Exoesqueleto Alta Pressão + Escudo Defletor',
    stage3SecEquip: { category: 'suit', itemId: 'prot_pressao' },
    stage3SecMod: { shieldCapMult: 1.2 },
  },
  abissais_glacio: {
    hullId: 'nave_glacio_quebragelo',
    consumableId: 'con_glacio',
    abilityId: 'hab_sp_glacio',
    techCategory: 'shield',
    techId: 'barreira_glacial_abissal',
    techLabel: 'Campo Criogênico de Glácio',
    techHint: 'Escudo Exclusivo (+82 Cap., 6.8/s, 58% anti-plasma/míssil)',
    stage1BonusTitle: 'Clausura Criogênica Primordial',
    stage1BonusHint: '+30% Escudos · +28 Resist. Riscos · -22% Combustível',
    stage1BonusMod: { shieldCapMult: 1.3, hazardResistBonus: 0.28, fuelCostMult: 0.78 },
    stage1SecondaryMod: { shieldRegenMult: 1.2 },
    stage3SecLabel: 'Sonda Abissal & Isolamento Glacial',
    stage3SecHint: 'Traje: Isolamento Criogênico + Scanner Longo Alcance',
    stage3SecEquip: { category: 'suit', itemId: 'prot_frio' },
    stage3SecMod: { explorerBonus: 22 },
  },
};

export const SPECIES_STAGE1_CHOICES: Record<string, VisualNovelChoice[]> = Object.fromEntries(
  Object.keys(SPECIES_PACKS).map((speciesId) => {
    const sp = SPECIES_BY_ID[speciesId];
    const pack = SPECIES_PACKS[speciesId];
    const ab = SPECIAL_ABILITIES_BY_ID[pack.abilityId];
    const choices: VisualNovelChoice[] = [
      {
        id: `sp1_${speciesId}_tech`,
        label: `Tecnologia Exclusiva: ${pack.techLabel}`,
        categoryTag: `Tecnologia ${sp.name}`,
        previewEquipment: { category: pack.techCategory, itemId: pack.techId },
        hint: pack.techHint,
        consequenceText: `Engenheiros ${sp.name} instalam a tecnologia exclusiva ${pack.techLabel} na sua nave.`,
        effects: {
          giveEquipment: [{ category: pack.techCategory, itemId: pack.techId }],
          bonusModifiers: pack.stage1SecondaryMod,
        },
        nextNodeId: 'open_2',
      },
      {
        id: `sp1_${speciesId}_bonus`,
        label: pack.stage1BonusTitle,
        categoryTag: `Bônus Fixo ${sp.name}`,
        hint: pack.stage1BonusHint,
        consequenceText: `Você herda permanentemente a aptidão clássica dos ${sp.name}.`,
        effects: {
          bonusModifiers: pack.stage1BonusMod,
          renownDelta: 12,
        },
        nextNodeId: 'open_2',
      },
      {
        id: `sp1_${speciesId}_ability`,
        label: `Habilidade Especial: ${ab.name}`,
        categoryTag: `Habilidade ${sp.name}`,
        hint: `${ab.summary}`,
        consequenceText: `Você domina a técnica exclusiva ${ab.name} dos ${sp.name}.`,
        effects: {
          grantAbilityId: ab.id,
          bonusModifiers: pack.stage1SecondaryMod,
        },
        nextNodeId: 'open_2',
      },
    ];
    return [speciesId, choices];
  })
);

export const SPECIES_STAGE3_CHOICES: Record<string, VisualNovelChoice[]> = Object.fromEntries(
  Object.keys(SPECIES_PACKS).map((speciesId) => {
    const sp = SPECIES_BY_ID[speciesId];
    const pack = SPECIES_PACKS[speciesId];
    const hullDef = HULLS_BY_ID[pack.hullId];
    const conDef = CONSUMABLES_BY_ID[pack.consumableId];
    const choices: VisualNovelChoice[] = [
      {
        id: `sp3_${speciesId}_ship`,
        label: hullDef ? `Nave Exclusiva: ${hullDef.name}` : `Nave Especial Exclusiva da Raça`,
        categoryTag: `Nave Exclusiva ${sp.name}`,
        previewHullId: pack.hullId,
        hint: hullDef
          ? `Casco ${hullDef.maxHull} · Blind. ${hullDef.armor} · Carga ${hullDef.cargoCapacity} · Escudos ${hullDef.defenseSlots} · Vel. ${hullDef.speed}`
          : `Recebe & assume o casco exclusivo de ${sp.name}`,
        consequenceText: hullDef
          ? `${hullDef.description} Substitui a Balsa Civil mantendo seus módulos.`
          : `O estaleiro entrega sua embarcação exclusiva ${sp.name}, transferindo seus módulos para o novo casco!`,
        effects: {
          giveHullId: pack.hullId,
        },
        nextNodeId: 'open_4',
      },
      {
        id: `sp3_${speciesId}_consumable`,
        label: conDef ? `4× ${conDef.name} (${sp.name})` : `Arsenal de Consumíveis Exclusivos (${sp.name})`,
        categoryTag: `Consumível Exclusivo`,
        previewEquipment: { category: 'consumable', itemId: pack.consumableId },
        hint: conDef
          ? `4× ${conDef.name} + 2× Kit Reparo + 2× Célula Salto + 60 Suprimentos`
          : `Recebe 4× Consumível Exclusivo da raça + 2× Kit de Reparo + 2× Célula de Salto`,
        consequenceText: conDef
          ? `Efeito do consumível exclusivo: ${conDef.description} (usável direto no painel de combate ou na nave).`
          : `Um arsenal exclusivo de consumíveis ${sp.name} é carregado para emergências de combate e viagem.`,
        effects: {
          giveConsumables: {
            [pack.consumableId]: 4,
            kit_reparo: 2,
            combustivel_salto: 2,
          },
          suppliesDelta: 60,
        },
        nextNodeId: 'open_4',
      },
      {
        id: `sp3_${speciesId}_spec`,
        label: pack.stage3SecLabel,
        categoryTag: `Especialização ${sp.name}`,
        previewEquipment: pack.stage3SecEquip
          ? { category: pack.stage3SecEquip.category, itemId: pack.stage3SecEquip.itemId }
          : pack.stage3BlueprintId
          ? { category: 'blueprint', itemId: pack.stage3BlueprintId }
          : undefined,
        hint: pack.stage3SecHint,
        consequenceText: `Você incorpora sistemas raros de ${sp.name}: ${pack.stage3SecLabel}.`,
        effects: {
          giveEquipment: pack.stage3SecEquip ? [pack.stage3SecEquip] : undefined,
          grantBlueprintId: pack.stage3BlueprintId,
          bonusModifiers: pack.stage3SecMod,
        },
        nextNodeId: 'open_4',
      },
    ];
    return [speciesId, choices];
  })
);

// ============================================================================
// 3. FACÇÃO — ETAPA 4: 3 Opções Exclusivas para CADA UMA das 42 Facções
// ============================================================================

const STYLE_GIFT_MAP: Record<
  FactionTechStyle,
  { category: 'weapon' | 'shield' | 'extractor' | 'utility' | 'suit'; itemId: string; label: string; desc: string }
> = {
  militar: {
    category: 'weapon',
    itemId: 'bateria_misseis_termicos',
    label: 'Bateria de Mísseis Térmicos',
    desc: 'Arma Nv 2 (22 DPS Míssil, Alcance 23)',
  },
  mercantil: {
    category: 'utility',
    itemId: 'rebocador_mercantil_mk2',
    label: 'Contêiner Gravitacional Mercantil',
    desc: 'Módulo Nv 3 (+90 Carga permanente no compartimento de carga)',
  },
  pesquisadores: {
    category: 'shield',
    itemId: 'escudo_refrator_prisma',
    label: 'Escudo Refrator Prisma',
    desc: 'Escudo Nv 2 (+65 Cap., 65% anti-laser, 12% reflexão)',
  },
  silicoide: {
    category: 'shield',
    itemId: 'barreira_gravitacional_cinetica',
    label: 'Barreira Gravitacional Cinética',
    desc: 'Escudo Nv 2 (+75 Cap., 68% anti-cinética, 45% anti-míssil)',
  },
  gasosa: {
    category: 'weapon',
    itemId: 'projetor_plasma_vorticial',
    label: 'Projetor de Plasma Vorticial',
    desc: 'Arma Nv 2 (19 DPS Plasma contra escudos)',
  },
  criogenica: {
    category: 'weapon',
    itemId: 'feixe_criogenico_pressao',
    label: 'Feixe Criogênico Subzero',
    desc: 'Arma Nv 2 (20 DPS Laser Criogênico)',
  },
  radioativa: {
    category: 'suit',
    itemId: 'prot_radiacao',
    label: 'Blindagem Anti-Radiação',
    desc: 'Traje Nv 3 (+16 Exploração, imunidade a radiação)',
  },
};

const AXIS_BONUS_SPEC: Record<
  FactionAxis,
  {
    doctrineTitle: string;
    perkTitle: string;
    perkHint: string;
    perkMod: Partial<OriginPassiveBonuses>;
    extraRenown: number;
    extraCredits: number;
  }
> = {
  Militar: {
    doctrineTitle: 'Comissão de Ataque & Fronteira',
    perkTitle: 'Foco de Guerra & Superioridade Tática',
    perkHint: '+20% Dano (DPS) · +40% Pontos em Guerra Galáctica · +25 Reputação',
    perkMod: { combatDpsMult: 1.2, warScoreMult: 1.4, hullFlatBonus: 20 },
    extraRenown: 25,
    extraCredits: 350,
  },
  Mercantil: {
    doctrineTitle: 'Consórcio de Rotas & Lucro Livre',
    perkTitle: 'Privilégio Aduaneiro & Carga Estelar',
    perkHint: '+15% Melhores Preços · +60 Carga · +650 Créditos · Licença Natal',
    perkMod: { tradePriceBonus: 0.15, cargoFlatBonus: 60 },
    extraRenown: 25,
    extraCredits: 650,
  },
  Tradicionalistas: {
    doctrineTitle: 'Guarda Ancestral & Selos Sagrados',
    perkTitle: 'Selo de Honra & Defesa Absoluta',
    perkHint: '+25% Escudos · +30% Reputação ganho · +40 Reputação inicial (Acesso Honrado)',
    perkMod: { shieldCapMult: 1.25, renownGainMult: 1.3, hazardResistBonus: 0.18 },
    extraRenown: 40,
    extraCredits: 300,
  },
  Reformistas: {
    doctrineTitle: 'Inovação & Fronteira Aberta',
    perkTitle: 'Subsídio de Pesquisa & Mineração',
    perkHint: '+28% Extração · -20% Combustível · +25 Exploração · +350 Créditos',
    perkMod: { minerRateMult: 1.28, fuelCostMult: 0.8, explorerBonus: 25 },
    extraRenown: 30,
    extraCredits: 350,
  },
};

export const FACTION_ORIGIN_CHOICES: Record<string, VisualNovelChoice[]> = Object.fromEntries(
  FACTIONS.map((fac) => {
    const ab = SPECIAL_ABILITIES_BY_ID[`hab_fac_${fac.id}`];
    const techGift = STYLE_GIFT_MAP[fac.techStyle];
    const axisSpec = AXIS_BONUS_SPEC[fac.axis];

    const choices: VisualNovelChoice[] = [
      {
        id: `fac_opt1_${fac.id}`,
        label: `${ab.name}`,
        categoryTag: `Habilidade da Facção (${fac.axis})`,
        hint: `${ab.summary} · +20 Reputação em ${fac.name}`,
        consequenceText: `${fac.name} investe você com a doutrina exclusiva "${ab.name}".`,
        effects: {
          grantAbilityId: ab.id,
          renownDelta: 20,
          factionId: fac.id,
          bonusModifiers:
            fac.axis === 'Militar'
              ? { warScoreMult: 1.25 }
              : fac.axis === 'Mercantil'
              ? { tradePriceBonus: 0.1, cargoFlatBonus: 55 }
              : fac.axis === 'Tradicionalistas'
              ? { renownGainMult: 1.2 }
              : { minerRateMult: 1.22, fuelCostMult: 0.84, explorerBonus: 22 },
          unlockHomeSectorLicenses: fac.axis === 'Mercantil',
        },
      },
      {
        id: `fac_opt2_${fac.id}`,
        label: `Tecnologia de ${fac.name}: ${techGift.label}`,
        categoryTag: `Tecnologia da Facção`,
        previewEquipment: { category: techGift.category, itemId: techGift.itemId },
        hint: `${techGift.desc} · +2× Capacitor de Escudo`,
        consequenceText: `Os arsenais de ${fac.name} equipam sua nave com ${techGift.label}.`,
        effects: {
          giveEquipment: [{ category: techGift.category, itemId: techGift.itemId }],
          giveConsumables: { escudo_descartavel: 2 },
          renownDelta: 15,
          factionId: fac.id,
        },
      },
      {
        id: `fac_opt3_${fac.id}`,
        label: `${axisSpec.doctrineTitle} (${fac.name})`,
        categoryTag: `Bônus Exclusivo da Facção`,
        hint: axisSpec.perkHint,
        consequenceText: `Você firma o pacto "${axisSpec.doctrineTitle}" recebendo privilégios permanentes de ${fac.name}.`,
        effects: {
          bonusModifiers: axisSpec.perkMod,
          renownDelta: axisSpec.extraRenown,
          factionId: fac.id,
          creditsDelta: axisSpec.extraCredits,
          unlockHomeSectorLicenses: true,
        },
      },
    ];
    return [fac.id, choices];
  })
);
