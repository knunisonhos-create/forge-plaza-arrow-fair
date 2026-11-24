import type {
  CreatureDanger,
  CreatureDef,
  CreatureSize,
  EcologicalRole,
  FactionAxis,
  FactionDef,
  FactionTechStyle,
  LifeFormDef,
  LifeFormId,
  SpeciesDef,
} from '../types/game';
import { SeededRNG } from '../utils/rng';

export const LIFE_FORMS: LifeFormDef[] = [
  {
    id: 'humanoide',
    name: 'Humanoides',
    biology: 'Vertebrados bípedes de sangue quente com sistema nervoso complexo e adaptação social versátil.',
    nicheSummary: 'Mundos oceânicos, florestais, biodiversos e em bloqueio de maré; foco em comércio e diplomacia.',
    color: '#38bdf8',
    accentColor: '#f59e0b',
    compatiblePlanetCodes: ['TX03', 'TX06', 'TX17', 'TX19', 'TX23', 'TX24', 'TX25', 'TX28'],
  },
  {
    id: 'espectroid',
    name: 'Espectroid',
    biology: 'Entidades de plasma coerente e campos eletromagnéticos conscientes sem estrutura celular sólida.',
    nicheSummary: 'Gigantes gasosos, mundos tóxicos, plasmáticos ou irradiados e sistemas de estrelas azuis ou pulsares.',
    color: '#c084fc',
    accentColor: '#22d3ee',
    compatiblePlanetCodes: ['TX12', 'TX13', 'TX15', 'TX16', 'TX17', 'TX18', 'TX19', 'TX21', 'TX22', 'TX28', 'TX29', 'TX30'],
  },
  {
    id: 'metalocto',
    name: 'Metalocto',
    biology: 'Organismos ciber-minerais com exoesqueleto metálico autorreparador alimentado por calor e radiação.',
    nicheSummary: 'Mundos rochosos áridos, metálicos e vulcânicos; foco em blindagem, mísseis e forjas.',
    color: '#f59e0b',
    accentColor: '#ef4444',
    compatiblePlanetCodes: ['TX01', 'TX02', 'TX04', 'TX09', 'TX11', 'TX13', 'TX20', 'TX22', 'TX28', 'TX30'],
  },
  {
    id: 'plantideo',
    name: 'Plantídeos',
    biology: 'Seres fotossintéticos vasculares móveis com redes neurais de raízes e comunicação por esporos.',
    nicheSummary: 'Mundos úmidos, florestais, biodiversos e fúngicos com luz estelar estável.',
    color: '#4ade80',
    accentColor: '#a3e635',
    compatiblePlanetCodes: ['TX06', 'TX07', 'TX14', 'TX17', 'TX23', 'TX24', 'TX26', 'TX27', 'TX28'],
  },
  {
    id: 'grutoide',
    name: 'Grutoides',
    biology: 'Simbiose bio-mineral de cristais siliciosos e micélios litófagos que prosperam sob alta pressão.',
    nicheSummary: 'Cavernas de mundos rochosos, vulcânicos, cristalinos e gelados.',
    color: '#a78bfa',
    accentColor: '#34d399',
    compatiblePlanetCodes: ['TX01', 'TX04', 'TX05', 'TX08', 'TX10', 'TX11', 'TX18', 'TX20', 'TX28', 'TX29'],
  },
  {
    id: 'insectoide',
    name: 'Insectoides',
    biology: 'Artrópodes quitinosos de colmeia coordenada com percepção química e ultrassônica.',
    nicheSummary: 'Mundos áridos, pantaneiros, sombrios e megafaunísticos; colmeias coordenadas.',
    color: '#fb923c',
    accentColor: '#facc15',
    compatiblePlanetCodes: ['TX02', 'TX07', 'TX14', 'TX21', 'TX23', 'TX24', 'TX25', 'TX26', 'TX28'],
  },
  {
    id: 'anfibio',
    name: 'Anfíbios Aqualíferos',
    biology: 'Criaturas anfíbias bioluminescentes com brânquias pressurizadas e ecolocalização subaquática.',
    nicheSummary: 'Mares profundos, pântanos densos e oceanos subglaciais.',
    color: '#2dd4bf',
    accentColor: '#60a5fa',
    compatiblePlanetCodes: ['TX03', 'TX05', 'TX07', 'TX24', 'TX27', 'TX28'],
  },
];

export const LIFE_FORMS_BY_ID: Record<LifeFormId, LifeFormDef> = Object.fromEntries(
  LIFE_FORMS.map((l) => [l.id, l])
) as Record<LifeFormId, LifeFormDef>;

// 21 Intelligent Species (3 per life form: pacífica, expansionista, isolada)
export const SPECIES: SpeciesDef[] = [
  // Humanoides
  {
    id: 'solarianos',
    name: 'Solarianos',
    lifeFormId: 'humanoide',
    temperament: 'pacifica',
    description: 'Navegadores humanoides pragmáticos voltados a tratados comerciais e rotas seguras.',
    traits: ['Rotas Mercantis', 'Diplomacia Aberta', 'Estaleiros Modulares'],
    color: '#38bdf8',
  },
  {
    id: 'valdris',
    name: 'Valdris',
    lifeFormId: 'humanoide',
    temperament: 'expansionista',
    description: 'Clãs humanoides audaciosos que fundam colônias agressivas nas fronteiras estelares.',
    traits: ['Frota Expedicionária', 'Colonização Rápida', 'Doutrina Armada'],
    color: '#ef4444',
  },
  {
    id: 'nyxianos',
    name: 'Nyxianos',
    lifeFormId: 'humanoide',
    temperament: 'isolada',
    description: 'Humanoides adaptados à penumbra orbital, reservados e protetores de seus arquivos.',
    traits: ['Sensores Furtivos', 'Vigilância Orbital', 'Protocolos Fechados'],
    color: '#818cf8',
  },

  // Espectroid
  {
    id: 'luminares_eter',
    name: 'Luminares de Éter',
    lifeFormId: 'espectroid',
    temperament: 'pacifica',
    description: 'Seres fotônicos serenos que harmonizam correntes de plasma em estações gasosas.',
    traits: ['Ressonância Pacífica', 'Coletores de Éter', 'Mediadores Cósmicos'],
    color: '#e879f9',
  },
  {
    id: 'pulsari',
    name: 'Pulsari',
    lifeFormId: 'espectroid',
    temperament: 'expansionista',
    description: 'Consciências nascidas de pulsares que reivindicam estrelas azuis e zonas irradiadas.',
    traits: ['Armas de Plasma', 'Expansão Energética', 'Intolerância Térmica'],
    color: '#c084fc',
  },
  {
    id: 'umbrais_fotonicos',
    name: 'Umbrais Fotônicos',
    lifeFormId: 'espectroid',
    temperament: 'isolada',
    description: 'Espectros silenciosos ligados a nebulosas sombrias e singularidades.',
    traits: ['Camuflagem Espectral', 'Estudo de Fendas', 'Acesso Restrito'],
    color: '#6366f1',
  },

  // Metalocto
  {
    id: 'ferronitas',
    name: 'Ferronitas',
    lifeFormId: 'metalocto',
    temperament: 'pacifica',
    description: 'Artesãos metálicos disciplinados que forjam os melhores cascos de carga da galáxia.',
    traits: ['Forja Industrial', 'Mineração Pesada', 'Contratos Sólidos'],
    color: '#fbbf24',
  },
  {
    id: 'titanios_forja',
    name: 'Titânios de Forja',
    lifeFormId: 'metalocto',
    temperament: 'expansionista',
    description: 'Legiões mecânicas blindadas criadoras da lendária Fragata de Dobra Metalocto.',
    traits: ['Blindagem Suprema', 'Baterias de Mísseis', 'Conquista Mineral'],
    color: '#f97316',
  },
  {
    id: 'cromalitas',
    name: 'Cromálitas',
    lifeFormId: 'metalocto',
    temperament: 'isolada',
    description: 'Sentinelas metálicos espelhados que guardam mundos artificiais e depósitos raros.',
    traits: ['Escudos Refletores', 'Autômatos de Guarda', 'Comércio Seletivo'],
    color: '#94a3b8',
  },

  // Plantídeos
  {
    id: 'sylvaris',
    name: 'Sylvaris',
    lifeFormId: 'plantideo',
    temperament: 'pacifica',
    description: 'Guardiões arbóreos de florestas estelares que cultivam ecossistemas simbióticos.',
    traits: ['Biociência Viva', 'Tratados Ecológicos', 'Cura Orgânica'],
    color: '#4ade80',
  },
  {
    id: 'espinhoes_vex',
    name: 'Espinhões de Vex',
    lifeFormId: 'plantideo',
    temperament: 'expansionista',
    description: 'Botânicos predadores que semeiam esporos agressivos por setores vizinhos.',
    traits: ['Guerra Biológica', 'Colonização Esporal', 'Cascos Vivos'],
    color: '#84cc16',
  },
  {
    id: 'lotus_silenciosos',
    name: 'Lótus Silenciosos',
    lifeFormId: 'plantideo',
    temperament: 'isolada',
    description: 'Monges vegetais contemplativos que raramente permitem pousos sem honra prévia.',
    traits: ['Sabedoria Botânica', 'Compostagem Pura', 'Isolamento Sagrado'],
    color: '#10b981',
  },

  // Grutoides
  {
    id: 'litoides_basalto',
    name: 'Litóides de Basalto',
    lifeFormId: 'grutoide',
    temperament: 'pacifica',
    description: 'Engenheiros subterrâneos pacientes que escavam túneis e vendem brocas de precisão.',
    traits: ['Perfuratrizes Profundas', 'Escudos de Rocha', 'Estabilidade Geológica'],
    color: '#a8a29e',
  },
  {
    id: 'drakolitos',
    name: 'Drakólitos',
    lifeFormId: 'grutoide',
    temperament: 'expansionista',
    description: 'Feras cristalinas vulcânicas que reivindicam cinturões metálicos e luas ricas.',
    traits: ['Força Tectônica', 'Armadura Vulcânica', 'Saque Orbital'],
    color: '#dc2626',
  },
  {
    id: 'quartzos_thul',
    name: 'Quartzos de Thul',
    lifeFormId: 'grutoide',
    temperament: 'isolada',
    description: 'Colecionadores cristalinos que codificam memórias em quartzo puro.',
    traits: ['Memória Cristalina', 'Lentes de Laser', 'Santuários Subterrâneos'],
    color: '#22d3ee',
  },

  // Insectoides
  {
    id: 'vespideos_mel',
    name: 'Vespídeos de Mel',
    lifeFormId: 'insectoide',
    temperament: 'pacifica',
    description: 'Colmeias cooperativas produtoras de enzimas raras e combustíveis orgânicos.',
    traits: ['Logística de Enxame', 'Bio-Refino', 'Comércio em Massa'],
    color: '#facc15',
  },
  {
    id: 'krikkari',
    name: 'Krikkari',
    lifeFormId: 'insectoide',
    temperament: 'expansionista',
    description: 'Enxames velozes de caçadores desertícolas que atacam comboios sem licença.',
    traits: ['Táticas de Enxame', 'Abordagem Rápida', 'Mísseis Térmicos'],
    color: '#ea580c',
  },
  {
    id: 'mantis_sombra',
    name: 'Mantis de Sombra',
    lifeFormId: 'insectoide',
    temperament: 'isolada',
    description: 'Predadores noturnos de mundos sombrios, temidos por emboscadas silenciosas.',
    traits: ['Emboscada Furtiva', 'Toxinas Letais', 'Vigilância Escura'],
    color: '#a855f7',
  },

  // Anfíbios aqualíferos
  {
    id: 'vaelorianos',
    name: 'Vaelorianos',
    lifeFormId: 'anfibio',
    temperament: 'pacifica',
    description: 'Diplomatas oceânicos que erguem metrópoles submersas e redes de comércio líquido.',
    traits: ['Hidrotecnologia', 'Pactos Marinhos', 'Bombas Líquidas'],
    color: '#2dd4bf',
  },
  {
    id: 'nautilideos_mael',
    name: 'Nautilídeos de Mael',
    lifeFormId: 'anfibio',
    temperament: 'expansionista',
    description: 'Corsários abissais que dominam rotas geladas e mares tempestuosos.',
    traits: ['Cascos Pressurizados', 'Corsários Abissais', 'Torpedos Criogênicos'],
    color: '#0284c7',
  },
  {
    id: 'abissais_glacio',
    name: 'Abissais de Glácio',
    lifeFormId: 'anfibio',
    temperament: 'isolada',
    description: 'Habitantes de oceanos sob quilômetros de gelo que guardam relíquias primordiais.',
    traits: ['Criogenia Extrema', 'Sondas Abissais', 'Clausura Glacial'],
    color: '#7dd3fc',
  },
];

export const SPECIES_BY_ID: Record<string, SpeciesDef> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s])
);

// 140 Non-Sociable Creatures (20 per life form)
const CREATURE_TEMPLATES: Record<
  LifeFormId,
  Array<{
    name: string;
    role: EcologicalRole;
    size: CreatureSize;
    danger: CreatureDanger;
    utility: string;
    rareNiche?: boolean;
  }>
> = {
  humanoide: [
    { name: 'Babuíno Orbital de Maré', role: 'herbívoro', size: 'médio', danger: 'baixo', utility: 'Couro elástico' },
    { name: 'Símio Planador Dourado', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Glândula equilibradora' },
    { name: 'Lêmure Bioluminescente', role: 'herbívoro', size: 'pequeno', danger: 'inofensivo', utility: 'Pigmento luminoso' },
    { name: 'Caçador Bípede das Dunas', role: 'predador', size: 'grande', danger: 'alto', utility: 'Tendão reforçado' },
    { name: 'Troglodita de Mangue', role: 'decompositor', size: 'médio', danger: 'moderado', utility: 'Enzima digestiva' },
    { name: 'Rastreador Noturno de Copa', role: 'predador', size: 'médio', danger: 'alto', utility: 'Olho fotossensível' },
    { name: 'Baleia Terrestre Bípode', role: 'filtrador', size: 'colossal', danger: 'moderado', utility: 'Óleo térmico', rareNiche: true },
    { name: 'Carrapato Simbionte Sanguíneo', role: 'parasita', size: 'microscópico', danger: 'moderado', utility: 'Anticoagulante raro' },
    { name: 'Corredor de Savana Estelar', role: 'presa', size: 'médio', danger: 'baixo', utility: 'Couro leve' },
    { name: 'Gorila de Falésia', role: 'herbívoro', size: 'grande', danger: 'alto', utility: 'Fibra muscular' },
    { name: 'Predador Alfa de Arquipélago', role: 'predador', size: 'grande', danger: 'mortal', utility: 'Presa calcificada', rareNiche: true },
    { name: 'Sanguessuga Aérea', role: 'parasita', size: 'pequeno', danger: 'baixo', utility: 'Toxina anestésica' },
    { name: 'Escavador de Cânion', role: 'decompositor', size: 'pequeno', danger: 'inofensivo', utility: 'Pó mineral orgânico' },
    { name: 'Gigante Manso das Ilhas', role: 'herbívoro', size: 'colossal', danger: 'baixo', utility: 'Couro espesso' },
    { name: 'Lobo Símio de Nevoeiro', role: 'predador', size: 'médio', danger: 'alto', utility: 'Pele isolante' },
    { name: 'Filtrador de Bruma Marinha', role: 'filtrador', size: 'pequeno', danger: 'inofensivo', utility: 'Sal biológico' },
    { name: 'Mico Elétrico de Copa', role: 'presa', size: 'pequeno', danger: 'baixo', utility: 'Célula bioelétrica' },
    { name: 'Necrófago de Ossário', role: 'decompositor', size: 'médio', danger: 'moderado', utility: 'Ácido estomacal' },
    { name: 'Titã Bípede Primordial', role: 'predador', size: 'colossal', danger: 'mortal', utility: 'Osso denso', rareNiche: true },
    { name: 'Micro-Ácaro Dermático', role: 'parasita', size: 'microscópico', danger: 'baixo', utility: 'Cultura simbiótica' },
  ],
  espectroid: [
    { name: 'Centelha Errante de Hélio', role: 'filtrador', size: 'pequeno', danger: 'inofensivo', utility: 'Carga iônica' },
    { name: 'Medusa de Plasma', role: 'predador', size: 'grande', danger: 'alto', utility: 'Filamento de plasma', rareNiche: true },
    { name: 'Sifão Magnético Parasita', role: 'parasita', size: 'microscópico', danger: 'moderado', utility: 'Núcleo magnético' },
    { name: 'Arraia Fotônica de Nuvem', role: 'filtrador', size: 'grande', danger: 'baixo', utility: 'Membrana refratora' },
    { name: 'Espectro Devorador de Gama', role: 'predador', size: 'colossal', danger: 'mortal', utility: 'Cristal de energia pura', rareNiche: true },
    { name: 'Fagulha Saltadora', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Pó luminescente' },
    { name: 'Vórtice Necrófago de Éter', role: 'decompositor', size: 'médio', danger: 'moderado', utility: 'Resíduo etérico' },
    { name: 'Serpente de Arco Voltaico', role: 'predador', size: 'médio', danger: 'alto', utility: 'Condutor vivo' },
    { name: 'Lótus de Radiação Pura', role: 'herbívoro', size: 'médio', danger: 'baixo', utility: 'Isótopo estável' },
    { name: 'Enxame de Fótons Frios', role: 'filtrador', size: 'microscópico', danger: 'inofensivo', utility: 'Gel fotônico' },
    { name: 'Parasita de Escudo Orbital', role: 'parasita', size: 'pequeno', danger: 'alto', utility: 'Capacitor orgânico' },
    { name: 'Baleia de Vento Solar', role: 'filtrador', size: 'colossal', danger: 'moderado', utility: 'Éter condensado', rareNiche: true },
    { name: 'Duende de Aurora', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Fósforo espectral' },
    { name: 'Lince de Ionosfera', role: 'predador', size: 'médio', danger: 'alto', utility: 'Lente energética' },
    { name: 'Limo Eletrostático', role: 'decompositor', size: 'microscópico', danger: 'baixo', utility: 'Catalisador de carga' },
    { name: 'Esfera de Fissão Silenciosa', role: 'herbívoro', size: 'grande', danger: 'moderado', utility: 'Núcleo isotópico' },
    { name: 'Sombra Drenante de Fenda', role: 'predador', size: 'grande', danger: 'mortal', utility: 'Matéria-fantasma', rareNiche: true },
    { name: 'Mariposa de Néon Gasoso', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Corante iônico' },
    { name: 'Sonda Viva de Pulsar', role: 'filtrador', size: 'médio', danger: 'moderado', utility: 'Bobina natural' },
    { name: 'Decompositor de Ondas', role: 'decompositor', size: 'pequeno', danger: 'baixo', utility: 'Pó dielétrico' },
  ],
  metalocto: [
    { name: 'Besouro de Ferro Bruto', role: 'herbívoro', size: 'pequeno', danger: 'inofensivo', utility: 'Liga bruta' },
    { name: 'Escorpião de Escória', role: 'predador', size: 'médio', danger: 'alto', utility: 'Ferrão de titânio' },
    { name: 'Carapaça Ambulante de Cromo', role: 'presa', size: 'médio', danger: 'baixo', utility: 'Placa espelhada' },
    { name: 'Ferrugem Viva Parasita', role: 'parasita', size: 'microscópico', danger: 'moderado', utility: 'Catalisador oxidante' },
    { name: 'Verme Perfurador de Magma', role: 'decompositor', size: 'colossal', danger: 'mortal', utility: 'Escama refratária', rareNiche: true },
    { name: 'Aranha de Fio de Cobre', role: 'predador', size: 'pequeno', danger: 'moderado', utility: 'Filamento condutor' },
    { name: 'Tartaruga de Tungstênio', role: 'herbívoro', size: 'grande', danger: 'baixo', utility: 'Casco blindado' },
    { name: 'Peneira de Poeira Férrea', role: 'filtrador', size: 'pequeno', danger: 'inofensivo', utility: 'Pó metálico puro' },
    { name: 'Golem Feral de Basalto', role: 'predador', size: 'grande', danger: 'alto', utility: 'Núcleo de forja', rareNiche: true },
    { name: 'Traça de Circuitos', role: 'parasita', size: 'microscópico', danger: 'alto', utility: 'Micro-solda biológica' },
    { name: 'Centopeia de Níquel', role: 'decompositor', size: 'médio', danger: 'baixo', utility: 'Segmento articulado' },
    { name: 'Gazela de Alumínio', role: 'presa', size: 'médio', danger: 'inofensivo', utility: 'Haste leve' },
    { name: 'Dragão Mecânico de Cratera', role: 'predador', size: 'colossal', danger: 'mortal', utility: 'Platina viva', rareNiche: true },
    { name: 'Esponja Magnética', role: 'filtrador', size: 'pequeno', danger: 'inofensivo', utility: 'Ímã biológico' },
    { name: 'Tatu de Aço Escovado', role: 'herbívoro', size: 'médio', danger: 'baixo', utility: 'Lâmina dorsal' },
    { name: 'Víbora de Mercúrio', role: 'predador', size: 'pequeno', danger: 'alto', utility: 'Toxina metálica' },
    { name: 'Cupim de Silício', role: 'decompositor', size: 'microscópico', danger: 'baixo', utility: 'Sílica refinada' },
    { name: 'Leviatã de Fornalha', role: 'filtrador', size: 'colossal', danger: 'moderado', utility: 'Liga térmica rara' },
    { name: 'Grilo Piezoelétrico', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Cristal sonoro' },
    { name: 'Ácaro Cortador de Casco', role: 'parasita', size: 'microscópico', danger: 'alto', utility: 'Micro-lâmina' },
  ],
  plantideo: [
    { name: 'Orquídea Carnívora Saltadora', role: 'predador', size: 'médio', danger: 'alto', utility: 'Néctar ácido' },
    { name: 'Musgo Ambulante', role: 'decompositor', size: 'pequeno', danger: 'inofensivo', utility: 'Fibra esponjosa' },
    { name: 'Cervo de Folhagem', role: 'presa', size: 'médio', danger: 'inofensivo', utility: 'Seiva nutritiva' },
    { name: 'Vinha Estranguladora', role: 'predador', size: 'grande', danger: 'alto', utility: 'Cabo orgânico resistente' },
    { name: 'Esporo Parasita Cerebral', role: 'parasita', size: 'microscópico', danger: 'mortal', utility: 'Neurotoxina rara', rareNiche: true },
    { name: 'Mangue Filtrador de Névoa', role: 'filtrador', size: 'grande', danger: 'inofensivo', utility: 'Água purificada' },
    { name: 'Cogumelo Andarilho', role: 'decompositor', size: 'pequeno', danger: 'baixo', utility: 'Esporo medicinal' },
    { name: 'Árvore-Baleia Flutuante', role: 'filtrador', size: 'colossal', danger: 'baixo', utility: 'Madeira leve', rareNiche: true },
    { name: 'Broto de Luz Estelar', role: 'herbívoro', size: 'pequeno', danger: 'inofensivo', utility: 'Clorofila densa' },
    { name: 'Cacto Lançador de Dardos', role: 'predador', size: 'médio', danger: 'moderado', utility: 'Espinho venenoso' },
    { name: 'Líquen Simbionte', role: 'parasita', size: 'microscópico', danger: 'baixo', utility: 'Corante biológico' },
    { name: 'Búfalo de Casca Dura', role: 'herbívoro', size: 'grande', danger: 'moderado', utility: 'Casca blindada' },
    { name: 'Lótus Predadora Abissal', role: 'predador', size: 'grande', danger: 'alto', utility: 'Enzima rara', rareNiche: true },
    { name: 'Semente Alada', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Óleo aromático' },
    { name: 'Raiz Necrófaga', role: 'decompositor', size: 'médio', danger: 'baixo', utility: 'Húmus concentrado' },
    { name: 'Hidra Botânica de Pântano', role: 'predador', size: 'colossal', danger: 'mortal', utility: 'Resina regenerativa', rareNiche: true },
    { name: 'Alga Lanterninha', role: 'filtrador', size: 'microscópico', danger: 'inofensivo', utility: 'Composto luminoso' },
    { name: 'Tatu de Pinha', role: 'herbívoro', size: 'pequeno', danger: 'baixo', utility: 'Escama vegetal' },
    { name: 'Fungo Sanguessuga', role: 'parasita', size: 'pequeno', danger: 'moderado', utility: 'Antibiótico natural' },
    { name: 'Bambu Corredor', role: 'presa', size: 'médio', danger: 'inofensivo', utility: 'Fibra oca' },
  ],
  grutoide: [
    { name: 'Caranguejo de Quartzo', role: 'herbívoro', size: 'pequeno', danger: 'baixo', utility: 'Fragmento de quartzo' },
    { name: 'Lagarto de Obsidiana', role: 'predador', size: 'médio', danger: 'alto', utility: 'Escama cortante' },
    { name: 'Pólipo de Caverna Úmida', role: 'filtrador', size: 'pequeno', danger: 'inofensivo', utility: 'Água mineral pura' },
    { name: 'Estalactite Viva', role: 'predador', size: 'grande', danger: 'alto', utility: 'Cristal ressonante' },
    { name: 'Bactéria Litófaga', role: 'decompositor', size: 'microscópico', danger: 'baixo', utility: 'Ácido silicioso' },
    { name: 'Gárgula de Diamante Bruto', role: 'predador', size: 'grande', danger: 'mortal', utility: 'Lasca diamantina', rareNiche: true },
    { name: 'Tatu de Ametista', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Gema bruta' },
    { name: 'Parasita de Geodo', role: 'parasita', size: 'microscópico', danger: 'moderado', utility: 'Sal cristalino' },
    { name: 'Minhoca de Granito', role: 'decompositor', size: 'grande', danger: 'moderado', utility: 'Areia refinada' },
    { name: 'Colosso de Gelo e Pedra', role: 'herbívoro', size: 'colossal', danger: 'alto', utility: 'Cristal criogênico', rareNiche: true },
    { name: 'Morcego Mineral', role: 'presa', size: 'pequeno', danger: 'baixo', utility: 'Membrana mineral' },
    { name: 'Aranha de Mármore', role: 'predador', size: 'médio', danger: 'moderado', utility: 'Fio calcário' },
    { name: 'Esponja de Túnel', role: 'filtrador', size: 'médio', danger: 'inofensivo', utility: 'Filtro poroso' },
    { name: 'Rato de Enxofre', role: 'herbívoro', size: 'pequeno', danger: 'baixo', utility: 'Pó sulfuroso' },
    { name: 'Sanguessuga de Mica', role: 'parasita', size: 'pequeno', danger: 'baixo', utility: 'Isolante térmico' },
    { name: 'Serpente de Rubi Subterrâneo', role: 'predador', size: 'grande', danger: 'mortal', utility: 'Cristal biológico', rareNiche: true },
    { name: 'Fungolito de Breu', role: 'decompositor', size: 'pequeno', danger: 'inofensivo', utility: 'Carvão ativo' },
    { name: 'Boi de Calcário', role: 'herbívoro', size: 'grande', danger: 'baixo', utility: 'Placa calcária' },
    { name: 'Vaga-lume de Cristal', role: 'presa', size: 'microscópico', danger: 'inofensivo', utility: 'Fósforo mineral' },
    { name: 'Titã Geológico Adormecido', role: 'filtrador', size: 'colossal', danger: 'moderado', utility: 'Núcleo de cristal', rareNiche: true },
  ],
  insectoide: [
    { name: 'Formiga Cortadeira de Duna', role: 'herbívoro', size: 'pequeno', danger: 'baixo', utility: 'Quitina leve' },
    { name: 'Louva-a-Deus Espectral', role: 'predador', size: 'grande', danger: 'mortal', utility: 'Garra sombria', rareNiche: true },
    { name: 'Cigarra de Areia', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Asa translúcida' },
    { name: 'Vespa Ácida de Colmeia', role: 'predador', size: 'médio', danger: 'alto', utility: 'Veneno ácido' },
    { name: 'Larva Necrófaga Gigante', role: 'decompositor', size: 'médio', danger: 'moderado', utility: 'Seda orgânica' },
    { name: 'Pulga de Megafauna', role: 'parasita', size: 'microscópico', danger: 'moderado', utility: 'Toxina hemorrágica' },
    { name: 'Besouro Escudo de Savana', role: 'herbívoro', size: 'grande', danger: 'baixo', utility: 'Carapaça espessa' },
    { name: 'Libélula Filtradora de Pântano', role: 'filtrador', size: 'pequeno', danger: 'inofensivo', utility: 'Óleo de asa' },
    { name: 'Escorpião Rei do Breu', role: 'predador', size: 'colossal', danger: 'mortal', utility: 'Toxina letal', rareNiche: true },
    { name: 'Traça Luminescente', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Pó reflexivo' },
    { name: 'Ácaro de Quitina', role: 'parasita', size: 'microscópico', danger: 'baixo', utility: 'Enzima quitinosa' },
    { name: 'Rola-Bosta Mineral', role: 'decompositor', size: 'pequeno', danger: 'inofensivo', utility: 'Composto fértil' },
    { name: 'Centopeia Caçadora', role: 'predador', size: 'grande', danger: 'alto', utility: 'Segmento venenoso' },
    { name: 'Pulgão de Seiva Estelar', role: 'herbívoro', size: 'microscópico', danger: 'inofensivo', utility: 'Melado doce' },
    { name: 'Aranha de Teia Metálica', role: 'predador', size: 'médio', danger: 'alto', utility: 'Fio de alta tensão', rareNiche: true },
    { name: 'Barata Blindada de Cinzas', role: 'decompositor', size: 'pequeno', danger: 'baixo', utility: 'Placa resistente' },
    { name: 'Gafanhoto Saltador', role: 'presa', size: 'médio', danger: 'inofensivo', utility: 'Tendão elástico' },
    { name: 'Colmeia Flutuante Viva', role: 'filtrador', size: 'colossal', danger: 'moderado', utility: 'Cera térmica', rareNiche: true },
    { name: 'Percevejo Sombrio', role: 'parasita', size: 'pequeno', danger: 'moderado', utility: 'Secreção escura' },
    { name: 'Zangão Polinizador Real', role: 'herbívoro', size: 'médio', danger: 'baixo', utility: 'Geleia energética' },
  ],
  anfibio: [
    { name: 'Salamandra Bioluminescente', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Muco luminoso' },
    { name: 'Tubarão Anfíbio de Maré', role: 'predador', size: 'grande', danger: 'alto', utility: 'Couro hidrodinâmico' },
    { name: 'Sapo Gigante Filtrador', role: 'filtrador', size: 'médio', danger: 'baixo', utility: 'Membrana acústica' },
    { name: 'Enguia Elétrica Subglacial', role: 'predador', size: 'grande', danger: 'mortal', utility: 'Órgão elétrico', rareNiche: true },
    { name: 'Tritão Necrófago de Fossa', role: 'decompositor', size: 'médio', danger: 'moderado', utility: 'Óleo de fígado' },
    { name: 'Lampreia Abissal', role: 'parasita', size: 'pequeno', danger: 'alto', utility: 'Anticoagulante marinho' },
    { name: 'Peixe-Boi de Algas', role: 'herbívoro', size: 'grande', danger: 'inofensivo', utility: 'Gordura isolante' },
    { name: 'Krill Luminoso Gigante', role: 'filtrador', size: 'microscópico', danger: 'inofensivo', utility: 'Proteína pura' },
    { name: 'Leviatã Subglacial', role: 'predador', size: 'colossal', danger: 'mortal', utility: 'Escama abissal', rareNiche: true },
    { name: 'Axolote de Lago Ácido', role: 'herbívoro', size: 'pequeno', danger: 'baixo', utility: 'Tecido regenerativo' },
    { name: 'Rã Venenosa Dourada', role: 'presa', size: 'pequeno', danger: 'alto', utility: 'Toxina potente' },
    { name: 'Lula Anfíbia de Mangue', role: 'predador', size: 'médio', danger: 'moderado', utility: 'Tinta isolante' },
    { name: 'Caracol Marinho Gigante', role: 'decompositor', size: 'médio', danger: 'inofensivo', utility: 'Concha calcária' },
    { name: 'Piolho de Baleia Estelar', role: 'parasita', size: 'microscópico', danger: 'baixo', utility: 'Quitina úmida' },
    { name: 'Arraia de Gelo Profundo', role: 'filtrador', size: 'grande', danger: 'baixo', utility: 'Cartilagem criogênica' },
    { name: 'Crocodilo de Pântano Estelar', role: 'predador', size: 'colossal', danger: 'mortal', utility: 'Couro encouraçado', rareNiche: true },
    { name: 'Girino Voador de Névoa', role: 'presa', size: 'pequeno', danger: 'inofensivo', utility: 'Saco gasoso' },
    { name: 'Sanguessuga Glacial', role: 'parasita', size: 'pequeno', danger: 'moderado', utility: 'Fluido anticongelante' },
    { name: 'Tartaruga Coralina', role: 'herbívoro', size: 'grande', danger: 'inofensivo', utility: 'Casco coralino' },
    { name: 'Polvo Mimético de Fossa', role: 'predador', size: 'médio', danger: 'alto', utility: 'Célula camuflante', rareNiche: true },
  ],
};

export const CREATURES: CreatureDef[] = (Object.keys(CREATURE_TEMPLATES) as LifeFormId[]).flatMap(
  (lifeFormId) => {
    const lf = LIFE_FORMS_BY_ID[lifeFormId];
    return CREATURE_TEMPLATES[lifeFormId].map((tpl, idx) => {
      const rareBonus = tpl.rareNiche ? 1.85 : 1.0;
      const dangerMult =
        tpl.danger === 'mortal' ? 2.4 : tpl.danger === 'alto' ? 1.7 : tpl.danger === 'moderado' ? 1.3 : 1.0;
      return {
        id: `creature_${lifeFormId}_${idx + 1}`,
        name: tpl.name,
        lifeFormId,
        ecologicalRole: tpl.role,
        size: tpl.size,
        danger: tpl.danger,
        utility: tpl.utility,
        rareNiche: Boolean(tpl.rareNiche),
        preferredPlanetCodes: lf.compatiblePlanetCodes,
        baseValue: Math.round(75 * rareBonus * dangerMult * 3),
        description: `${tpl.size.charAt(0).toUpperCase() + tpl.size.slice(1)} (${tpl.role}) — perigo ${tpl.danger}. Fornece: ${tpl.utility}.`,
      };
    });
  }
);

export const CREATURES_BY_ID: Record<string, CreatureDef> = Object.fromEntries(
  CREATURES.map((c) => [c.id, c])
);

// 42 Factions (2 per species = 42 exact sectors)
const FACTION_META: Record<
  string,
  [
    { name: string; axis: FactionAxis; style: FactionTechStyle; color: string; customs: string; laws: string; econ: string; restricted?: boolean },
    { name: string; axis: FactionAxis; style: FactionTechStyle; color: string; customs: string; laws: string; econ: string; restricted?: boolean },
  ]
> = {
  solarianos: [
    { name: 'Liga Mercantil de Solis', axis: 'Mercantil', style: 'mercantil', color: '#38bdf8', customs: 'Hospitalidade em portos livres e contratos selados em áudio.', laws: 'Tarifas reduzidas para aliados; pirataria punida com bloqueio.', econ: 'Rotas comerciais e transporte de carga.' },
    { name: 'Ordem Reformista do Alvorecer', axis: 'Reformistas', style: 'pesquisadores', color: '#0ea5e9', customs: 'Assembleias abertas de cartógrafos e exploração científica.', laws: 'Exige escaneamento limpo de carga biológica.', econ: 'Scanners e sondas estelares.' },
  ],
  valdris: [
    { name: 'Pacto Marcial Valdris', axis: 'Militar', style: 'militar', color: '#ef4444', customs: 'Duelos de honra e saudações por pulso de escudo.', laws: 'Entrada armada monitorada; recompensa por caça a rivais.', econ: 'Armamento balístico e corvetas.', restricted: true },
    { name: 'Vanguarda Colonial Valdris', axis: 'Expansionistas' as unknown as FactionAxis, style: 'silicoide', color: '#f87171', customs: 'Celebração de cada nova colônia erguida além da fronteira.', laws: 'Incentivos a entrega de materiais estruturais.', econ: 'Colonização e mineração pesada.' },
  ],
  nyxianos: [
    { name: 'Conclave Tradicional de Nyx', axis: 'Tradicionalistas', style: 'pesquisadores', color: '#818cf8', customs: 'Comunicações criptografadas e respeito ao silêncio orbital.', laws: 'Licença ou reputação positivo para acessar planetas centrais.', econ: 'Camuflagem e sensores.', restricted: true },
    { name: 'Consórcio Sombra de Ébano', axis: 'Mercantil', style: 'mercantil', color: '#6366f1', customs: 'Leilões discretos de artefatos e rotas não registradas.', laws: 'Proíbe divulgação de coordenadas privadas.', econ: 'Comércio discreto e relíquias.' },
  ],
  luminares_eter: [
    { name: 'Coro Harmônico do Éter', axis: 'Tradicionalistas', style: 'gasosa', color: '#e879f9', customs: 'Diálogos musicais transmitidos em frequências de rádio.', laws: 'Proibida extração agressiva em gigantes gasosos sagrados.', econ: 'Coletores atmosféricos e éter.' },
    { name: 'Fórum Luminar Aberto', axis: 'Reformistas', style: 'pesquisadores', color: '#f472b6', customs: 'Troca livre de dados espectrais entre naves visitantes.', laws: 'Proteção estrita a criaturas de plasma.', econ: 'Energia pura e scanners.' },
  ],
  pulsari: [
    { name: 'Frente Radiante Pulsari', axis: 'Militar', style: 'radioativa', color: '#c084fc', customs: 'Provas de resistência em tempestades solares.', laws: 'Acesso restrito em zonas de conflito alto.', econ: 'Extratores de energia e armas gama.', restricted: true },
    { name: 'Sindicato de Plasma de Vela', axis: 'Mercantil', style: 'gasosa', color: '#a855f7', customs: 'Comércio medido em megawatts transferidos.', laws: 'Impostos sobre combustíveis fósseis.', econ: 'Plasma condensado e hélio-3.' },
  ],
  umbrais_fotonicos: [
    { name: 'Observatório Umbral Silente', axis: 'Tradicionalistas', style: 'pesquisadores', color: '#4f46e5', customs: 'Observação silenciosa de buracos negros e fendas.', laws: 'Exige reputação confiável para desembarque.', econ: 'Matéria escura e sensores profundos.', restricted: true },
    { name: 'Círculo Espectral Reformado', axis: 'Reformistas', style: 'gasosa', color: '#7c3aed', customs: 'Expedições cooperativas em nebulosas periféricas.', laws: 'Proíbe armas cinéticas em estações etéricas.', econ: 'Gases exóticos e matéria-fantasma.' },
  ],
  ferronitas: [
    { name: 'Guilda dos Fundidores Ferronitas', axis: 'Mercantil', style: 'silicoide', color: '#fbbf24', customs: 'Avaliação da qualidade do casco ao atracar.', laws: 'Garantia comercial em contratos cumpridos no prazo.', econ: 'Metais refinados, brocas e cargueiros.' },
    { name: 'Mestres da Bigorna Eterna', axis: 'Tradicionalistas', style: 'silicoide', color: '#d97706', customs: 'Rituais de têmpera em mundos vulcânicos.', laws: 'Proíbe descarte de sucata em órbita.', econ: 'Blindagem pesada e brocas bio-minerais.' },
  ],
  titanios_forja: [
    { name: 'Legião de Aço Metalocto', axis: 'Militar', style: 'militar', color: '#f97316', customs: 'Testes contínuos de blindagem e simulações táticas.', laws: 'Naves sem escudo recebem alertas de risco.', econ: 'Fragatas de dobra e mísseis térmicos.', restricted: true },
    { name: 'Forjas Expansionistas de Ferro', axis: 'Reformistas', style: 'silicoide', color: '#ea580c', customs: 'Construção acelerada de estaleiros em fronteiras.', laws: 'Compra constante de titânio e platina.', econ: 'Estaleiros e ligas avançadas.' },
  ],
  cromalitas: [
    { name: 'Sentinela Espelhada Cromálita', axis: 'Tradicionalistas', style: 'militar', color: '#cbd5e1', customs: 'Polimento cerimonial de cascos antes de tratados.', laws: 'Proíbe entrada sem código de identificação.', econ: 'Escudos refletores e prata.', restricted: true },
    { name: 'Enclave Prateado de Refração', axis: 'Reformistas', style: 'pesquisadores', color: '#94a3b8', customs: 'Estudos óticos de lasers e cristais refletores.', laws: 'Multas por danos a satélites refletores.', econ: 'Lasers prismáticos e vidro estelar.' },
  ],
  sylvaris: [
    { name: 'Aliança Verde de Sylvaris', axis: 'Tradicionalistas', style: 'criogenica', color: '#4ade80', customs: 'Oferenda de sementes nativas em visitas diplomáticas.', laws: 'Caça predatória reduz reputação drasticamente.', econ: 'Biomassa, madeira e medicina.' },
    { name: 'Jardins Mercantis do Dossel', axis: 'Mercantil', style: 'mercantil', color: '#22c55e', customs: 'Feiras orbitais de compostos orgânicos e especiarias.', laws: 'Quarentena obrigatória para parasitas.', econ: 'Sementes exóticas e coletores biológicos.' },
  ],
  espinhoes_vex: [
    { name: 'Horda Esporal de Vex', axis: 'Militar', style: 'militar', color: '#84cc16', customs: 'Disputas territoriais marcadas por nuvens de esporos.', laws: 'Hostil a queimadas industriais.', econ: 'Armas ácidas e toxinas.', restricted: true },
    { name: 'Semeadores da Fronteira Viva', axis: 'Reformistas', style: 'pesquisadores', color: '#65a30d', customs: 'Terraformação rápida de planetas estéreis.', laws: 'Incentiva coleta de compostos orgânicos.', econ: 'Enzimas e biomassa viva.' },
  ],
  lotus_silenciosos: [
    { name: 'Mosteiro do Lótus Imóvel', axis: 'Tradicionalistas', style: 'pesquisadores', color: '#10b981', customs: 'Silêncio contemplativo antes de cada negociação.', laws: 'Exige licença diplomática para acesso às sedes.', econ: 'Antídotos e esporos raros.', restricted: true },
    { name: 'Círculo Simbiótico de Raiz', axis: 'Reformistas', style: 'criogenica', color: '#059669', customs: 'Preservação de espécies únicas em biomas úmidos.', laws: 'Paga bônus por amostras de criaturas raras.', econ: 'Escâneres de fauna e compostos.' },
  ],
  litoides_basalto: [
    { name: 'Clã Escavador de Basalto', axis: 'Mercantil', style: 'silicoide', color: '#a8a29e', customs: 'Troca de amostras minerais como aperto de mão.', laws: 'Contratos minerais são irrevogáveis.', econ: 'Brocas pesadas e rochas raras.' },
    { name: 'Câmara Profunda Litóide', axis: 'Tradicionalistas', style: 'silicoide', color: '#78716c', customs: 'Reuniões em cavernas geotérmicas protegidas.', laws: 'Proíbe explosivos em galerias habitadas.', econ: 'Placas de basalto e titânio.' },
  ],
  drakolitos: [
    { name: 'Clã Vulcânico Drakólito', axis: 'Militar', style: 'militar', color: '#dc2626', customs: 'Testes de coragem junto a fluxos de magma.', laws: 'Respeito exclusivo à força de combate.', econ: 'Canhões de trilho e magma.', restricted: true },
    { name: 'Sindicato Tectônico de Magma', axis: 'Mercantil', style: 'silicoide', color: '#b91c1c', customs: 'Leilões de minérios raros de núcleos planetários.', laws: 'Pedágio em campos de meteoros locais.', econ: 'Ouro, platina e diamantes.' },
  ],
  quartzos_thul: [
    { name: 'Arquivo Cristalino de Thul', axis: 'Tradicionalistas', style: 'pesquisadores', color: '#22d3ee', customs: 'Registro histórico gravado em matrizes de quartzo.', laws: 'Acesso restrito a pesquisadores honrados.', econ: 'Cristais energéticos e quartzo.', restricted: true },
    { name: 'Prismáticos Reformistas', axis: 'Reformistas', style: 'pesquisadores', color: '#06b6d4', customs: 'Compartilhamento de mapas de cavernas e anomalias.', laws: 'Proíbe destruição de formações cristalinas.', econ: 'Escudos refratores e escavadores.' },
  ],
  vespideos_mel: [
    { name: 'Colmeia Dourada Vespídea', axis: 'Mercantil', style: 'mercantil', color: '#facc15', customs: 'Danças de rota luminosa indicando mercados vantajosos.', laws: 'Descontos imediatos para cargas completas.', econ: 'Comércio de suprimentos e enzimas.' },
    { name: 'Federação do Néctar Estelar', axis: 'Reformistas', style: 'gasosa', color: '#eab308', customs: 'Cooperação entre colmeias de múltiplos sistemas.', laws: 'Proteção mútua de comboios.', econ: 'Rebocadores de carga e combustíveis.' },
  ],
  krikkari: [
    { name: 'Enxame Corsário Krikkari', axis: 'Militar', style: 'militar', color: '#ea580c', customs: 'Raides rápidos e partilha do saque pelo mérito.', laws: 'Lei da selva em fronteiras disputadas.', econ: 'Mísseis enxame e interceptadores.', restricted: true },
    { name: 'Clãs Nômades de Areia', axis: 'Mercantil', style: 'gasosa', color: '#f59e0b', customs: 'Feiras temporárias em órbitas de cometas.', laws: 'Aceita qualquer mercadoria sem perguntas.', econ: 'Gás natural e peças usadas.' },
  ],
  mantis_sombra: [
    { name: 'Ordem Oculta da Mantis', axis: 'Tradicionalistas', style: 'radioativa', color: '#a855f7', customs: 'Observação sem contato visual direto.', laws: 'Intrusos hostis são interceptados sem aviso prévio.', econ: 'Toxinas, minerais sombrios e camuflagem.', restricted: true },
    { name: 'Caçadores de Eclipse', axis: 'Militar', style: 'militar', color: '#9333ea', customs: 'Contratos silenciosos de eliminação de ameaças.', laws: 'Sigilo absoluto sobre contratantes.', econ: 'Equipamento furtivo e caça.' },
  ],
  vaelorianos: [
    { name: 'Talassocracia de Vaelor', axis: 'Mercantil', style: 'criogenica', color: '#2dd4bf', customs: 'Boas-vindas com música hidroacústica.', laws: 'Portos abertos para naves pacíficas.', econ: 'Água, bombas líquidas e mantimentos.' },
    { name: 'Assembleia Coralina Reformista', axis: 'Reformistas', style: 'pesquisadores', color: '#14b8a6', customs: 'Proteção de oceanos vivos e diálogo cultural.', laws: 'Proíbe despejo tóxico em mundos oceânicos.', econ: 'Biomassa marinha e drones.' },
  ],
  nautilideos_mael: [
    { name: 'Armada Abissal de Mael', axis: 'Militar', style: 'criogenica', color: '#0284c7', customs: 'Batismo de pressão em fossas subglaciais.', laws: 'Exige tributo ou licença em rotas geladas.', econ: 'Torpedos e exoesqueletos de pressão.', restricted: true },
    { name: 'Navegadores da Corrente Fria', axis: 'Mercantil', style: 'criogenica', color: '#0369a1', customs: 'Comboios escoltados por águas e geleiras.', laws: 'Seguro mútuo para mercadores aliados.', econ: 'Hélio-3, gelo e resfriadores.' },
  ],
  abissais_glacio: [
    { name: 'Santuário Subglacial Profundo', axis: 'Tradicionalistas', style: 'criogenica', color: '#7dd3fc', customs: 'Rituais sob abóbadas de gelo milenar.', laws: 'Acesso bloqueado a desconhecidos.', econ: 'Relíquias glaciais e resfriadores.', restricted: true },
    { name: 'Sondadores de Glácio', axis: 'Reformistas', style: 'pesquisadores', color: '#38bdf8', customs: 'Exploração conjunta de cavernas submersas.', laws: 'Recompensa descoberta de espécies abissais.', econ: 'Sondas e escavadores arqueológicos.' },
  ],
};

function generate42Factions(): FactionDef[] {
  const rng = new SeededRNG(202642);
  const result: FactionDef[] = [];

  // Place 42 faction capitals deterministically within radius <= 92 a.l. (domain reach 21.75 a.l. stays within 98 a.l.)
  const coords: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < 42; i++) {
    let best = { x: 0, y: 0, z: 0 };
    for (let attempt = 0; attempt < 120; attempt++) {
      // Spiral + radial distribution for well-spaced sectors inside 90 a.l.
      const angle = (i * 2.399963) + rng.range(-0.35, 0.35);
      const r = 14 + Math.sqrt((i + 0.5) / 42) * 74 + rng.range(-4, 4);
      const clampedR = Math.min(88, Math.max(12, r));
      const x = Math.round(Math.cos(angle) * clampedR * 10) / 10;
      const z = Math.round(Math.sin(angle) * clampedR * 10) / 10;
      const y = Math.round(rng.range(-16, 16) * 10) / 10;
      const minDist = coords.reduce((m, c) => Math.min(m, Math.hypot(c.x - x, c.y - y, c.z - z)), 999);
      if (minDist >= 19 || attempt === 119) {
        best = { x, y, z };
        if (minDist >= 19) break;
      }
    }
    coords.push(best);
  }

  let idx = 0;
  for (const sp of SPECIES) {
    const pair = FACTION_META[sp.id];
    for (let p = 0; p < 2; p++) {
      const m = pair[p];
      const axis: FactionAxis =
        m.axis === 'Mercantil' || m.axis === 'Militar' || m.axis === 'Tradicionalistas' || m.axis === 'Reformistas'
          ? m.axis
          : 'Reformistas';
      const coord = coords[idx];
      const id = `fac_${sp.id}_${p + 1}`;
      result.push({
        id,
        name: m.name,
        speciesId: sp.id,
        lifeFormId: sp.lifeFormId,
        axis,
        techStyle: m.style,
        color: m.color,
        customs: m.customs,
        laws: m.laws,
        economyFocus: m.econ,
        capitalSystemId: `sys_cap_${idx}`,
        capitalCoord: coord,
        requiresLicenseOrRenown: Boolean(m.restricted),
        warsWith: [],
        alliedWith: [],
      });
      idx++;
    }
  }

  // Build diplomatic graph (Section 6):
  // Wars & alliances ONLY exist between factions <= 55 a.l. apart.
  // Intra-species conflict chance reduced (12%). Target ~15 wars and ~19 alliances.
  const pairs: Array<{ a: FactionDef; b: FactionDef; dist: number }> = [];
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i];
      const b = result[j];
      const dist = Math.hypot(
        a.capitalCoord.x - b.capitalCoord.x,
        a.capitalCoord.y - b.capitalCoord.y,
        a.capitalCoord.z - b.capitalCoord.z
      );
      if (dist <= 54.5) {
        pairs.push({ a, b, dist });
      }
    }
  }

  const shuffled = rng.shuffle(pairs);
  let warCount = 0;
  let allyCount = 0;

  for (const { a, b, dist } of shuffled) {
    const sameSpecies = a.speciesId === b.speciesId;
    const sameLifeForm = a.lifeFormId === b.lifeFormId;
    const militaryPair = a.axis === 'Militar' || b.axis === 'Militar';
    const spA = SPECIES_BY_ID[a.speciesId];
    const spB = SPECIES_BY_ID[b.speciesId];
    const expansionistPair = spA.temperament === 'expansionista' || spB.temperament === 'expansionista';

    if (warCount < 15 && dist <= 54) {
      const warScore = (sameSpecies ? 0.12 : 0.45) * (militaryPair ? 1.5 : 1) * (expansionistPair ? 1.3 : 1);
      if (!sameLifeForm && rng.chance(warScore * 0.42)) {
        a.warsWith.push(b.id);
        b.warsWith.push(a.id);
        warCount++;
        continue;
      }
      if (sameSpecies && rng.chance(0.12)) {
        a.warsWith.push(b.id);
        b.warsWith.push(a.id);
        warCount++;
        continue;
      }
    }

    if (allyCount < 19 && dist <= 46 && !a.warsWith.includes(b.id)) {
      const allyBias = (sameLifeForm ? 0.48 : 0.24) * (!militaryPair ? 1.25 : 0.7);
      if (rng.chance(allyBias)) {
        a.alliedWith.push(b.id);
        b.alliedWith.push(a.id);
        allyCount++;
      }
    }
  }

  // Ensure exact ~15 wars and ~19 alliances if RNG came up slightly short
  for (const { a, b, dist } of shuffled) {
    if (warCount >= 15) break;
    if (a.warsWith.includes(b.id) || a.alliedWith.includes(b.id)) continue;
    if (a.speciesId !== b.speciesId && dist <= 54) {
      a.warsWith.push(b.id);
      b.warsWith.push(a.id);
      warCount++;
    }
  }
  for (const { a, b, dist } of shuffled) {
    if (allyCount >= 19) break;
    if (a.warsWith.includes(b.id) || a.alliedWith.includes(b.id)) continue;
    if (dist <= 46) {
      a.alliedWith.push(b.id);
      b.alliedWith.push(a.id);
      allyCount++;
    }
  }

  return result;
}

export const FACTIONS: FactionDef[] = generate42Factions();
export const FACTIONS_BY_ID: Record<string, FactionDef> = Object.fromEntries(
  FACTIONS.map((f) => [f.id, f])
);

export function isFactionConservative(factionOrId: FactionDef | string | null | undefined): boolean {
  if (!factionOrId) return false;
  const fac = typeof factionOrId === 'string' ? FACTIONS_BY_ID[factionOrId] : factionOrId;
  return Boolean(fac && fac.axis === 'Tradicionalistas');
}

export function getFactionDistanceLy(facAId: string, facBId: string): number {
  const a = FACTIONS_BY_ID[facAId];
  const b = FACTIONS_BY_ID[facBId];
  if (!a || !b) return 999;
  return Math.hypot(
    a.capitalCoord.x - b.capitalCoord.x,
    a.capitalCoord.y - b.capitalCoord.y,
    a.capitalCoord.z - b.capitalCoord.z
  );
}
