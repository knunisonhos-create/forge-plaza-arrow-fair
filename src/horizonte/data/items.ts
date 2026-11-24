import type {
  BlueprintDef,
  ConsumableDef,
  ExtractorDef,
  HullDef,
  JumpDriveDef,
  ResourceDef,
  ShieldDef,
  SuitGearDef,
  UtilityModuleDef,
  WeaponDef,
} from '../types/game';
import { FACTIONS, SPECIES_BY_ID } from './lifeforms';

export const RESOURCES: ResourceDef[] = [
  // Broca Mineral
  { id: 'ferro', name: 'Ferro', rarity: 'comum', extractionClass: 'broca_mineral', basePrice: 12, description: 'Liga metálica estrutural essencial para cascos e colônias.' },
  { id: 'cobre', name: 'Cobre', rarity: 'comum', extractionClass: 'broca_mineral', basePrice: 15, description: 'Condutor elétrico amplamente usado em circuitos de bordo.' },
  { id: 'silicio', name: 'Silício', rarity: 'comum', extractionClass: 'broca_mineral', basePrice: 14, description: 'Base para semicondutores e sensores orbitais.' },
  { id: 'pedra', name: 'Pedra', rarity: 'comum', extractionClass: 'broca_mineral', basePrice: 8, description: 'Rocha mineral bruta usada em fundações planetárias.' },
  { id: 'enxofre', name: 'Enxofre', rarity: 'incomum', extractionClass: 'broca_mineral', basePrice: 24, description: 'Composto vulcânico utilizado em propelentes e síntese.' },
  { id: 'quartzo', name: 'Quartzo', rarity: 'incomum', extractionClass: 'broca_mineral', basePrice: 32, description: 'Cristal piezoelétrico para osciladores de precisão.' },
  { id: 'niquel', name: 'Níquel', rarity: 'incomum', extractionClass: 'broca_mineral', basePrice: 28, description: 'Metal resistente à corrosão atmosférica.' },
  { id: 'ouro', name: 'Ouro', rarity: 'raro', extractionClass: 'broca_mineral', basePrice: 68, description: 'Metal nobre de alta condutividade térmica e elétrica.' },
  { id: 'platina', name: 'Platina', rarity: 'raro', extractionClass: 'broca_mineral', basePrice: 92, description: 'Catalisador crítico para reatores de salto.' },
  { id: 'titanio', name: 'Titânio', rarity: 'raro', extractionClass: 'broca_mineral', basePrice: 75, description: 'Metal leve de extrema dureza para blindagem.' },
  { id: 'prata', name: 'Prata', rarity: 'incomum', extractionClass: 'broca_mineral', basePrice: 44, description: 'Elemento reflexivo empregado em espelhos laser.' },
  { id: 'vidro', name: 'Vidro Estelar', rarity: 'incomum', extractionClass: 'broca_mineral', basePrice: 36, description: 'Sílica vitrificada resistente a radiação.' },
  { id: 'diamante', name: 'Diamante', rarity: 'épico', extractionClass: 'broca_mineral', basePrice: 185, description: 'Carbono supercomprimido para lentes e brocas avançadas.' },
  { id: 'carbono_cristalizado', name: 'Carbono Cristalizado', rarity: 'épico', extractionClass: 'broca_mineral', basePrice: 165, description: 'Treliça atômica ultrarresistente.' },
  { id: 'metais_densos', name: 'Metais Densos', rarity: 'épico', extractionClass: 'broca_mineral', basePrice: 195, description: 'Ligas superpesadas forjadas por gravidade extrema.' },
  { id: 'minerais_sombrios', name: 'Minerais Sombrios', rarity: 'raro', extractionClass: 'broca_mineral', basePrice: 110, description: 'Minério absorvedor de fótons encontrado em mundos escuros.' },
  { id: 'minerais_leves', name: 'Minerais Leves', rarity: 'raro', extractionClass: 'broca_mineral', basePrice: 88, description: 'Composto poroso de baixa densidade.' },

  // Coletor Atmosférico
  { id: 'hidrogenio', name: 'Hidrogênio', rarity: 'comum', extractionClass: 'coletor_atmosferico', basePrice: 11, description: 'Combustível primordial de fusão estelar.' },
  { id: 'gas_natural', name: 'Gás Natural', rarity: 'comum', extractionClass: 'coletor_atmosferico', basePrice: 16, description: 'Hidrocarboneto gasoso útil em turbinas.' },
  { id: 'metano', name: 'Metano', rarity: 'incomum', extractionClass: 'coletor_atmosferico', basePrice: 26, description: 'Gás criogênico combustível.' },
  { id: 'helio_3', name: 'Hélio-3', rarity: 'raro', extractionClass: 'coletor_atmosferico', basePrice: 84, description: 'Isótopo limpo de alto rendimento para motores de dobra.' },
  { id: 'gases_exoticos', name: 'Gases Exóticos', rarity: 'raro', extractionClass: 'coletor_atmosferico', basePrice: 115, description: 'Mistura atmosférica rara usada em escudos e propulsores.' },
  { id: 'eter', name: 'Éter', rarity: 'épico', extractionClass: 'coletor_atmosferico', basePrice: 210, description: 'Névoa energética ionizada de mundos espectrais.' },

  // Bomba Líquida
  { id: 'agua', name: 'Água', rarity: 'comum', extractionClass: 'bomba_liquida', basePrice: 10, description: 'Recurso vital para colônias e mantimentos.' },
  { id: 'gelo', name: 'Gelo', rarity: 'comum', extractionClass: 'bomba_liquida', basePrice: 12, description: 'Água congelada pura extraída de mundos glaciais.' },
  { id: 'sais', name: 'Sais Minerais', rarity: 'comum', extractionClass: 'bomba_liquida', basePrice: 18, description: 'Eletrólitos essenciais para química industrial.' },
  { id: 'hidrocarbonetos', name: 'Hidrocarbonetos', rarity: 'incomum', extractionClass: 'bomba_liquida', basePrice: 34, description: 'Fluidos orgânicos refináveis em combustível.' },
  { id: 'agua_subterranea', name: 'Água Subterrânea', rarity: 'incomum', extractionClass: 'bomba_liquida', basePrice: 30, description: 'Reservas profundas livres de radiação superficial.' },
  { id: 'magma', name: 'Magma Estabilizado', rarity: 'raro', extractionClass: 'bomba_liquida', basePrice: 98, description: 'Fluido geotérmico de alta energia armazenada.' },

  // Coletor Biológico
  { id: 'biomassa', name: 'Biomassa', rarity: 'comum', extractionClass: 'coletor_biologico', basePrice: 14, description: 'Matéria orgânica básica para nutrição e síntese.' },
  { id: 'madeira', name: 'Madeira Densa', rarity: 'incomum', extractionClass: 'coletor_biologico', basePrice: 25, description: 'Fibra vegetal resistente de florestas alienígenas.' },
  { id: 'turfa', name: 'Turfa', rarity: 'comum', extractionClass: 'coletor_biologico', basePrice: 17, description: 'Material orgânico de pântanos ricos em carbono.' },
  { id: 'fungos', name: 'Fungos', rarity: 'incomum', extractionClass: 'coletor_biologico', basePrice: 38, description: 'Culturas fúngicas farmacológicas.' },
  { id: 'sementes', name: 'Sementes Exóticas', rarity: 'incomum', extractionClass: 'coletor_biologico', basePrice: 46, description: 'Espécimes vegetais adaptáveis para terraformação.' },
  { id: 'compostos_organicos', name: 'Compostos Orgânicos', rarity: 'incomum', extractionClass: 'coletor_biologico', basePrice: 42, description: 'Precursores bioquímicos para medicina e colônias.' },
  { id: 'biomassa_marinha', name: 'Biomassa Marinha', rarity: 'incomum', extractionClass: 'coletor_biologico', basePrice: 40, description: 'Algas e plâncton abissal de alto valor proteico.' },
  { id: 'biomassa_viva', name: 'Biomassa Viva', rarity: 'épico', extractionClass: 'coletor_biologico', basePrice: 170, description: 'Tecido celular autorregenerativo.' },
  { id: 'enzimas', name: 'Enzimas', rarity: 'raro', extractionClass: 'coletor_biologico', basePrice: 96, description: 'Catalisadores biológicos de alta eficiência.' },
  { id: 'couro', name: 'Couro de Megafauna', rarity: 'raro', extractionClass: 'coletor_biologico', basePrice: 90, description: 'Tecido resistente de grandes criaturas.' },
  { id: 'ossos', name: 'Ossos Fósseis', rarity: 'incomum', extractionClass: 'coletor_biologico', basePrice: 48, description: 'Estruturas cálcicas de megafauna antiga.' },
  { id: 'toxinas', name: 'Toxinas', rarity: 'raro', extractionClass: 'coletor_biologico', basePrice: 112, description: 'Venenos naturais usados em fármacos e ogivas.' },
  { id: 'esporos', name: 'Esporos', rarity: 'raro', extractionClass: 'coletor_biologico', basePrice: 86, description: 'Esporos ativos de mundos fúngicos.' },
  { id: 'compostos_luminosos', name: 'Compostos Luminosos', rarity: 'raro', extractionClass: 'coletor_biologico', basePrice: 108, description: 'Proteínas bioluminescentes de alta demanda.' },

  // Extrator de Energia
  { id: 'uranio', name: 'Urânio', rarity: 'raro', extractionClass: 'extrator_energia', basePrice: 104, description: 'Combustível físsil pesado.' },
  { id: 'plutonio', name: 'Plutônio', rarity: 'épico', extractionClass: 'extrator_energia', basePrice: 178, description: 'Material radioativo refinado de alta densidade energética.' },
  { id: 'isotopos', name: 'Isótopos', rarity: 'raro', extractionClass: 'extrator_energia', basePrice: 116, description: 'Variantes instáveis úteis em reatores táticos.' },
  { id: 'cristais_energeticos', name: 'Cristais Energéticos', rarity: 'raro', extractionClass: 'extrator_energia', basePrice: 125, description: 'Ressonadores naturais de plasma e laser.' },
  { id: 'plasma', name: 'Plasma Condensado', rarity: 'épico', extractionClass: 'extrator_energia', basePrice: 205, description: 'Gás ionizado contido em matriz magnética.' },
  { id: 'energia', name: 'Energia Pura', rarity: 'épico', extractionClass: 'extrator_energia', basePrice: 190, description: 'Células de carga capturadas de tempestades elétricas.' },
  { id: 'antimateria', name: 'Antimatéria', rarity: 'lendário', extractionClass: 'extrator_energia', basePrice: 390, description: 'Pósitrons confinados para propulsão de ponta.' },
  { id: 'materia_fantasma', name: 'Matéria-Fantasma', rarity: 'épico', extractionClass: 'extrator_energia', basePrice: 245, description: 'Substância etérea que atravessa blindagens comuns.' },
  { id: 'materia_exotica', name: 'Matéria Exótica', rarity: 'lendário', extractionClass: 'extrator_energia', basePrice: 440, description: 'Massa negativa essencial para saltos dimensionais.' },
  { id: 'materia_escura', name: 'Matéria Escura', rarity: 'lendário', extractionClass: 'extrator_energia', basePrice: 480, description: 'Partículas gravitacionais raras de buracos negros.' },
  { id: 'cristal_fenda', name: 'Cristal de Fenda', rarity: 'lendário', extractionClass: 'extrator_energia', basePrice: 460, description: 'Fragmento refrator de espaço-tempo.' },
  { id: 'cristais_celestiais', name: 'Cristais Celestiais', rarity: 'lendário', extractionClass: 'extrator_energia', basePrice: 430, description: 'Minerais dourados de planetas celestiais.' },
  { id: 'nucleo_estelar', name: 'Núcleo Estelar', rarity: 'lendário', extractionClass: 'extrator_energia', basePrice: 540, description: 'Núcleo denso de fusão concentrada.' },
  { id: 'cristais_refletores', name: 'Cristais Refletores', rarity: 'épico', extractionClass: 'extrator_energia', basePrice: 215, description: 'Cristais óticos que refletem feixes de energia.' },
  { id: 'cristais_flutuacao', name: 'Cristais de Flutuação', rarity: 'épico', extractionClass: 'extrator_energia', basePrice: 225, description: 'Cristais antigravitacionais naturais.' },

  // Escavador Arqueológico
  { id: 'aerogel_vivo', name: 'Aerogel Vivo', rarity: 'raro', extractionClass: 'escavador_arqueologico', basePrice: 138, description: 'Polímero bio-sintético de civilizações extintas.' },
  { id: 'cronocristais', name: 'Cronocristais', rarity: 'lendário', extractionClass: 'escavador_arqueologico', basePrice: 495, description: 'Relíquias que oscilam fora da linha temporal normal.' },
  { id: 'reliquias', name: 'Relíquias Antigas', rarity: 'lendário', extractionClass: 'escavador_arqueologico', basePrice: 450, description: 'Objetos preservados de impérios pré-galácticos.' },
  { id: 'tecnologia_antiga', name: 'Tecnologia Antiga', rarity: 'lendário', extractionClass: 'escavador_arqueologico', basePrice: 510, description: 'Módulos intactos de arquitetura desconhecida.' },
  { id: 'ligas_avancadas', name: 'Ligas Avançadas', rarity: 'épico', extractionClass: 'escavador_arqueologico', basePrice: 260, description: 'Materiais compostos impossíveis de forjar em escala comum.' },
  { id: 'artefatos', name: 'Artefatos', rarity: 'lendário', extractionClass: 'escavador_arqueologico', basePrice: 520, description: 'Dispositivos misteriosos de alto valor científico.' },
];

const RESOURCE_RARITY_MULT: Record<string, number> = {
  comum: 0.5,
  incomum: 1,
  raro: 1.5,
  épico: 2,
  lendário: 2,
};
for (const resource of RESOURCES) {
  const mult = RESOURCE_RARITY_MULT[resource.rarity] ?? 1;
  resource.basePrice = Math.max(1, Math.round(resource.basePrice * mult));
}

export const RESOURCES_BY_ID: Record<string, ResourceDef> = Object.fromEntries(
  RESOURCES.map((r) => [r.id, r])
);

// 20 Weapons (including the 5 named in Section 16.1 + 15 balanced across levels 1..5)
export const WEAPONS: WeaponDef[] = [
  // Level 1
  { id: 'laser_civil_mk1', name: 'Canhão Laser Civil Mk.I', damageType: 'laser', attackLevel: 1, dps: 9, range: 18, fireRate: 2.0, color: '#38bdf8', price: 320, rarity: 'comum', factionStyle: 'mercantil', description: 'Feixe laser contínuo leve para autodefesa contra piratas básicos. Eficaz contra cascos sem refração.' },
  { id: 'metralhadora_balistica', name: 'Metralhadora Balística Rotativa', damageType: 'cinetica', attackLevel: 1, dps: 11, range: 16, fireRate: 5.5, color: '#fbbf24', price: 380, rarity: 'comum', factionStyle: 'militar', description: 'Dispara projéteis cinéticos de altíssima cadência a curto alcance para sobrecarregar defesas leves.' },
  { id: 'arco_ionico_leve', name: 'Lança Iônica de Patrulha', damageType: 'laser', attackLevel: 1, dps: 12, range: 19, fireRate: 1.8, color: '#60a5fa', price: 450, rarity: 'comum', factionStyle: 'pesquisadores', description: 'Emissor laser focado com alcance estendido para manter distância de batedores hostis.' },
  { id: 'lanca_esporos_corrosiva', name: 'Canhão Esporal Ácido', damageType: 'plasma', attackLevel: 1, dps: 13, range: 17, fireRate: 1.6, color: '#4ade80', price: 490, rarity: 'comum', factionStyle: 'criogenica', description: 'Dispara cápsulas de plasma bio-ácido que corroem rapidamente blindagens e escudos comuns.' },

  // Level 2
  { id: 'projetor_plasma_vorticial', name: 'Projetor de Plasma Vorticial', damageType: 'plasma', attackLevel: 2, dps: 19, range: 19, fireRate: 1.5, color: '#c084fc', price: 1150, rarity: 'incomum', factionStyle: 'gasosa', description: 'Projéteis de plasma superaquecido capazes de romper escudos defletores médios.' },
  { id: 'bateria_misseis_termicos', name: 'Bateria de Mísseis Térmicos', damageType: 'missil', attackLevel: 2, dps: 22, range: 23, fireRate: 0.9, color: '#fb923c', price: 1320, rarity: 'incomum', factionStyle: 'militar', description: 'Lança mísseis guiados de longo alcance com alto impacto por disparo contra fragatas.' },
  { id: 'canhao_gauss_silicoide', name: 'Canhão Gauss de Basalto', damageType: 'cinetica', attackLevel: 2, dps: 21, range: 21, fireRate: 2.2, color: '#f59e0b', price: 1240, rarity: 'incomum', factionStyle: 'silicoide', description: 'Acelerador eletromagnético que dispara dardos metálicos densos com precisão orbital.' },
  { id: 'feixe_criogenico_pressao', name: 'Feixe Criogênico Subzero', damageType: 'laser', attackLevel: 2, dps: 20, range: 20, fireRate: 2.4, color: '#67e8f9', price: 1280, rarity: 'incomum', factionStyle: 'criogenica', description: 'Raio térmico invertido que fragiliza placas metálicas e perfura escudos convencionais.' },
  { id: 'morteiro_bombardeio_orbital', name: 'Morteiro de Bombardeio Orbital', damageType: 'missil', attackLevel: 2, dps: 24, range: 22, fireRate: 0.75, color: '#f97316', price: 1580, rarity: 'incomum', factionStyle: 'militar', canBombard: true, description: 'Arma de Bombardeio Orbital: dispara ogivas atmosféricas capazes de reduzir o nível de infraestrutura planetária.' },

  // Level 3
  { id: 'laser_pulso_prismático', name: 'Laser de Pulso Prismático', damageType: 'laser', attackLevel: 3, dps: 33, range: 22, fireRate: 2.8, color: '#22d3ee', price: 3200, rarity: 'raro', factionStyle: 'pesquisadores', description: 'Laser multifrequência de alta cadência que fura barreiras anti-energia medianas.' },
  { id: 'canhao_trilho_titanio', name: 'Canhão de Trilho Titânico', damageType: 'cinetica', attackLevel: 3, dps: 36, range: 24, fireRate: 1.4, color: '#fde047', price: 3500, rarity: 'raro', factionStyle: 'silicoide', description: 'Artilharia pesada cinética capaz de atravessar blindagem espessa a longa distância.' },
  { id: 'torpedo_fusao_instavel', name: 'Lançador de Torpedos Solares', damageType: 'missil', attackLevel: 3, dps: 38, range: 25, fireRate: 0.85, color: '#f97316', price: 3750, rarity: 'raro', factionStyle: 'militar', description: 'Ogivas de fusão de altíssimo dano explosivo com maior alcance tático de nível 3.' },
  { id: 'descarga_isotopica', name: 'Canhão de Descarga Isotópica', damageType: 'plasma', attackLevel: 3, dps: 35, range: 20, fireRate: 1.7, color: '#84cc16', price: 3400, rarity: 'raro', factionStyle: 'radioativa', description: 'Lança cargas de plasma radioativo ideais contra naves militares blindadas.' },

  // Level 4
  { id: 'lanca_radiacao_cobalto', name: 'Lança de Radiação Cobalto', damageType: 'laser', attackLevel: 4, dps: 56, range: 24, fireRate: 2.5, color: '#a3e635', price: 7800, rarity: 'épico', factionStyle: 'radioativa', description: 'Feixe gama militar de precisão cirúrgica para combates intensos em setores em guerra.' },
  { id: 'salva_misseis_enxame', name: 'Salva de Mísseis Enxame', damageType: 'missil', attackLevel: 4, dps: 62, range: 27, fireRate: 1.2, color: '#fb7185', price: 8400, rarity: 'épico', factionStyle: 'militar', description: 'Dispara múltiplas ogivas simultâneas de alcance extremo que saturam defesas inimigas.' },
  { id: 'disruptor_eterico', name: 'Disruptor Etérico de Núcleo', damageType: 'plasma', attackLevel: 4, dps: 59, range: 22, fireRate: 1.9, color: '#a855f7', price: 8100, rarity: 'épico', factionStyle: 'gasosa', description: 'Raios de plasma instável que desestabilizam escudos inimigos rapidamente.' },
  { id: 'acelerador_ferronita', name: 'Acelerador Cinético de Forja', damageType: 'cinetica', attackLevel: 4, dps: 60, range: 23, fireRate: 3.2, color: '#fbbf24', price: 8250, rarity: 'épico', factionStyle: 'silicoide', description: 'Canhão rotativo de trilho capaz de sustentar chuva contínua de massa hiperacelerada.' },
  { id: 'canhao_cerco_planetario', name: 'Canhão de Cerco Planetário', damageType: 'cinetica', attackLevel: 4, dps: 64, range: 26, fireRate: 1.1, color: '#ef4444', price: 9400, rarity: 'épico', factionStyle: 'militar', canBombard: true, description: 'Arma de Bombardeio Orbital pesada: projéteis cinéticos de impacto orbital projetados para demolir complexos planetários.' },

  // Level 5 (Legendary)
  { id: 'canhao_singularidade', name: 'Canhão de Singularidade Fenda', damageType: 'plasma', attackLevel: 5, dps: 120, range: 25, fireRate: 1.6, color: '#e879f9', price: 19500, rarity: 'lendário', factionStyle: 'pesquisadores', description: 'Arma experimental que dispara micro-singularidades de plasma devastadoras contra frotas inteiras.' },
  { id: 'bateria_artilharia_celestial', name: 'Bateria Celestial Dourada', damageType: 'missil', attackLevel: 5, dps: 128, range: 29, fireRate: 1.1, color: '#facc15', price: 21000, rarity: 'lendário', factionStyle: 'mercantil', canBombard: true, description: 'Torpedos de antimatéria de alcance máximo (29) e aptidão para Bombardeio Orbital estratégico.' },
  { id: 'canhao_antimateria_imperial', name: 'Canhão de Antimatéria Imperial', damageType: 'cinetica', attackLevel: 5, dps: 132, range: 26, fireRate: 2.0, color: '#f43f5e', price: 22000, rarity: 'lendário', factionStyle: 'militar', canBombard: true, description: 'Artilharia imperial de elite com impacto cinético colossal contra cruzadores e capacidade de Bombardeio Orbital.' },
  { id: 'emissor_gama_pulsar', name: 'Emissor Gama de Pulsar', damageType: 'laser', attackLevel: 5, dps: 155, range: 28, fireRate: 3.5, color: '#38bdf8', price: 26000, rarity: 'lendário', factionStyle: 'radioativa', description: 'A arma mais poderosa da galáxia (155 DPS): dispara pulsos gama ultrarrápidos que dizimam qualquer alvo.' },

  // Tecnologias Bélicas Exclusivas de Raça
  { id: 'laser_helio_solariano', name: 'Emissor Solar de Solis', damageType: 'laser', attackLevel: 2, dps: 16, range: 22, fireRate: 2.6, color: '#38bdf8', price: 1100, rarity: 'incomum', speciesExclusiveId: 'solarianos', description: 'Tecnologia Solariana exclusiva: feixe fotônico calibrado para escoltas mercantis de longo alcance.' },
  { id: 'canhao_cerco_valdris', name: 'Canhão de Brecha Valdris', damageType: 'cinetica', attackLevel: 2, dps: 23, range: 20, fireRate: 2.1, color: '#ef4444', price: 1450, rarity: 'raro', speciesExclusiveId: 'valdris', canBombard: true, description: 'Tecnologia Valdris exclusiva: artilharia pesada de assalto capaz de bombardeio orbital.' },
  { id: 'lanca_penumbra_nyx', name: 'Lança Sombria de Nyx', damageType: 'plasma', attackLevel: 2, dps: 21, range: 23, fireRate: 1.8, color: '#818cf8', price: 1380, rarity: 'raro', speciesExclusiveId: 'nyxianos', description: 'Tecnologia Nyxiana exclusiva: disparos de plasma frio de baixa assinatura térmica.' },
  { id: 'arco_pulsar_radiante', name: 'Arco Gama de Pulsar', damageType: 'laser', attackLevel: 2, dps: 24, range: 22, fireRate: 2.5, color: '#c084fc', price: 1520, rarity: 'raro', speciesExclusiveId: 'pulsari', description: 'Tecnologia Pulsari exclusiva: feixe concentrado nascido de coroas estelares instáveis.' },
  { id: 'bateria_magma_drakolito', name: 'Morteiro Magmático Drakólito', damageType: 'missil', attackLevel: 2, dps: 25, range: 22, fireRate: 1.0, color: '#dc2626', price: 1650, rarity: 'raro', speciesExclusiveId: 'drakolitos', canBombard: true, description: 'Tecnologia Drakólita exclusiva: ogivas de magma estabilizado para combate e bombardeio orbital.' },
  { id: 'lanca_espora_vex', name: 'Lança Esporal de Vex', damageType: 'plasma', attackLevel: 2, dps: 22, range: 20, fireRate: 2.0, color: '#84cc16', price: 1390, rarity: 'raro', speciesExclusiveId: 'espinhoes_vex', description: 'Tecnologia de Vex exclusiva: projéteis bio-ácidos que dissolvem escudos rapidamente.' },
  { id: 'enxame_agulha_krikkari', name: 'Bateria Enxame Krikkari', damageType: 'missil', attackLevel: 2, dps: 24, range: 24, fireRate: 1.4, color: '#ea580c', price: 1490, rarity: 'raro', speciesExclusiveId: 'krikkari', description: 'Tecnologia Krikkari exclusiva: micro-mísseis guiados de alta cadência para ataques rápidos.' },
  { id: 'lanca_toxina_mantis', name: 'Dardo Sombrio Mantis', damageType: 'plasma', attackLevel: 2, dps: 23, range: 23, fireRate: 2.2, color: '#a855f7', price: 1460, rarity: 'raro', speciesExclusiveId: 'mantis_sombra', description: 'Tecnologia Mantis exclusiva: feixe corrosivo cirúrgico desenvolvido para emboscadas.' },
  { id: 'torpedo_abissal_mael', name: 'Torpedo Abissal de Mael', damageType: 'missil', attackLevel: 2, dps: 24, range: 24, fireRate: 1.1, color: '#0284c7', price: 1510, rarity: 'raro', speciesExclusiveId: 'nautilideos_mael', canBombard: true, description: 'Tecnologia de Mael exclusiva: torpedos criogênicos de alta pressão aptos a bombardeio orbital.' },
  { id: 'prisma_fotonico_thul', name: 'Lente Prismática de Thul', damageType: 'laser', attackLevel: 2, dps: 22, range: 25, fireRate: 2.7, color: '#22d3ee', price: 1440, rarity: 'raro', speciesExclusiveId: 'quartzos_thul', description: 'Tecnologia de Thul exclusiva: laser refratado em quartzo puro com alcance superior.' },
];

export const WEAPONS_BY_ID: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

// 10 Shields (including the 6 named in Section 16.1 + 4 more)
export const SHIELDS: ShieldDef[] = [
  {
    id: 'escudo_defletor',
    name: 'Gerador de Escudo Defletor',
    capacity: 40,
    rechargePerSec: 3.5,
    mitigation: { laser: 0.25, cinetica: 0.2, plasma: 0.15, missil: 0.15 },
    price: 420,
    rarity: 'comum',
    factionStyle: 'mercantil',
    description: 'Adiciona +40 de escudo regenerativo com mitigação equilibrada de 15% a 25% contra todos os tipos de disparo.',
  },
  {
    id: 'escudo_refrator_prisma',
    name: 'Escudo Refrator Prisma',
    capacity: 65,
    rechargePerSec: 5.0,
    mitigation: { laser: 0.65, cinetica: 0.15, plasma: 0.25, missil: 0.2 },
    reflectDamageRatio: 0.12,
    price: 1350,
    rarity: 'incomum',
    factionStyle: 'pesquisadores',
    description: 'Forte defesa anti-laser (65% mitigação) que reflete 12% do dano recebido de volta ao atacante.',
  },
  {
    id: 'barreira_gravitacional_cinetica',
    name: 'Barreira Gravitacional Cinética',
    capacity: 75,
    rechargePerSec: 5.5,
    mitigation: { laser: 0.2, cinetica: 0.68, plasma: 0.2, missil: 0.45 },
    price: 1480,
    rarity: 'incomum',
    factionStyle: 'silicoide',
    description: 'Desvia projéteis balísticos (68%) e mísseis (45%) criando um poço gravitacional ao redor do casco.',
  },
  {
    id: 'campo_magnetico_anti_plasma',
    name: 'Campo Magnético Anti-Plasma',
    capacity: 85,
    rechargePerSec: 6.0,
    mitigation: { laser: 0.35, cinetica: 0.25, plasma: 0.72, missil: 0.25 },
    price: 2600,
    rarity: 'raro',
    factionStyle: 'gasosa',
    description: 'Dissipa descargas de plasma em até 72% e protege o casco com +85 de capacidade de escudo.',
  },
  {
    id: 'placas_basalto_reforcado',
    name: 'Placas de Basalto Reforçado',
    capacity: 115,
    rechargePerSec: 4.5,
    mitigation: { laser: 0.3, cinetica: 0.58, plasma: 0.35, missil: 0.62 },
    price: 3400,
    rarity: 'raro',
    factionStyle: 'silicoide',
    description: 'Escudo híbrido pesado (+115 cap.) especializado em absorver explosões de mísseis (62%) e impactos cinéticos (58%).',
  },
  {
    id: 'manto_criogenico_dissipador',
    name: 'Manto Criogênico Dissipador',
    capacity: 105,
    rechargePerSec: 7.5,
    mitigation: { laser: 0.52, cinetica: 0.3, plasma: 0.55, missil: 0.5 },
    price: 4100,
    rarity: 'raro',
    factionStyle: 'criogenica',
    description: 'Alta recarga (7.5/s) e proteção sólida (50%–55%) contra lasers, plasma e mísseis térmicos.',
  },
  {
    id: 'bastião_espectral_espelhado',
    name: 'Bastião Espelhado Refletor',
    capacity: 140,
    rechargePerSec: 8.5,
    mitigation: { laser: 0.78, cinetica: 0.38, plasma: 0.45, missil: 0.35 },
    reflectDamageRatio: 0.22,
    price: 7400,
    rarity: 'épico',
    factionStyle: 'militar',
    description: 'Escudo militar refletor (+140 cap.) com 78% de proteção anti-laser e 22% de devolução de dano ao inimigo.',
  },
  {
    id: 'casulo_bio_adaptativo',
    name: 'Casulo Bio-Adaptativo',
    capacity: 160,
    rechargePerSec: 11.0,
    mitigation: { laser: 0.48, cinetica: 0.48, plasma: 0.6, missil: 0.52 },
    price: 8900,
    rarity: 'épico',
    factionStyle: 'criogenica',
    description: 'Membrana viva de altíssima regeneração (11/s) que adapta resistência contra todas as armas.',
  },
  {
    id: 'matriz_rad_isotopica',
    name: 'Matriz Isotópica Blindada',
    capacity: 195,
    rechargePerSec: 12.0,
    mitigation: { laser: 0.62, cinetica: 0.6, plasma: 0.68, missil: 0.58 },
    reflectDamageRatio: 0.18,
    price: 13200,
    rarity: 'épico',
    factionStyle: 'radioativa',
    description: 'Blindagem energética robusta (+195 cap.) com 58%–68% de mitigação geral e 18% de reflexão.',
  },
  {
    id: 'egide_quantica_soberana',
    name: 'Égide Quântica Soberana',
    capacity: 320,
    rechargePerSec: 22.0,
    mitigation: { laser: 0.85, cinetica: 0.85, plasma: 0.85, missil: 0.85 },
    reflectDamageRatio: 0.25,
    price: 24500,
    rarity: 'lendário',
    factionStyle: 'militar',
    description: 'Escudo supremo (+320 cap., 22/s recarga): atinge o teto máximo de 85% de mitigação universal e reflete 25% do dano.',
  },
  // Escudos Exclusivos de Raça
  {
    id: 'veu_eter_luminar',
    name: 'Véu Harmônico Luminar',
    capacity: 75,
    rechargePerSec: 7.2,
    mitigation: { laser: 0.55, cinetica: 0.28, plasma: 0.65, missil: 0.35 },
    price: 1420,
    rarity: 'raro',
    speciesExclusiveId: 'luminares_eter',
    description: 'Tecnologia Luminar exclusiva: campo de ressonância fotônica que dissipa plasma e recarrega rapidamente.',
  },
  {
    id: 'barreira_umbral_fotonica',
    name: 'Manto Refrator Umbral',
    capacity: 70,
    rechargePerSec: 6.5,
    mitigation: { laser: 0.62, cinetica: 0.32, plasma: 0.52, missil: 0.42 },
    reflectDamageRatio: 0.14,
    price: 1450,
    rarity: 'raro',
    speciesExclusiveId: 'umbrais_fotonicos',
    description: 'Tecnologia Umbral exclusiva: escudo espectral que absorve luz e devolve 14% do impacto.',
  },
  {
    id: 'espelho_cromalita',
    name: 'Égide Espelhada Cromálita',
    capacity: 85,
    rechargePerSec: 6.0,
    mitigation: { laser: 0.76, cinetica: 0.44, plasma: 0.4, missil: 0.35 },
    reflectDamageRatio: 0.22,
    price: 1620,
    rarity: 'raro',
    speciesExclusiveId: 'cromalitas',
    description: 'Tecnologia Cromálita exclusiva: placas espelhadas quânticas que refletem 22% do dano recebido.',
  },
  {
    id: 'casulo_vivo_sylvaris',
    name: 'Casulo Simbiótico Sylvaris',
    capacity: 80,
    rechargePerSec: 8.8,
    mitigation: { laser: 0.42, cinetica: 0.44, plasma: 0.52, missil: 0.46 },
    price: 1540,
    rarity: 'raro',
    speciesExclusiveId: 'sylvaris',
    description: 'Tecnologia Sylvaris exclusiva: teia celular regenerativa com recarga contínua acelerada (8.8/s).',
  },
  {
    id: 'couraca_forja_titanio',
    name: 'Escudo de Forja Titânio',
    capacity: 95,
    rechargePerSec: 5.5,
    mitigation: { laser: 0.38, cinetica: 0.68, plasma: 0.4, missil: 0.62 },
    price: 1680,
    rarity: 'raro',
    speciesExclusiveId: 'titanios_forja',
    description: 'Tecnologia Titânios de Forja exclusiva: barreira magnética pesada para aguentar fogo cerrado.',
  },
  {
    id: 'barreira_glacial_abissal',
    name: 'Campo Criogênico de Glácio',
    capacity: 82,
    rechargePerSec: 6.8,
    mitigation: { laser: 0.5, cinetica: 0.42, plasma: 0.58, missil: 0.56 },
    price: 1520,
    rarity: 'raro',
    speciesExclusiveId: 'abissais_glacio',
    description: 'Tecnologia de Glácio exclusiva: escudo térmico invertido resistente a mísseis e plasma.',
  },
];

export const SHIELDS_BY_ID: Record<string, ShieldDef> = Object.fromEntries(SHIELDS.map((s) => [s.id, s]));

// Hulls (40 cargo starter up to 400 cargo + Fragata de Dobra Metalocto from Section 16.7 & 17)
export const BASE_AND_SPECIES_HULLS: HullDef[] = [
  {
    id: 'balsa_estelar_civil',
    name: 'Balsa Estelar Civil',
    maxHull: 55,
    armor: 2,
    weaponSlots: 1,
    defenseSlots: 0,
    extractionSlots: 1,
    utilitySlots: 1,
    cargoCapacity: 40,
    fuelCapacity: 100,
    activeCrewPosts: 1,
    reserveQuarters: 1,
    speed: 14,
    price: 900,
    rarity: 'comum',
    color: '#94a3b8',
    hullShape: 'cargueiro',
    description: 'Nave civil inicial compacta para comércio curto e mineração básica. Sem slot de escudo.',
  },
  {
    id: 'explorador_silvar',
    name: 'Batedor de Órbita',
    maxHull: 85,
    armor: 6,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 80,
    fuelCapacity: 150,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 17,
    price: 3600,
    rarity: 'incomum',
    factionStyle: 'pesquisadores',
    color: '#38bdf8',
    hullShape: 'interceptador',
    description: 'Casco ágil de reconhecimento com 1 slot de escudo, 2 de extração e 3 postos de tripulação.',
  },
  {
    id: 'cargueiro_mercantil',
    name: 'Cargueiro Interestelar',
    maxHull: 120,
    armor: 10,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 3,
    cargoCapacity: 220,
    fuelCapacity: 210,
    activeCrewPosts: 4,
    reserveQuarters: 8,
    speed: 13,
    price: 7400,
    rarity: 'incomum',
    factionStyle: 'mercantil',
    color: '#fbbf24',
    hullShape: 'cargueiro',
    description: 'Focado em rotas lucrativas (220 un. de compartimento de carga, 3 utilidades) e autonomia de combustível estendida.',
  },
  {
    id: 'corveta_patrulha',
    name: 'Corveta de Patrulha',
    maxHull: 155,
    armor: 18,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 1,
    utilitySlots: 2,
    cargoCapacity: 120,
    fuelCapacity: 200,
    activeCrewPosts: 5,
    reserveQuarters: 10,
    speed: 18,
    price: 12500,
    rarity: 'raro',
    factionStyle: 'militar',
    color: '#f87171',
    hullShape: 'corveta',
    description: 'Nave de escolta rápida com 2 slots de escudos combináveis e blindagem reforçada para combate.',
  },
  {
    id: 'minerador_pesado',
    name: 'Barcaça Extratora Pesada',
    maxHull: 190,
    armor: 22,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 4,
    utilitySlots: 3,
    cargoCapacity: 320,
    fuelCapacity: 260,
    activeCrewPosts: 6,
    reserveQuarters: 12,
    speed: 12,
    price: 18500,
    rarity: 'raro',
    factionStyle: 'silicoide',
    color: '#f59e0b',
    hullShape: 'cargueiro',
    description: 'Plataforma industrial com 4 extratores simultâneos e imenso compartimento de carga (320 un.) para expedições longas.',
  },
  {
    id: 'cruzador_guerra',
    name: 'Cruzador de Guerra',
    maxHull: 230,
    armor: 32,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 2,
    utilitySlots: 3,
    cargoCapacity: 260,
    fuelCapacity: 300,
    activeCrewPosts: 7,
    reserveQuarters: 16,
    speed: 16,
    price: 31000,
    rarity: 'épico',
    factionStyle: 'militar',
    color: '#ef4444',
    hullShape: 'cruzador',
    description: 'Belonave pesada com 230 de casco, 32 de blindagem, 2 escudos e 7 especialistas ativos.',
  },
  {
    id: 'arca_colonial',
    name: 'Arca Mercantil Soberana',
    maxHull: 245,
    armor: 26,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 3,
    utilitySlots: 4,
    cargoCapacity: 400,
    fuelCapacity: 360,
    activeCrewPosts: 8,
    reserveQuarters: 20,
    speed: 14,
    price: 38000,
    rarity: 'épico',
    factionStyle: 'mercantil',
    color: '#facc15',
    hullShape: 'fragata',
    description: 'Capacidade máxima comercial (400 un. compartimento de carga, 4 utilidades) e alojamento completo para 8+20 tripulantes.',
  },
  {
    id: 'fragata_dobra_metalocto',
    name: 'Fragata de Dobra Metalocto',
    maxHull: 280,
    armor: 45,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 3,
    utilitySlots: 4,
    cargoCapacity: 400,
    fuelCapacity: 420,
    activeCrewPosts: 8,
    reserveQuarters: 20,
    speed: 20,
    price: 58000,
    rarity: 'lendário',
    factionStyle: 'silicoide',
    color: '#c084fc',
    hullShape: 'fragata',
    description: 'Casco ápice da engenharia galáctica: 280 casco, 45 blindagem, 400 carga e todos os postos máximos.',
  },
  // ============================================================================
  // 21 NAVES ESPECIAIS EXCLUSIVAS DE CADA RAÇA (1 por espécie)
  // ============================================================================
  {
    id: 'nave_solarianos_corveta',
    name: 'Veleiro Mercantil de Solis',
    maxHull: 82,
    armor: 6,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 115,
    fuelCapacity: 150,
    activeCrewPosts: 3,
    reserveQuarters: 5,
    speed: 17,
    price: 4200,
    rarity: 'raro',
    speciesExclusiveId: 'solarianos',
    description: 'Nave exclusiva Solariana: casco equilibrado com compartimento de carga amplo (115), 2 utilidades e 3 postos ativos.',
  },
  {
    id: 'nave_valdris_lanca',
    name: 'Lança Expedicionária Valdris',
    maxHull: 105,
    armor: 11,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 1,
    utilitySlots: 2,
    cargoCapacity: 75,
    fuelCapacity: 140,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 19,
    price: 4600,
    rarity: 'raro',
    speciesExclusiveId: 'valdris',
    description: 'Nave exclusiva Valdris: interceptador blindado rápido (vel. 19) com 105 de casco e slot de escudo.',
  },
  {
    id: 'nave_nyxianos_sombra',
    name: 'Cortador Furtivo de Nyx',
    maxHull: 78,
    armor: 7,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 1,
    utilitySlots: 3,
    cargoCapacity: 85,
    fuelCapacity: 165,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 21,
    price: 4500,
    rarity: 'raro',
    speciesExclusiveId: 'nyxianos',
    description: 'Nave exclusiva Nyxiana: chassi de baixa assinatura térmica, veloz (21) e com 3 slots de utilidade.',
  },
  {
    id: 'nave_luminares_eter',
    name: 'Barco Solar de Éter Luminar',
    maxHull: 76,
    armor: 5,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 90,
    fuelCapacity: 190,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 19,
    price: 4400,
    rarity: 'raro',
    speciesExclusiveId: 'luminares_eter',
    description: 'Nave exclusiva dos Luminares: velas fotônicas com reserva estendida de energia e 2 extratores.',
  },
  {
    id: 'nave_pulsari_anel',
    name: 'Anel Tático Pulsar',
    maxHull: 92,
    armor: 8,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 1,
    utilitySlots: 2,
    cargoCapacity: 70,
    fuelCapacity: 155,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 20,
    price: 4800,
    rarity: 'raro',
    speciesExclusiveId: 'pulsari',
    description: 'Nave exclusiva Pulsari: arquitetura anelar com 2 slots de escudos defletores e alta mobilidade.',
  },
  {
    id: 'nave_umbrais_espectro',
    name: 'Espectro Silencioso Umbral',
    maxHull: 80,
    armor: 6,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 3,
    cargoCapacity: 88,
    fuelCapacity: 185,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 20,
    price: 4700,
    rarity: 'raro',
    speciesExclusiveId: 'umbrais_fotonicos',
    description: 'Nave exclusiva Umbral: preparada para nebulosas e singularidades, com 3 utilidades e grande autonomia.',
  },
  {
    id: 'nave_ferronitas_barcaca',
    name: 'Barcaça de Forja Ferronita',
    maxHull: 112,
    armor: 12,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 3,
    utilitySlots: 2,
    cargoCapacity: 145,
    fuelCapacity: 150,
    activeCrewPosts: 3,
    reserveQuarters: 5,
    speed: 14,
    price: 4900,
    rarity: 'raro',
    speciesExclusiveId: 'ferronitas',
    description: 'Nave exclusiva Ferronita: superestrutura reforçada com 3 extratores simultâneos e 145 un. de carga.',
  },
  {
    id: 'nave_titanios_ariete',
    name: 'Ariete Blindado de Titânio',
    maxHull: 126,
    armor: 16,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 1,
    utilitySlots: 2,
    cargoCapacity: 80,
    fuelCapacity: 140,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 16,
    price: 5200,
    rarity: 'raro',
    speciesExclusiveId: 'titanios_forja',
    description: 'Nave exclusiva Titânios de Forja: mini-fragata de assalto com 126 de casco, 16 de blindagem e 2 escudos.',
  },
  {
    id: 'nave_cromalitas_sentinela',
    name: 'Sentinela Espelhada Cromálita',
    maxHull: 96,
    armor: 11,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 95,
    fuelCapacity: 155,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 17,
    price: 4850,
    rarity: 'raro',
    speciesExclusiveId: 'cromalitas',
    description: 'Nave exclusiva Cromálita: casco cromado refrator equipado com 2 slots defensivos e 2 de extração.',
  },
  {
    id: 'nave_sylvaris_viva',
    name: 'Fragata Simbiótica Sylvaris',
    maxHull: 98,
    armor: 8,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 3,
    cargoCapacity: 110,
    fuelCapacity: 165,
    activeCrewPosts: 3,
    reserveQuarters: 5,
    speed: 16,
    price: 4600,
    rarity: 'raro',
    speciesExclusiveId: 'sylvaris',
    description: 'Nave exclusiva Sylvaris: embarcação bio-viva com amplos viveiros de carga e suporte a expedições.',
  },
  {
    id: 'nave_vex_esporao',
    name: 'Escompartimento de carga Predador de Vex',
    maxHull: 102,
    armor: 10,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 90,
    fuelCapacity: 150,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 19,
    price: 4650,
    rarity: 'raro',
    speciesExclusiveId: 'espinhoes_vex',
    description: 'Nave exclusiva de Vex: casco orgânico agressivo com esporões de abordagem e alta velocidade.',
  },
  {
    id: 'nave_lotus_santuario',
    name: 'Lótus Contemplativo Orbital',
    maxHull: 90,
    armor: 9,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 3,
    cargoCapacity: 105,
    fuelCapacity: 175,
    activeCrewPosts: 3,
    reserveQuarters: 5,
    speed: 16,
    price: 4550,
    rarity: 'raro',
    speciesExclusiveId: 'lotus_silenciosos',
    description: 'Nave exclusiva Lótus: santuário espacial silencioso com sensores botânicos e 3 utilidades.',
  },
  {
    id: 'nave_litoides_escavador',
    name: 'Perfurador Profundo Litóide',
    maxHull: 114,
    armor: 14,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 3,
    utilitySlots: 2,
    cargoCapacity: 135,
    fuelCapacity: 145,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 14,
    price: 4800,
    rarity: 'raro',
    speciesExclusiveId: 'litoides_basalto',
    description: 'Nave exclusiva Litóide: plataforma basáltica resistente com 3 extratores e compartimento de carga reforçado (135).',
  },
  {
    id: 'nave_drakolitos_drakar',
    name: 'Drakar Magmático',
    maxHull: 116,
    armor: 13,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 95,
    fuelCapacity: 150,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 18,
    price: 4950,
    rarity: 'raro',
    speciesExclusiveId: 'drakolitos',
    description: 'Nave exclusiva Drakólita: casco vulcânico blindado para saques em cinturões e mundos hostis.',
  },
  {
    id: 'nave_thul_prisma',
    name: 'Nave Prismática de Thul',
    maxHull: 86,
    armor: 9,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 95,
    fuelCapacity: 170,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 18,
    price: 4750,
    rarity: 'raro',
    speciesExclusiveId: 'quartzos_thul',
    description: 'Nave exclusiva de Thul: casco cristalino com matriz dupla de escudos e sensores arqueológicos.',
  },
  {
    id: 'nave_vespideos_colmeia',
    name: 'Caravela Colmeia Vespídea',
    maxHull: 88,
    armor: 7,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 3,
    cargoCapacity: 140,
    fuelCapacity: 175,
    activeCrewPosts: 4,
    reserveQuarters: 6,
    speed: 16,
    price: 4700,
    rarity: 'raro',
    speciesExclusiveId: 'vespideos_mel',
    description: 'Nave exclusiva Vespídea: cargueiro leve de enxame com 4 postos de tripulação e 140 un. de carga.',
  },
  {
    id: 'nave_krikkari_cacador',
    name: 'Caçador Veloz Krikkari',
    maxHull: 88,
    armor: 8,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 1,
    utilitySlots: 2,
    cargoCapacity: 75,
    fuelCapacity: 155,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 22,
    price: 4600,
    rarity: 'raro',
    speciesExclusiveId: 'krikkari',
    description: 'Nave exclusiva Krikkari: o casco inicial mais veloz da fronteira (vel. 22), letal em perseguições.',
  },
  {
    id: 'nave_mantis_predadora',
    name: 'Predadora Sombria Mantis',
    maxHull: 90,
    armor: 9,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 1,
    utilitySlots: 3,
    cargoCapacity: 82,
    fuelCapacity: 170,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 21,
    price: 4750,
    rarity: 'raro',
    speciesExclusiveId: 'mantis_sombra',
    description: 'Nave exclusiva Mantis: caçador noturno furtivo com 3 módulos utilitários e alta manobrabilidade.',
  },
  {
    id: 'nave_vaelor_hidro',
    name: 'Hidro-Corveta Vaeloriana',
    maxHull: 94,
    armor: 8,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 120,
    fuelCapacity: 175,
    activeCrewPosts: 3,
    reserveQuarters: 5,
    speed: 17,
    price: 4550,
    rarity: 'raro',
    speciesExclusiveId: 'vaelorianos',
    description: 'Nave exclusiva Vaeloriana: casco hidrodinâmico de comércio líquido com 120 un. de compartimento de carga.',
  },
  {
    id: 'nave_mael_nautilus',
    name: 'Nautilus Abissal de Mael',
    maxHull: 110,
    armor: 13,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: 2,
    utilitySlots: 2,
    cargoCapacity: 92,
    fuelCapacity: 165,
    activeCrewPosts: 3,
    reserveQuarters: 4,
    speed: 17,
    price: 4950,
    rarity: 'raro',
    speciesExclusiveId: 'nautilideos_mael',
    description: 'Nave exclusiva de Mael: casco superpressurizado com 2 escudos, projetado para fossas e rotas hostis.',
  },
  {
    id: 'nave_glacio_quebragelo',
    name: 'Quebra-Gelo de Glácio',
    maxHull: 102,
    armor: 12,
    weaponSlots: 1,
    defenseSlots: 1,
    extractionSlots: 2,
    utilitySlots: 3,
    cargoCapacity: 108,
    fuelCapacity: 180,
    activeCrewPosts: 3,
    reserveQuarters: 5,
    speed: 16,
    price: 4700,
    rarity: 'raro',
    speciesExclusiveId: 'abissais_glacio',
    description: 'Nave exclusiva de Glácio: embarcação criogênica blindada para mundos congelados e expedições longas.',
  },
];

// Generate 42 distinct Faction Ships (1 exclusive flagship-class vessel per faction with faction color & profile)
const FACTION_HULLS: HullDef[] = FACTIONS.map((fac, idx) => {
  const shortTag = fac.name
    .replace(/^(Pacto|Conselho|Liga|Ordem|Congregação|Gremio|Grêmio|Frota|Comuna|Sindicato|Diretório|União|Vanguarda|Círculo|Hegemonia|Cânone|Aliança|Casa|Clã|Império|Cruzada|Sentinela|Rede|Expedição)\s+(de|da|do|dos|das)?\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .join(' ');
  const isMilitary = fac.axis === 'Militar';
  const isMerchant = fac.axis === 'Mercantil';
  const isTrad = fac.axis === 'Tradicionalistas';
  const hullShape: HullDef['hullShape'] = isMilitary
    ? idx % 2 === 0
      ? 'cruzador'
      : 'corveta'
    : isMerchant
      ? 'cargueiro'
      : isTrad
        ? 'fragata'
        : 'interceptador';
  const className = isMilitary
    ? idx % 2 === 0
      ? 'Corveta de Batalha'
      : 'Cruzador Tático'
    : isMerchant
      ? 'Nave Mercante'
      : isTrad
        ? 'Guardião Estelar'
        : 'Explorador de Fenda';
  const maxHull = isMilitary ? 165 + (idx % 4) * 14 : isTrad ? 150 + (idx % 4) * 12 : isMerchant ? 135 + (idx % 4) * 10 : 128 + (idx % 4) * 12;
  const armor = isMilitary ? 20 + (idx % 5) * 3 : isTrad ? 16 + (idx % 4) * 2 : 12 + (idx % 4) * 2;
  const speed = isMilitary ? 18 + (idx % 3) : isMerchant ? 15 + (idx % 3) : isTrad ? 16 + (idx % 3) : 20 + (idx % 3);
  const cargoCapacity = isMerchant ? 250 + (idx % 4) * 25 : isTrad ? 160 + (idx % 3) * 20 : 130 + (idx % 4) * 15;
  const fuelCapacity = isMerchant ? 260 : isMilitary ? 210 : 240;
  const activeCrewPosts = isMilitary || isMerchant ? 5 : 4;
  const reserveQuarters = activeCrewPosts * 2 + 2;
  const price = 11800 + (idx % 5) * 1450;

  return {
    id: `nave_fac_${fac.id}`,
    name: `${className} ${shortTag}`,
    maxHull,
    armor,
    weaponSlots: 1,
    defenseSlots: 2,
    extractionSlots: isMerchant ? 3 : 2,
    utilitySlots: isMerchant || !isMilitary ? 3 : 2,
    cargoCapacity,
    fuelCapacity,
    activeCrewPosts,
    reserveQuarters,
    speed,
    price,
    rarity: idx % 3 === 0 ? 'épico' : 'raro',
    factionStyle: fac.techStyle,
    factionExclusiveId: fac.id,
    color: fac.color,
    hullShape,
    description: `Nave oficial da facção ${fac.name} (${fac.axis}): pintura tática exclusiva. Pilotar esta nave alinha você diretamente à ${fac.name}.`,
  };
});

export const HULLS: HullDef[] = [
  ...BASE_AND_SPECIES_HULLS.map((h) => {
    if (h.color && h.hullShape) return h;
    const spColor = h.speciesExclusiveId ? SPECIES_BY_ID[h.speciesExclusiveId]?.color : undefined;
    const shape: HullDef['hullShape'] =
      h.cargoCapacity >= 135
        ? 'cargueiro'
        : h.armor >= 14
          ? 'corveta'
          : h.defenseSlots >= 2
            ? 'fragata'
            : 'interceptador';
    return {
      ...h,
      color: h.color ?? spColor ?? '#38bdf8',
      hullShape: h.hullShape ?? shape,
    };
  }),
  ...FACTION_HULLS,
];

for (const hull of HULLS) {
  hull.maxHull = Math.round(hull.maxHull * 3);
}

export const HULLS_BY_ID: Record<string, HullDef> = Object.fromEntries(HULLS.map((h) => [h.id, h]));

export const JUMP_DRIVES: JumpDriveDef[] = [
  { id: 'motor_curto_mk1', name: 'Motor de Salto Civil Mk.I', jumpRangeLy: 16, fuelEfficiency: 1.0, price: 300, rarity: 'comum', description: 'Permite saltos de até 16 anos-luz no mapa galáctico com consumo padrão de combustível.' },
  { id: 'motor_setorial_mk2', name: 'Propulsor de Salto Setorial Mk.II', jumpRangeLy: 24, fuelEfficiency: 0.9, price: 1400, rarity: 'incomum', description: 'Expande o alcance de salto para 24 a.l. e economiza 10% de combustível por viagem.' },
  { id: 'motor_hiper_mk3', name: 'Núcleo Hiperespacial Mk.III', jumpRangeLy: 34, fuelEfficiency: 0.8, price: 3900, rarity: 'raro', description: 'Cruza setores vizinhos com saltos de 34 a.l. e reduz o gasto de combustível em 20%.' },
  { id: 'motor_fenda_mk4', name: 'Propulsor de Fenda Estelar Mk.IV', jumpRangeLy: 48, fuelEfficiency: 0.7, price: 9500, rarity: 'épico', description: 'Saltos profundos de 48 a.l. com 30% menos gasto de combustível, ideal para o espaço selvagem.' },
  { id: 'motor_dobra_soberano', name: 'Motor de Dobra Soberano Mk.V', jumpRangeLy: 72, fuelEfficiency: 0.55, price: 22000, rarity: 'lendário', description: 'Alcance máximo de 72 a.l. (todo o mapa visível) reduzindo o gasto de combustível em 45%.' },
];

export const JUMP_DRIVES_BY_ID: Record<string, JumpDriveDef> = Object.fromEntries(
  JUMP_DRIVES.map((j) => [j.id, j])
);

// Extractors matching exact pulse rates in Section 18.3:
// 1.0 (broca mineral), 1.5-1.6 (atmosférico/líquido/biológico), 2.2 (bio-mineral/arqueológico), 2.8 (antimatéria/energia)
export const EXTRACTORS: ExtractorDef[] = [
  { id: 'broca_mineral_basica', name: 'Broca Mineral Civil', extractionClass: 'broca_mineral', ratePerSec: 0.5, techTier: 1, price: 240, rarity: 'comum', factionStyle: 'silicoide', description: 'A ferramenta mais simples da frota. Tira 1 unidade a cada 2 segundos de minério sólido.' },
  { id: 'broca_pesada_silicoide', name: 'Perfuratriz Bio-Mineral Pesada', extractionClass: 'broca_mineral', ratePerSec: 2.4, techTier: 3, price: 1850, rarity: 'raro', factionStyle: 'silicoide', description: 'Broca de alta potência. Tira 1 unidade a cada 0,4 segundos em veios profundos e cometas.' },
  { id: 'coletor_atmosferico_mk1', name: 'Coletor Atmosférico de Turbina', extractionClass: 'coletor_atmosferico', ratePerSec: 1.1, techTier: 2, price: 680, rarity: 'incomum', factionStyle: 'gasosa', description: 'Capta gases leves. Tira 1 unidade a cada 0,9 segundos e abre bolsas nebulares.' },
  { id: 'coletor_atmosferico_mk2', name: 'Aspirador Gasoso de Alta Pressão', extractionClass: 'coletor_atmosferico', ratePerSec: 2.0, techTier: 3, price: 1600, rarity: 'raro', factionStyle: 'gasosa', description: 'Aspirador de gigantes gasosos. Tira 1 unidade a cada 0,5 segundos.' },
  { id: 'bomba_liquida_mk1', name: 'Bomba Líquida Orbital', extractionClass: 'bomba_liquida', ratePerSec: 1.1, techTier: 2, price: 640, rarity: 'incomum', factionStyle: 'criogenica', description: 'Sifona água, gelo e sais. Tira 1 unidade a cada 0,9 segundos.' },
  { id: 'bomba_criogenica_mk2', name: 'Sifão Criogênico Subglacial', extractionClass: 'bomba_liquida', ratePerSec: 2.0, techTier: 3, price: 1550, rarity: 'raro', factionStyle: 'criogenica', description: 'Extrai líquidos profundos. Tira 1 unidade a cada 0,5 segundos.' },
  { id: 'coletor_biologico_mk1', name: 'Coletor Biológico de Esporos', extractionClass: 'coletor_biologico', ratePerSec: 1.0, techTier: 2, price: 720, rarity: 'incomum', factionStyle: 'pesquisadores', description: 'Recolhe biomassa e esporos. Tira 1 unidade a cada 1 segundo.' },
  { id: 'coletor_biologico_mk2', name: 'Extrator Simbiótico Avançado', extractionClass: 'coletor_biologico', ratePerSec: 2.2, techTier: 3, price: 1700, rarity: 'raro', factionStyle: 'pesquisadores', description: 'Módulo biológico de precisão. Tira 1 unidade a cada 0,45 segundos.' },
  { id: 'extrator_energia_mk1', name: 'Extrator de Energia & Antimatéria', extractionClass: 'extrator_energia', ratePerSec: 3.33, techTier: 4, price: 4200, rarity: 'épico', factionStyle: 'radioativa', description: 'O extrator mais rápido da frota. Tira 1 unidade a cada 0,3 segundos.' },
  { id: 'escavador_arqueologico_mk1', name: 'Escavador Arqueológico de Precisão', extractionClass: 'escavador_arqueologico', ratePerSec: 2.6, techTier: 3, price: 2900, rarity: 'raro', factionStyle: 'pesquisadores', description: 'Recupera relíquias intactas. Tira 1 unidade a cada 0,4 segundos.' },
];

export const EXTRACTORS_BY_ID: Record<string, ExtractorDef> = Object.fromEntries(
  EXTRACTORS.map((e) => [e.id, e])
);

export const UTILITY_MODULES: UtilityModuleDef[] = [
  { id: 'rebocador_carga_mk1', name: 'Rebocador de Carga Auxiliar', kind: 'carga', bonusValue: 35, price: 450, rarity: 'comum', factionStyle: 'mercantil', description: '+35 unidades de capacidade no compartimento de carga.' },
  { id: 'rebocador_mercantil_mk2', name: 'Contêiner Gravitacional Mercantil', kind: 'carga', bonusValue: 90, price: 2400, rarity: 'raro', factionStyle: 'mercantil', description: '+90 unidades de capacidade no compartimento de carga.' },
  { id: 'scanner_longo_alcance', name: 'Scanner de Longo Alcance', kind: 'scanner', bonusValue: 1, price: 850, rarity: 'incomum', factionStyle: 'pesquisadores', description: 'Revela depósitos escondidos e escaneia sistemas vizinhos no mapa.' },
  { id: 'camuflagem_tatica', name: 'Módulo de Camuflagem Tática', kind: 'camuflagem', bonusValue: 0.45, price: 2900, rarity: 'raro', factionStyle: 'pesquisadores', description: 'Reduz em 45% a chance de encontros hostis em rotas contestadas.' },
  { id: 'tanque_auxiliar', name: 'Tanque Criogênico Auxiliar', kind: 'tanque', bonusValue: 100, price: 980, rarity: 'incomum', factionStyle: 'criogenica', description: '+100 de reserva máxima de combustível.' },
  { id: 'estabilizador_dobra', name: 'Estabilizador de Dobra Econômico', kind: 'dobra', bonusValue: 0.25, price: 3600, rarity: 'épico', factionStyle: 'gasosa', description: 'Reduz em 25% o consumo de combustível nos saltos.' },
];

export const UTILITY_BY_ID: Record<string, UtilityModuleDef> = Object.fromEntries(
  UTILITY_MODULES.map((u) => [u.id, u])
);

export const SUIT_GEAR: SuitGearDef[] = [
  { id: 'lanterna_tatica', name: 'Lanterna Espectral de Caverna', category: 'ferramenta', explorationBonus: 6, combatPower: 3, price: 180, rarity: 'comum', description: 'Ilumina túneis e ruínas densas.' },
  { id: 'mochila_jato', name: 'Mochila a Jato Orbital', category: 'ferramenta', explorationBonus: 12, combatPower: 8, price: 620, rarity: 'incomum', description: 'Permite cruzar abismos e evitar emboscadas.' },
  { id: 'cortador_plasma', name: 'Cortador de Plasma Portátil', category: 'ferramenta', explorationBonus: 10, combatPower: 18, price: 840, rarity: 'incomum', factionStyle: 'silicoide', description: 'Abre caches selados e defende contra predadores.' },
  { id: 'escaner_fauna', name: 'Escâner de Fauna & Amostras', category: 'ferramenta', explorationBonus: 18, combatPower: 5, price: 950, rarity: 'incomum', factionStyle: 'pesquisadores', description: 'Aumenta chance de catalogar criaturas raras.' },
  { id: 'prot_calor', name: 'Revestimento Térmico Silicoide', category: 'protecao', hazardType: 'calor', explorationBonus: 14, combatPower: 10, price: 780, rarity: 'incomum', factionStyle: 'silicoide', description: 'Protege contra calor extremo e fluxos de lava.' },
  { id: 'prot_frio', name: 'Resfriador / Isolamento Criogênico', category: 'protecao', hazardType: 'frio', explorationBonus: 14, combatPower: 10, price: 780, rarity: 'incomum', factionStyle: 'criogenica', description: 'Mantém estabilidade térmica em mundos glaciais.' },
  { id: 'prot_radiacao', name: 'Blindagem Anti-Radiação', category: 'protecao', hazardType: 'radiacao', explorationBonus: 16, combatPower: 14, price: 1150, rarity: 'raro', factionStyle: 'radioativa', description: 'Bloqueia partículas ionizantes letais.' },
  { id: 'prot_toxicidade', name: 'Respirador & Filtro Antitóxico', category: 'protecao', hazardType: 'toxicidade', explorationBonus: 14, combatPower: 8, price: 740, rarity: 'incomum', factionStyle: 'gasosa', description: 'Filtra gases corrosivos e esporos tóxicos.' },
  { id: 'prot_pressao', name: 'Exoesqueleto de Alta Pressão', category: 'protecao', hazardType: 'pressao', explorationBonus: 16, combatPower: 16, price: 1350, rarity: 'raro', factionStyle: 'silicoide', description: 'Suporta gravidade esmagadora e mares profundos.' },
  { id: 'drone_superficie', name: 'Drone Autônomo de Reconhecimento', category: 'drone', explorationBonus: 22, combatPower: 22, price: 2400, rarity: 'épico', factionStyle: 'pesquisadores', description: 'Mapeia ameaças antes do desembarque.' },
  { id: 'rover_exploracao', name: 'Veículo Rover Blindado', category: 'drone', explorationBonus: 30, combatPower: 34, price: 4800, rarity: 'épico', factionStyle: 'militar', description: 'Transporte blindado para expedições hostis.' },
];

export const SUIT_GEAR_BY_ID: Record<string, SuitGearDef> = Object.fromEntries(
  SUIT_GEAR.map((g) => [g.id, g])
);

function stretchPrices<T extends { price: number }>(items: T[], floor: number, ceiling: number) {
  if (items.length === 0) return;
  let lo = Infinity;
  let hi = -Infinity;
  for (const item of items) {
    if (item.price < lo) lo = item.price;
    if (item.price > hi) hi = item.price;
  }
  const span = hi - lo || 1;
  for (const item of items) {
    const t = (item.price - lo) / span;
    item.price = Math.round(floor + t * (ceiling - floor));
  }
}

stretchPrices(WEAPONS, 500, 30000);
stretchPrices(SHIELDS, 500, 30000);
stretchPrices(HULLS, 10000, 100000);
stretchPrices(JUMP_DRIVES, 150, 50000);
stretchPrices(EXTRACTORS, 100, 5000);
stretchPrices(UTILITY_MODULES, 200, 4000);
stretchPrices(SUIT_GEAR, 100, 5000);

export const CONSUMABLES: ConsumableDef[] = [
  { id: 'combustivel_salto', name: 'Célula de Combustível de Salto', kind: 'combustivel', amount: 45, price: 45, description: 'Recarrega +45 unidades de combustível.' },
  { id: 'kit_reparo', name: 'Kit de Reparo de Casco', kind: 'reparo', amount: 35, price: 65, description: 'Restaura +35 pontos de casco imediatamente.' },
  { id: 'oxigenio', name: 'Cilindro de Oxigênio & Suporte', kind: 'oxigenio', amount: 1, price: 35, description: 'Estende sobrevivência em descidas atmosféricas.' },
  { id: 'escudo_descartavel', name: 'Capacitor de Escudo Descartável', kind: 'escudo_desc', amount: 60, price: 85, description: 'Recarrega +60 de escudo durante combates.' },
  { id: 'sonda_orbital', name: 'Sonda Orbital Autônoma', kind: 'sonda', amount: 1, price: 55, description: 'Escaneia um planeta à distância sem risco.' },
  { id: 'antidoto', name: 'Antídoto Xenobiológico', kind: 'antidoto', amount: 1, price: 50, description: 'Neutraliza toxinas e esporos em expedições.' },
  { id: 'mantimentos', name: 'Ração de Mantimentos (50 un.)', kind: 'mantimentos', amount: 50, price: 1, description: 'Alimenta a tripulação fora de órbita (1 crédito / 50 un.).' },

  // ============================================================================
  // 21 CONSUMÍVEIS EXCLUSIVOS DE CADA RAÇA
  // ============================================================================
  { id: 'con_solarianos', name: 'Ampola de Rota Solariana', kind: 'especial_raca', amount: 40, price: 95, rarity: 'raro', speciesExclusiveId: 'solarianos', combatEffect: { hullHeal: 25, shieldRestore: 35 }, campaignEffect: { fuelGain: 35, suppliesGain: 40 }, description: 'Exclusivo Solariano: +35 Combustível, +40 Mantimentos e +25 Casco / +35 Escudo em emergência.' },
  { id: 'con_valdris', name: 'Cartucho de Adrenalina Valdris', kind: 'especial_raca', amount: 50, price: 110, rarity: 'raro', speciesExclusiveId: 'valdris', combatEffect: { hullHeal: 40, damageAllEnemies: 45 }, description: 'Exclusivo Valdris: causa 45 de dano imediato a todos os inimigos e repara +40 do casco.' },
  { id: 'con_nyxianos', name: 'Véu Químico de Nyx', kind: 'especial_raca', amount: 60, price: 105, rarity: 'raro', speciesExclusiveId: 'nyxianos', combatEffect: { shieldRestore: 65, damageAllEnemies: 25 }, campaignEffect: { fuelGain: 20 }, description: 'Exclusivo Nyxiano: restaura +65 de escudo, +20 combustível e causa 25 de dano furtivo.' },
  { id: 'con_luminares', name: 'Condensador de Éter Puro', kind: 'especial_raca', amount: 70, price: 110, rarity: 'raro', speciesExclusiveId: 'luminares_eter', combatEffect: { shieldRestore: 80 }, campaignEffect: { fuelGain: 50 }, description: 'Exclusivo Luminar: recarrega +80 de escudo e +50 de combustível estelar instantaneamente.' },
  { id: 'con_pulsari', name: 'Cápsula de Coroa Pulsar', kind: 'especial_raca', amount: 65, price: 115, rarity: 'raro', speciesExclusiveId: 'pulsari', combatEffect: { damageAllEnemies: 65, shieldRestore: 30 }, description: 'Exclusivo Pulsari: detona onda gama (65 de dano em todos os inimigos) e +30 escudo.' },
  { id: 'con_umbrais', name: 'Sifão de Matéria Umbral', kind: 'especial_raca', amount: 55, price: 110, rarity: 'raro', speciesExclusiveId: 'umbrais_fotonicos', combatEffect: { damageAllEnemies: 40, shieldRestore: 55 }, description: 'Exclusivo Umbral: drena 40 de dano de todos os alvos e converte em +55 de escudo.' },
  { id: 'con_ferronitas', name: 'Liga Líquida Autorreparadora', kind: 'especial_raca', amount: 75, price: 105, rarity: 'raro', speciesExclusiveId: 'ferronitas', combatEffect: { hullHeal: 75 }, description: 'Exclusivo Ferronita: solda brechas imediatamente restaurando +75 pontos de casco.' },
  { id: 'con_titanios', name: 'Blindagem Reativa Titânio', kind: 'especial_raca', amount: 80, price: 120, rarity: 'raro', speciesExclusiveId: 'titanios_forja', combatEffect: { hullHeal: 55, shieldRestore: 55 }, description: 'Exclusivo Titânios: reforça +55 casco e +55 escudo em pleno combate pesado.' },
  { id: 'con_cromalitas', name: 'Pulso Refrator Cromálita', kind: 'especial_raca', amount: 70, price: 115, rarity: 'raro', speciesExclusiveId: 'cromalitas', combatEffect: { shieldRestore: 75, damageAllEnemies: 30 }, description: 'Exclusivo Cromálita: gera +75 escudo espelhado e reflete 30 de dano aos inimigos.' },
  { id: 'con_sylvaris', name: 'Seiva Regenerativa Viva', kind: 'especial_raca', amount: 65, price: 100, rarity: 'raro', speciesExclusiveId: 'sylvaris', combatEffect: { hullHeal: 65 }, campaignEffect: { suppliesGain: 80 }, description: 'Exclusivo Sylvaris: cura orgânica +65 casco e regenera +80 mantimentos vivos.' },
  { id: 'con_vex', name: 'Bomba Esporal Corrosiva', kind: 'especial_raca', amount: 60, price: 110, rarity: 'raro', speciesExclusiveId: 'espinhoes_vex', combatEffect: { damageAllEnemies: 60, hullHeal: 25 }, description: 'Exclusivo de Vex: libera nuvem ácida (60 dano em todos os inimigos) e +25 casco.' },
  { id: 'con_lotus', name: 'Incenso Simbiótico de Lótus', kind: 'especial_raca', amount: 55, price: 100, rarity: 'raro', speciesExclusiveId: 'lotus_silenciosos', combatEffect: { hullHeal: 45, shieldRestore: 45 }, campaignEffect: { suppliesGain: 60 }, description: 'Exclusivo Lótus: restaura +45 casco, +45 escudo e +60 mantimentos.' },
  { id: 'con_litoides', name: 'Cimento Basáltico Rápido', kind: 'especial_raca', amount: 70, price: 105, rarity: 'raro', speciesExclusiveId: 'litoides_basalto', combatEffect: { hullHeal: 70 }, campaignEffect: { fuelGain: 25 }, description: 'Exclusivo Litóide: sela placas do casco (+70 casco) e fornece +25 combustível geotérmico.' },
  { id: 'con_drakolitos', name: 'Carga Magmática Instável', kind: 'especial_raca', amount: 70, price: 118, rarity: 'raro', speciesExclusiveId: 'drakolitos', combatEffect: { damageAllEnemies: 70 }, description: 'Exclusivo Drakólito: projeta erupção térmica causando 70 de dano direto a todos os inimigos.' },
  { id: 'con_thul', name: 'Matriz Ressonadora de Quartzo', kind: 'especial_raca', amount: 70, price: 112, rarity: 'raro', speciesExclusiveId: 'quartzos_thul', combatEffect: { shieldRestore: 70, hullHeal: 30 }, description: 'Exclusivo de Thul: restaura +70 de escudo cristalino e +30 de casco.' },
  { id: 'con_vespideos', name: 'Geleia Real Energética', kind: 'especial_raca', amount: 60, price: 95, rarity: 'raro', speciesExclusiveId: 'vespideos_mel', combatEffect: { hullHeal: 40 }, campaignEffect: { fuelGain: 45, suppliesGain: 90 }, description: 'Exclusivo Vespídeo: +90 mantimentos, +45 combustível e +40 pontos de casco.' },
  { id: 'con_krikkari', name: 'Salva de Micro-Ferrões', kind: 'especial_raca', amount: 65, price: 112, rarity: 'raro', speciesExclusiveId: 'krikkari', combatEffect: { damageAllEnemies: 62 }, campaignEffect: { fuelGain: 20 }, description: 'Exclusivo Krikkari: dispara micro-mísseis causando 62 de dano a todos os inimigos (+20 comb.).' },
  { id: 'con_mantis', name: 'Toxina Neural de Emboscada', kind: 'especial_raca', amount: 65, price: 115, rarity: 'raro', speciesExclusiveId: 'mantis_sombra', combatEffect: { damageAllEnemies: 58, shieldRestore: 35 }, description: 'Exclusivo Mantis: 58 de dano penetrante a todos os inimigos e +35 de escudo.' },
  { id: 'con_vaelorianos', name: 'Fluido Hidropressurizado Vaelor', kind: 'especial_raca', amount: 65, price: 100, rarity: 'raro', speciesExclusiveId: 'vaelorianos', combatEffect: { hullHeal: 45, shieldRestore: 45 }, campaignEffect: { suppliesGain: 75 }, description: 'Exclusivo Vaeloriano: +45 casco, +45 escudo e +75 mantimentos oceânicos.' },
  { id: 'con_mael', name: 'Torpedo Criogênico Descartável', kind: 'especial_raca', amount: 68, price: 118, rarity: 'raro', speciesExclusiveId: 'nautilideos_mael', combatEffect: { damageAllEnemies: 66, hullHeal: 25 }, description: 'Exclusivo de Mael: impacto glacial de 66 de dano em todos os alvos e +25 casco.' },
  { id: 'con_glacio', name: 'Núcleo Subzero de Glácio', kind: 'especial_raca', amount: 75, price: 112, rarity: 'raro', speciesExclusiveId: 'abissais_glacio', combatEffect: { shieldRestore: 75, hullHeal: 35 }, campaignEffect: { healthGain: 18 }, description: 'Exclusivo de Glácio: restaura escudo, casco e um fôlego de saúde da tripulação.' },
];

const FACTION_HEALTH_KITS: ConsumableDef[] = FACTIONS.map((fac, index) => {
  const potent = index % 5 === 0;
  const stem = fac.name.split(' ').slice(-1)[0] ?? fac.name;
  return {
    id: `saude_${fac.id}`,
    name: potent ? `Tônico de Vigília ${stem}` : `Soro de Campanha ${stem}`,
    kind: 'saude',
    amount: potent ? 18 : 26,
    price: potent ? 160 : 90,
    rarity: potent ? 'raro' : 'incomum',
    factionExclusiveId: fac.id,
    campaignEffect: potent
      ? { healthGain: 16, healthPotency: 8 }
      : { healthGain: 26 },
    description: potent
      ? `Relatório médico de ${fac.name}. Além de fechar feridas, amplia o teto de saúde da tripulação.`
      : `Ampola de enfermaria de ${fac.name}. Devolve saúde depois de uma descida ou de uma extração no solo.`,
  };
});

CONSUMABLES.push(...FACTION_HEALTH_KITS);

export const CONSUMABLES_BY_ID: Record<string, ConsumableDef> = Object.fromEntries(
  [...CONSUMABLES, ...FACTION_HEALTH_KITS].map((c) => [c.id, c])
);

// Ship & Part Blueprints craftable at level 3-5 shipyards (Section 9)
export const BLUEPRINTS: BlueprintDef[] = [
  {
    id: 'bp_explorador_silvar',
    targetCategory: 'hull',
    targetId: 'explorador_silvar',
    name: 'Projeto: Batedor de Órbita',
    price: 750,
    craftCredits: 1400,
    requiredResources: [
      { resourceId: 'ferro', qty: 18 },
      { resourceId: 'silicio', qty: 12 },
      { resourceId: 'cobre', qty: 10 },
    ],
    minPlanetLevel: 3,
    description: 'Constrói uma nave Batedor de Órbita (85 casco, 80 compartimento de carga, 1 escudo, 3 tripulantes) mais barata que a compra direta.',
  },
  {
    id: 'bp_cargueiro_mercantil',
    targetCategory: 'hull',
    targetId: 'cargueiro_mercantil',
    name: 'Projeto: Cargueiro Interestelar',
    price: 1400,
    craftCredits: 2800,
    requiredResources: [
      { resourceId: 'ferro', qty: 30 },
      { resourceId: 'titanio', qty: 12 },
      { resourceId: 'hidrogenio', qty: 15 },
    ],
    minPlanetLevel: 3,
    description: 'Constrói um Cargueiro Interestelar com 220 de compartimento de carga e 3 slots utilitários.',
  },
  {
    id: 'bp_corveta_patrulha',
    targetCategory: 'hull',
    targetId: 'corveta_patrulha',
    name: 'Projeto: Corveta de Patrulha',
    price: 2200,
    craftCredits: 4600,
    requiredResources: [
      { resourceId: 'titanio', qty: 20 },
      { resourceId: 'platina', qty: 10 },
      { resourceId: 'cristais_energeticos', qty: 8 },
    ],
    minPlanetLevel: 3,
    description: 'Constrói uma Corveta de Patrulha armada para combate tático com 2 slots de escudos.',
  },
  {
    id: 'bp_cruzador_guerra',
    targetCategory: 'hull',
    targetId: 'cruzador_guerra',
    name: 'Projeto: Cruzador de Guerra',
    price: 4800,
    craftCredits: 11000,
    requiredResources: [
      { resourceId: 'titanio', qty: 36 },
      { resourceId: 'platina', qty: 18 },
      { resourceId: 'uranio', qty: 14 },
      { resourceId: 'ligas_avancadas', qty: 8 },
    ],
    minPlanetLevel: 4,
    description: 'Forja um Cruzador de Guerra épico (230 casco, 32 blindagem, 7 postos ativos).',
  },
  {
    id: 'bp_fragata_metalocto',
    targetCategory: 'hull',
    targetId: 'fragata_dobra_metalocto',
    name: 'Projeto: Fragata de Dobra Metalocto',
    price: 9500,
    craftCredits: 22000,
    requiredResources: [
      { resourceId: 'metais_densos', qty: 24 },
      { resourceId: 'ligas_avancadas', qty: 18 },
      { resourceId: 'antimateria', qty: 10 },
      { resourceId: 'nucleo_estelar', qty: 4 },
    ],
    minPlanetLevel: 4,
    description: 'Constrói a lendária Fragata de Dobra Metalocto (280 casco, 45 blindagem, 400 carga, 8+20 tripulantes).',
  },
  {
    id: 'bp_emissor_gama_pulsar',
    targetCategory: 'weapon',
    targetId: 'emissor_gama_pulsar',
    name: 'Projeto: Emissor Gama de Pulsar',
    price: 4200,
    craftCredits: 9500,
    requiredResources: [
      { resourceId: 'cristais_energeticos', qty: 18 },
      { resourceId: 'plutonio', qty: 10 },
      { resourceId: 'nucleo_estelar', qty: 3 },
    ],
    minPlanetLevel: 4,
    description: 'Monta o Emissor Gama de Pulsar lendário (155 DPS Laser, Nível 5, alcance 28).',
  },
  {
    id: 'bp_egide_quantica',
    targetCategory: 'shield',
    targetId: 'egide_quantica_soberana',
    name: 'Projeto: Égide Quântica Soberana',
    price: 4000,
    craftCredits: 9000,
    requiredResources: [
      { resourceId: 'diamante', qty: 12 },
      { resourceId: 'materia_exotica', qty: 8 },
      { resourceId: 'cristais_celestiais', qty: 6 },
    ],
    minPlanetLevel: 4,
    description: 'Produz o escudo lendário Égide Quântica Soberana (+320 cap., 85% mitigação geral, 25% reflexão).',
  },
  ...FACTION_HULLS.map((fh, idx): BlueprintDef => {
    const fac = FACTIONS[idx];
    return {
      id: `bp_fac_${fac.id}`,
      targetCategory: 'hull',
      targetId: fh.id,
      name: `Projeto: ${fh.name}`,
      price: Math.round(fh.price * 0.24),
      craftCredits: Math.round(fh.price * 0.42),
      requiredResources: [
        { resourceId: 'titanio', qty: 16 + (idx % 4) * 3 },
        { resourceId: 'platina', qty: 8 + (idx % 3) * 2 },
        { resourceId: fac.axis === 'Militar' ? 'uranio' : 'cristais_energeticos', qty: 6 + (idx % 3) * 2 },
      ],
      minPlanetLevel: 3,
      factionExclusiveId: fac.id,
      description: `Projeto de casco exclusivo de ${fac.name} (${fh.maxHull} casco, ${fh.armor} blindagem, cor ${fac.color}). Construir e pilotar vincula sua facção ativa a ${fac.name}.`,
    };
  }),
];

export const BLUEPRINTS_BY_ID: Record<string, BlueprintDef> = Object.fromEntries(
  BLUEPRINTS.map((b) => [b.id, b])
);

for (const blueprint of BLUEPRINTS) {
  const targetPrice =
    blueprint.targetCategory === 'hull'
      ? HULLS_BY_ID[blueprint.targetId]?.price
      : blueprint.targetCategory === 'weapon'
        ? WEAPONS_BY_ID[blueprint.targetId]?.price
        : blueprint.targetCategory === 'shield'
          ? SHIELDS_BY_ID[blueprint.targetId]?.price
          : undefined;
  if (!targetPrice) continue;
  blueprint.price = Math.max(1, Math.round(targetPrice * 0.24));
  blueprint.craftCredits = Math.max(1, Math.round(targetPrice * 0.42));
}
