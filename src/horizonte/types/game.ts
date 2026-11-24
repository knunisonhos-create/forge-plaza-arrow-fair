export type LifeFormId =
  | 'humanoide'
  | 'espectroid'
  | 'metalocto'
  | 'plantideo'
  | 'grutoide'
  | 'insectoide'
  | 'anfibio';

export type SpeciesTemperament = 'pacifica' | 'expansionista' | 'isolada';

export type EcologicalRole =
  | 'predador'
  | 'presa'
  | 'herbívoro'
  | 'parasita'
  | 'decompositor'
  | 'filtrador';

export type CreatureSize = 'microscópico' | 'pequeno' | 'médio' | 'grande' | 'colossal';
export type CreatureDanger = 'inofensivo' | 'baixo' | 'moderado' | 'alto' | 'mortal';

export type Rarity = 'comum' | 'incomum' | 'raro' | 'épico' | 'lendário' | 'único';

export type ExtractionClass =
  | 'broca_mineral'
  | 'coletor_atmosferico'
  | 'bomba_liquida'
  | 'coletor_biologico'
  | 'extrator_energia'
  | 'escavador_arqueologico';

export type WeaponDamageType = 'laser' | 'cinetica' | 'plasma' | 'missil';

export type GalacticRegion =
  | 'Núcleo galáctico'
  | 'Braços galácticos'
  | 'Regiões nebulosas'
  | 'Regiões periféricas'
  | 'Zonas anômalas';

export type StarType =
  | 'Anã Amarela'
  | 'Gigante Azul'
  | 'Anã Vermelha'
  | 'Estrela Branca'
  | 'Estrela Laranja'
  | 'Pulsar'
  | 'Buraco Negro'
  | 'Buraco Negro Supermassivo';

export type CrewRole =
  | 'piloto_navegador'
  | 'piloto_combate'
  | 'engenheiro'
  | 'negociador'
  | 'explorador'
  | 'minerador'
  | 'diplomata'
  | 'mestre_tripulacao';

export type RenownTier =
  | 'Hostil'
  | 'Rival'
  | 'Neutro'
  | 'Conhecido'
  | 'Aliado'
  | 'Confiável'
  | 'Honrado'
  | 'Aliança Formal';

export interface LifeFormDef {
  id: LifeFormId;
  name: string;
  biology: string;
  nicheSummary: string;
  color: string;
  accentColor: string;
  compatiblePlanetCodes: string[];
}

export interface SpeciesDef {
  id: string;
  name: string;
  lifeFormId: LifeFormId;
  temperament: SpeciesTemperament;
  description: string;
  traits: string[];
  color: string;
}

export interface CreatureDef {
  id: string;
  name: string;
  lifeFormId: LifeFormId;
  ecologicalRole: EcologicalRole;
  size: CreatureSize;
  danger: CreatureDanger;
  utility: string;
  rareNiche: boolean;
  preferredPlanetCodes: string[];
  baseValue: number;
  description: string;
}

export type FactionAxis = 'Tradicionalistas' | 'Reformistas' | 'Mercantil' | 'Militar';
export type FactionTechStyle =
  | 'silicoide'
  | 'criogenica'
  | 'gasosa'
  | 'radioativa'
  | 'militar'
  | 'mercantil'
  | 'pesquisadores';

export interface FactionDef {
  id: string;
  name: string;
  speciesId: string;
  lifeFormId: LifeFormId;
  axis: FactionAxis;
  techStyle: FactionTechStyle;
  color: string;
  customs: string;
  laws: string;
  economyFocus: string;
  capitalSystemId: string;
  capitalCoord: { x: number; y: number; z: number };
  requiresLicenseOrRenown: boolean;
  warsWith: string[];
  alliedWith: string[];
}

export interface PlanetTypeDef {
  code: string; // TX01 .. TX30
  name: string;
  rarity: Rarity;
  textureDesc: string;
  typicalResourceIds: string[];
  minLevel: number;
  maxLevel: number;
  lifeRuleText: string;
  allowedLifeForms: LifeFormId[];
  allowsCivilization45: boolean;
  noSurface?: boolean;
  rogue?: boolean;
  palette: [string, string, string];
  atmosphereColor: string;
  hasClouds: boolean;
}

export interface ResourceDef {
  id: string;
  name: string;
  rarity: Exclude<Rarity, 'único'>;
  extractionClass: ExtractionClass;
  basePrice: number;
  description: string;
}

export interface WeaponDef {
  id: string;
  name: string;
  damageType: WeaponDamageType;
  attackLevel: number; // 1..5
  dps: number;
  range: number;
  fireRate: number;
  color: string;
  price: number;
  rarity: Exclude<Rarity, 'único'>;
  factionStyle?: FactionTechStyle;
  speciesExclusiveId?: string;
  canBombard?: boolean;
  description: string;
}

export interface ShieldDef {
  id: string;
  name: string;
  capacity: number;
  rechargePerSec: number;
  mitigation: Record<WeaponDamageType, number>; // capped at 0.85
  reflectDamageRatio?: number;
  price: number;
  rarity: Exclude<Rarity, 'único'>;
  factionStyle?: FactionTechStyle;
  speciesExclusiveId?: string;
  description: string;
}

export interface HullDef {
  id: string;
  name: string;
  maxHull: number;
  armor: number;
  weaponSlots: number;
  defenseSlots: number;
  extractionSlots: number;
  utilitySlots: number;
  cargoCapacity: number;
  fuelCapacity: number;
  activeCrewPosts: number; // 1..8
  reserveQuarters: number; // 1..20
  speed: number;
  price: number;
  rarity: Exclude<Rarity, 'único'>;
  color?: string;
  hullShape?: 'interceptador' | 'corveta' | 'cargueiro' | 'cruzador' | 'fragata';
  factionStyle?: FactionTechStyle;
  speciesExclusiveId?: string;
  factionExclusiveId?: string;
  description: string;
}

export interface JumpDriveDef {
  id: string;
  name: string;
  jumpRangeLy: number;
  fuelEfficiency: number;
  price: number;
  rarity: Exclude<Rarity, 'único'>;
  description: string;
}

export interface ExtractorDef {
  id: string;
  name: string;
  extractionClass: ExtractionClass;
  ratePerSec: number; // 1.0, 1.5-1.6, 2.2, 2.8
  techTier: number; // 1..5
  price: number;
  rarity: Exclude<Rarity, 'único'>;
  factionStyle?: FactionTechStyle;
  speciesExclusiveId?: string;
  factionExclusiveId?: string;
  description: string;
}

export interface UtilityModuleDef {
  id: string;
  name: string;
  kind: 'carga' | 'scanner' | 'camuflagem' | 'tanque' | 'dobra';
  bonusValue: number;
  price: number;
  rarity: Exclude<Rarity, 'único'>;
  factionStyle?: FactionTechStyle;
  speciesExclusiveId?: string;
  factionExclusiveId?: string;
  description: string;
}

export interface SuitGearDef {
  id: string;
  name: string;
  category: 'protecao' | 'ferramenta' | 'drone';
  hazardType?: 'calor' | 'frio' | 'radiacao' | 'toxicidade' | 'pressao';
  explorationBonus: number;
  combatPower: number;
  price: number;
  rarity: Exclude<Rarity, 'único'>;
  factionStyle?: FactionTechStyle;
  speciesExclusiveId?: string;
  factionExclusiveId?: string;
  description: string;
}

export interface ConsumableDef {
  id: string;
  name: string;
  kind: 'combustivel' | 'reparo' | 'oxigenio' | 'escudo_desc' | 'sonda' | 'antidoto' | 'mantimentos' | 'especial_raca' | 'saude';
  amount: number;
  price: number;
  rarity?: Exclude<Rarity, 'único'>;
  speciesExclusiveId?: string;
  factionExclusiveId?: string;
  combatEffect?: {
    hullHeal?: number;
    shieldRestore?: number;
    damageAllEnemies?: number;
  };
  campaignEffect?: {
    fuelGain?: number;
    suppliesGain?: number;
    healthGain?: number;
    healthPotency?: number;
  };
  description: string;
}

export type AnyEquipmentItem =
  | { category: 'weapon'; def: WeaponDef }
  | { category: 'shield'; def: ShieldDef }
  | { category: 'jumpDrive'; def: JumpDriveDef }
  | { category: 'extractor'; def: ExtractorDef }
  | { category: 'utility'; def: UtilityModuleDef }
  | { category: 'suit'; def: SuitGearDef };

export interface BlueprintDef {
  id: string;
  targetCategory: 'hull' | 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility';
  targetId: string;
  name: string;
  price: number;
  craftCredits: number;
  requiredResources: Array<{ resourceId: string; qty: number }>;
  minPlanetLevel: number;
  speciesExclusiveId?: string;
  factionExclusiveId?: string;
  description: string;
}

export interface OriginPassiveBonuses {
  combatDpsMult: number;
  hullFlatBonus: number;
  shieldCapMult: number;
  shieldRegenMult: number;
  hullRegenPerSec: number;
  fuelCostMult: number;
  cargoFlatBonus: number;
  minerRateMult: number;
  tradePriceBonus: number;
  explorerBonus: number;
  hazardResistBonus: number;
  renownGainMult: number;
  warScoreMult: number;
  cloakBonus: number;
  supplyCostMult: number;
  fleeBonusPct: number;
}

export interface SpecialAbilityDef {
  id: string;
  name: string;
  scope: 'raca' | 'forma_vida' | 'faccao';
  ownerName: string;
  kind: 'passiva' | 'combate_ativa' | 'exploracao_passiva' | 'diplomacia_passiva';
  cooldownSec?: number;
  summary: string;
  description: string;
  healthRegenPerSec?: number;
  combatAction?: {
    damageAllEnemies?: number;
    hullHeal?: number;
    shieldRestore?: number;
    stripEnemyShieldPct?: number;
  };
}

export interface MineralDeposit {
  id: string;
  resourceId: string;
  remaining: number;
  maxAmount: number;
  hiddenUntilHighScan: boolean;
}

export interface PlanetAnomaly {
  id: string;
  title: string;
  kind: 'ruinas' | 'artefato' | 'sinal' | 'anomalia_biologica';
  description: string;
  investigated: boolean;
  rewardCredits: number;
  rewardResourceId?: string;
}

export interface HabitabilityFactors {
  score: number; // 0..100
  temperatureC: number;
  tempVariation: string;
  atmosphere: string;
  water: 'líquida' | 'gelo' | 'ausente';
  gravityG: number;
  radiationLevel: number; // 0..100
  geologicalStability: number; // 0..100
  threats: string[];
}

export interface PlanetData {
  id: string;
  systemId: string;
  index: number;
  name: string;
  typeCode: string;
  level: -1 | 0 | 1 | 2 | 3 | 4 | 5;
  isColony: boolean;
  colonyParentName?: string;
  colonyTechOverride?: 1 | 2;
  hasExtractorColony?: boolean;
  extractorColonyFactionId?: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  eccentricity?: number;
  radius: number;
  moonsCount: number;
  hasRings: boolean;
  ringColor: string;
  seed: number;
  factionId: string | null;
  speciesId: string | null;
  lifeFormId: LifeFormId | null;
  habitability: HabitabilityFactors;
  deposits: MineralDeposit[];
  creatureIds: string[];
  anomaly: PlanetAnomaly | null;
  hasShipyard: boolean;
}

export type PhenomenonKind =
  | 'nebulosa_sistema'
  | 'cometa_errante'
  | 'campo_meteoros'
  | 'destrocos_nave'
  | 'buraco_negro';

export interface SystemPhenomenon {
  id: string;
  kind: PhenomenonKind;
  name: string;
  description: string;
  position: { x: number; z: number };
  orbitRadius?: number;
  orbitSpeed?: number;
  orbitPhase?: number;
  eccentricity?: number;
  resourceId?: string;
  remaining: number;
  minTechTier: number;
  hasSurvivors?: boolean;
  lootCredits?: number;
}

export interface StarSystemSummary {
  id: string;
  seed: number;
  name: string;
  x: number;
  y: number;
  z: number;
  starType: StarType;
  starColor: string;
  starRadius: number;
  starExclusionRadius: number;
  isBlackHole: boolean;
  isSupermassive: boolean;
  inNebula: boolean;
  nebulaColor?: string;
  region: GalacticRegion;
  controllingFactionId: string | null;
  isCapital: boolean;
  conflictLevel: 1 | 2 | 3 | 4 | 5;
  hostileChancePct: number;
  nearestHostileDistLy: number;
  techLevel: 1 | 2 | 3 | 4 | 5;
  rareMultiplier: number;
  isWildSpace: boolean;
  planetCount: number;
}

export interface StarSystemFull extends StarSystemSummary {
  planets: PlanetData[];
  phenomena: SystemPhenomenon[];
  asteroidBeltRadii: number[];
}

export interface CrewMember {
  id: string;
  name: string;
  speciesId: string;
  role: CrewRole;
  skill: number; // 1..100
  hireCost: number;
  status: 'ativo' | 'reserva';
}

export interface InventoryItemRecord {
  uid: string;
  category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit';
  itemId: string;
  avgCostPaid: number;
}

export interface ResourceCargoRecord {
  resourceId: string;
  qty: number;
  avgCostPaid: number;
}

/** Estoque compartilhado da facção. Sem limite de itens. */
export interface FactionVaultState {
  gear: InventoryItemRecord[];
  resources: ResourceCargoRecord[];
  consumables: Record<string, number>;
}

export interface OwnedShip {
  uid: string;
  hullId: string;
  customName: string;
  factionId?: string;
  color?: string;
  avgCostPaid: number;
  currentHull: number;
  currentShield: number;
  weaponId: string | null;
  shieldIds: string[];
  jumpDriveId: string;
  extractorIds: string[];
  utilityIds: string[];
  suitGearIds: string[];
  depot: InventoryItemRecord[]; // max 30 items per ship
}

export type MissionType =
  | 'entrega_comercio'
  | 'coleta_raro'
  | 'escanear_planeta'
  | 'escanear_criatura'
  | 'contato_nivel2'
  | 'resgate_escolta'
  | 'combate'
  | 'cadeia_faccao';

export interface Mission {
  id: string;
  title: string;
  type: MissionType;
  issuerFactionId: string;
  targetFactionId?: string;
  targetSystemId: string;
  targetSystemName: string;
  targetSystemCoord: { x: number; y: number; z: number };
  targetPlanetId?: string;
  targetPlanetName?: string;
  requiredResourceId?: string;
  requiredResourceName?: string;
  requiredQty?: number;
  targetEnemyName?: string;
  targetEnemyScore?: number;
  targetEnemyDefeated?: boolean;
  planetScanned?: boolean;
  creatureScanned?: boolean;
  contactCompleted?: boolean;
  rescueCompleted?: boolean;
  rewardCredits: number;
  rewardRenown: number;
  rewardItemName?: string;
  rewardBlueprintId?: string;
  chainStep?: number;
  chainTotal?: number;
  isRivalTerritory: boolean;
  status: 'disponivel' | 'aceita' | 'finalizada';
  description: string;
}

export interface VisualNovelChoice {
  id: string;
  label: string;
  categoryTag?: string;
  previewHullId?: string;
  previewEquipment?: { category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit' | 'consumable' | 'blueprint'; itemId: string };
  hint?: string;
  consequenceText: string;
  effects: {
    creditsDelta?: number;
    renownDelta?: number;
    factionId?: string;
    fuelDelta?: number;
    hullDelta?: number;
    crewHealthDelta?: number;
    suppliesDelta?: number;
    giveResourceId?: string;
    giveResourceQty?: number;
    giveConsumables?: Record<string, number>;
    giveHullId?: string;
    giveEquipment?: Array<{
      category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit';
      itemId: string;
    }>;
    grantBlueprintId?: string;
    grantAbilityId?: string;
    bonusModifiers?: Partial<OriginPassiveBonuses>;
    unlockHomeSectorLicenses?: boolean;
    priceBiasDelta?: number;
    riskNote?: string;
    planetEvolve?: boolean;
    planetCollapse?: boolean;
  };
  nextNodeId?: string;
}

export interface VisualNovelNode {
  id: string;
  isOpening?: boolean;
  stepIndex?: number;
  totalSteps?: number;
  stageTitle?: string;
  stageFocusName?: string;
  accentColor?: string;
  speakerName: string;
  speakerTitle: string;
  speciesId: string;
  cardId: string;
  cardKind: 'species' | 'creature';
  lifeFormName: string;
  text: string;
  choices: VisualNovelChoice[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  category: 'viagem' | 'combate' | 'exploracao' | 'diplomacia' | 'comercio' | 'tripulacao';
  text: string;
}

export interface ActiveEnemy {
  id: string;
  name: string;
  factionId: string;
  techLevel: number;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  dps: number;
  damageType: WeaponDamageType;
  combatScore: number;
  speed?: number;
  x: number;
  z: number;
  angle: number;
  orbitDir: number;
  /** Missão de caçada que esta nave representa. Só ela conclui o contrato. */
  huntMissionId?: string;
}

export type EncounterKind = 'comercial' | 'diplomatico' | 'inimigos' | 'guerra' | 'cacada';

export interface EncounterState {
  id: string;
  factionId: string;
  enemyName: string;
  techLevel: number;
  techReason: string;
  /** Só é guerra quando essa facção está em guerra com a facção do jogador. */
  kind?: EncounterKind;
  isWarEncounter?: boolean;
  enemies: ActiveEnemy[];
  forcedCombat: boolean;
  winChancePct: number;
  tacticalRating: string;
  tradeOffer?: {
    resources: Array<{ resourceId: string; qty: number; price: number }>;
    items: Array<{ category: 'weapon' | 'shield' | 'extractor' | 'utility' | 'blueprint'; itemId: string; name: string; price: number }>;
  };
  missionOffer?: Mission;
}

export interface GalacticWarState {
  id: string;
  factionAId: string;
  factionBId: string;
  score: number; // 0..100 (100 = Lado A vence, 0 = Lado B vence)
  cyclesElapsed: number;
  capturesA: number;
  capturesB: number;
  lastDelta?: number;
  lastSummary?: string;
}

export interface WarHistoryEntry {
  id: string;
  cycle: number;
  kind: 'captura' | 'colonizacao' | 'batalha';
  text: string;
}

export interface PlayerCampaignState {
  version: number;
  started: boolean;
  playerName: string;
  chosenSpeciesId: string;
  chosenFactionId: string;
  credits: number;
  fuel: number;
  supplies: number;
  crewHealth: number;
  healthPotency: number;
  priceModifierBias: number; // cumulative VN trade bias
  currentSystemId: string;
  visitedSystemIds: string[];
  scannedSystemIds: string[];
  scannedPlanetIds: string[];
  scannedCreatureIds: string[];
  knownFactionIds: string[];
  factionRenown: Record<string, number>;
  formalAlliances: string[];
  activeWars: Record<string, string[]>;
  galacticCycle: number;
  cycleElapsedSec: number;
  galacticWars: GalacticWarState[];
  systemOwnerOverrides: Record<string, string>;
  systemExtractionLicenses: string[];
  warHistory: WarHistoryEntry[];
  planetOverrides: Record<string, { level?: number; typeCodeOverride?: string; techLevelOverride?: 1 | 2 | 3 | 4 | 5; colonizedByPlayer?: boolean; factionId?: string; lastContactAt?: number; lastDescendAt?: number; evolvedNote?: string }>;
  phenomenonCooldowns: Record<string, number>; // remaining depleted amount
  clearedHazards: string[];
  ships: OwnedShip[];
  activeShipUid: string;
  cargo: ResourceCargoRecord[];
  consumables: Record<string, number>;
  blueprintsOwned: string[];
  crew: CrewMember[];
  missions: Mission[];
  logbook: LogEntry[];
  gameTimeSeconds: number;
  playerPos: { x: number; z: number };
  orbitingPlanetId: string | null;
  openingCompleted: boolean;
  originBonuses: OriginPassiveBonuses;
  specialAbilityIds: string[];
  abilityCooldowns: Record<string, number>;
  chosenOriginSummary: Array<{ stage: string; label: string; rewardTag: string }>;
  /** 3 = casco das naves já está na escala triplicada. Saves antigos migram uma vez. */
  lifeScale?: number;
  /** Projetos já fabricados. Saem da lista de recursos que o comércio destaca. */
  craftedBlueprintIds?: string[];
  /** Sedes iniciadas que ainda esperam os recursos. */
  pendingHeadquarters?: Array<{ planetId: string; systemId: string; factionId: string }>;
  planetSales?: Record<string, Record<string, number>>;
  /** Cofre da facção. Sem limite. Cada item custa 5 créditos por ciclo galáctico. */
  factionVault?: FactionVaultState;
}
