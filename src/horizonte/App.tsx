import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  FileText,
  Gauge,
  Maximize2,
  Minimize2,
  Rocket,
  ScrollText,
  Shield,
  Skull,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  ActiveEnemy,
  CrewMember,
  EncounterState,
  LogEntry,
  Mission,
  OwnedShip,
  PlanetData,
  PlayerCampaignState,
  StarSystemFull,
  StarSystemSummary,
  SystemPhenomenon,
  VisualNovelChoice,
  VisualNovelNode,
  WeaponDamageType,
} from './types/game';
import {
  BLUEPRINTS_BY_ID,
  CONSUMABLES_BY_ID,
  EXTRACTORS_BY_ID,
  HULLS_BY_ID,
  JUMP_DRIVES_BY_ID,
  RESOURCES_BY_ID,
  SHIELDS_BY_ID,
  SUIT_GEAR_BY_ID,
  UTILITY_BY_ID,
  WEAPONS_BY_ID,
} from './data/items';
import { CREATURES_BY_ID, FACTIONS, FACTIONS_BY_ID } from './data/lifeforms';
import {
  buildLevel2ContactDialogue,
  buildOpeningVisualNovel,
  checkMissionReadyInLocation,
  getEffectivePlanetTechLevel,
  getPlanetControllingFaction,
  getPlanetCurrentLevel,
  getPlanetEffectiveTypeCode,
  destroyedWorldDeposits,
  getRenownTierName,
  getSystemHostileStatus,
  planetForRisk,
} from './data/narrative';
import { DEFAULT_ORIGIN_BONUSES, mergeOriginBonuses, SPECIAL_ABILITIES_BY_ID } from './data/originPerks';
import { generateSolarSystem, getSystemsInRadius, getSystemSummaryById, KNOWN_GALAXY_SYSTEMS } from './data/universe';
import { compartmentUsed, computeCrewBonuses, computeFleeSuccessChance, computeShipDerivedStats, crewHealthRatio, estimateEncounterWinChance, getEffectiveRoleSkill } from './engine/combat';
import { quoteSale, resourceSupplyBand } from './engine/market';
import { markDefeatedHuntMissions, planRandomEncounter } from './engine/encounters';
import {
  equipVaultGear,
  installGearOnShip,
  normalizeFactionVault,
  sendConsumableToVault,
  sendDepotGearToVault,
  sendInstalledGearToVault,
  sendResourceToVault,
  withdrawConsumableFromVault,
  withdrawGearFromVault,
  withdrawResourceFromVault,
  type VaultOp,
} from './engine/factionVault';
import {
  advanceGalacticCycle,
  applyPlayerKillToWars,
  computeEnemyCombatTechLevel,
  GALACTIC_CYCLE_DURATION_SEC,
  getEffectiveSystemSummary,
  WILD_SYSTEM_SENTINEL,
} from './engine/galacticWar';
import {
  evaluatePlanetConditionRisk,
  getSystemExtractionLicenseStatus,
  HEADQUARTERS_COST,
} from './engine/planetaryActions';
import { soundEngine } from './engine/audio';
import {
  clearSavedCampaign,
  createStarterCampaign,
  loadSavedCampaign,
  saveCampaign,
} from './engine/save';
import { StartScreen } from './components/StartScreen';
import { TutorialOverlay } from './components/TutorialOverlay';
import { VisualNovelOverlay } from './components/VisualNovelOverlay';
import { SolarSystemViewport } from './components/SolarSystemViewport';
import { GalacticMapViewport } from './components/GalacticMapViewport';
import { PlanetPanel } from './components/PlanetPanel';
import { ShipAndCrewPanel } from './components/ShipAndCrewPanel';
import { MissionsAndCodexPanel, MissionCornerHud } from './components/MissionsAndCodexPanel';
import { GalacticWarPanel } from './components/GalacticWarPanel';
import { EncounterModal } from './components/EncounterModal';
import { CombatPanel, type FleeState } from './components/CombatPanel';
import { HyperspaceWarpOverlay } from './components/HyperspaceWarpOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getLevelStyle } from './utils/formatting';
import {
  enterGameFullscreen,
  exitGameFullscreen,
  isDocumentFullscreen,
} from './utils/fullscreen';

type RightDrawerMode =
  | { kind: 'none' }
  | { kind: 'planet'; planetId: string }
  | { kind: 'phenomenon'; phenomenonId: string }
  | { kind: 'ship' }
  | { kind: 'missions' }
  | { kind: 'codex' }
  | { kind: 'logbook' }
  | { kind: 'war' }
  | { kind: 'combat' };

interface MiningSession {
  planetId: string;
  depositId: string;
  resourceId: string;
  ratePerSec: number;
  progress: number;
  /** Pouso na superfície (mesma animação do comércio). Extração só começa depois do pouso. */
  surface?: boolean;
  warmup: number;
}

function makeLog(category: LogEntry['category'], text: string, timestamp: number): LogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    category,
    text,
  };
}

function addCargoItem(
  cargo: PlayerCampaignState['cargo'],
  resourceId: string,
  qty: number,
  unitPricePaid: number,
  maxCapacity: number,
  state?: PlayerCampaignState
): { nextCargo: PlayerCampaignState['cargo']; added: number } {
  const currentTotal = cargo.reduce((s, c) => s + c.qty, 0);
  const room = state ? resourceCapacity(state, maxCapacity) : maxCapacity;
  const space = Math.max(0, room - currentTotal);
  const actualAdd = Math.min(qty, space);
  if (actualAdd <= 0) return { nextCargo: cargo, added: 0 };

  const existing = cargo.find((c) => c.resourceId === resourceId);
  if (existing) {
    const newQty = existing.qty + actualAdd;
    const weightedAvg =
      (existing.avgCostPaid * existing.qty + unitPricePaid * actualAdd) / Math.max(1, newQty);
    return {
      nextCargo: cargo.map((c) =>
        c.resourceId === resourceId ? { ...c, qty: newQty, avgCostPaid: weightedAvg } : c
      ),
      added: actualAdd,
    };
  }
  return {
    nextCargo: [...cargo, { resourceId, qty: actualAdd, avgCostPaid: unitPricePaid }],
    added: actualAdd,
  };
}

function resourceCapacity(state: PlayerCampaignState, cargoCapacity: number): number {
  const ship = state.ships.find((entry) => entry.uid === state.activeShipUid) ?? state.ships[0];
  const reserved = compartmentUsed(state, ship) - state.cargo.reduce((sum, entry) => sum + entry.qty, 0);
  return Math.max(0, cargoCapacity - reserved);
}

function removeCargoItem(
  cargo: PlayerCampaignState['cargo'],
  resourceId: string,
  qty: number
): PlayerCampaignState['cargo'] {
  return cargo
    .map((c) => (c.resourceId === resourceId ? { ...c, qty: c.qty - qty } : c))
    .filter((c) => c.qty > 0);
}

function storeInCompartment(
  ship: OwnedShip,
  category: OwnedShip['depot'][number]['category'],
  itemId: string,
  paidPrice: number
): OwnedShip {
  return {
    ...ship,
    depot: [
      ...ship.depot,
      {
        uid: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category,
        itemId,
        avgCostPaid: paidPrice,
      },
    ],
  };
}

function buildEnemyWave(
  factionId: string,
  count: number,
  techLevel: number,
  playerPos: { x: number; z: number },
  namePrefix = 'Interceptador'
): ActiveEnemy[] {
  const dmgTypes: WeaponDamageType[] = ['laser', 'cinetica', 'plasma', 'missil'];
  const clampedTech = Math.max(1, Math.min(5, Math.round(techLevel)));
  const baseHull = (36 + clampedTech * 24) * 3;
  const baseShield = (12 + clampedTech * 22) * 3;
  const baseDps = 5 + clampedTech * 4.5;
  const baseScore = 45 + clampedTech * 38;

  return Array.from({ length: count }, (_, i) => {
    const a = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 24 + i * 5;
    return {
      id: `en_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${namePrefix} ${i + 1}`,
      factionId,
      techLevel: clampedTech,
      hull: baseHull,
      maxHull: baseHull,
      shield: baseShield,
      maxShield: baseShield,
      dps: baseDps,
      damageType: dmgTypes[(clampedTech + i) % dmgTypes.length],
      combatScore: baseScore,
      x: playerPos.x + Math.cos(a) * dist,
      z: playerPos.z + Math.sin(a) * dist,
      angle: a,
      orbitDir: i % 2 === 0 ? 1 : -1,
    };
  });
}

export default function App() {
  const existingSave = useMemo(() => loadSavedCampaign(), []);
  const [campaign, setCampaign] = useState<PlayerCampaignState | null>(null);
  const [drawer, setDrawer] = useState<RightDrawerMode>({ kind: 'none' });
  const [showGalacticMap, setShowGalacticMap] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [timeScale, setTimeScale] = useState<1 | 2 | 4>(1);
  const [muted, setMuted] = useState(false);
  const [warpTransition, setWarpTransition] = useState<{
    targetName: string;
    shipColor: string;
    factionColor?: string;
    factionName?: string;
  } | null>(null);
  const warpTimerRef = useRef<number | null>(null);
  const warpTransitionRef = useRef(warpTransition);
  warpTransitionRef.current = warpTransition;

  const [vnNodes, setVnNodes] = useState<VisualNovelNode[] | null>(null);
  const [vnIndex, setVnIndex] = useState(0);

  const [travelTargetPlanetId, setTravelTargetPlanetId] = useState<string | null>(null);
  const [travelTargetPhenomenonId, setTravelTargetPhenomenonId] = useState<string | null>(null);
  const [atPhenomenonId, setAtPhenomenonId] = useState<string | null>(null);
  const [mining, setMining] = useState<MiningSession | null>(null);
  const [activeEnemies, setActiveEnemies] = useState<ActiveEnemy[]>([]);
  const [fleeState, setFleeState] = useState<FleeState | null>(null);
  const fleeRef = useRef<FleeState | null>(null);
  fleeRef.current = fleeState;
  const [pendingEncounter, setPendingEncounter] = useState<EncounterState | null>(null);
  const [hostileCountdown, setHostileCountdown] = useState<number | null>(null);
  const [hostileWaveCooldown, setHostileWaveCooldown] = useState<number>(0);
  const [depletedDeposits, setDepletedDeposits] = useState<Record<string, number>>({});
  const [hullDestroyedModal, setHullDestroyedModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [landingPulse, setLandingPulse] = useState<{ planetId: string; nonce: number } | null>(null);
  const [activePlanetTab, setActivePlanetTab] = useState<string>('depositos');
  const [planetsHudOpen, setPlanetsHudOpen] = useState(true);
  const [missionsHudOpen, setMissionsHudOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(() => isDocumentFullscreen());

  useEffect(() => {
    return () => {
      if (warpTimerRef.current) window.clearTimeout(warpTimerRef.current);
    };
  }, []);

  const triggerLandingPulse = useCallback((planetId: string) => {
    setLandingPulse((prev) => ({ planetId, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    const syncFs = () => setIsFullscreen(isDocumentFullscreen());
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
    };
  }, []);

  const toastTimerRef = useRef<number | null>(null);
  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 5500);
  }, []);

  // Auto-save throttled to avoid main-thread JSON serialization stutters during 60fps orbital rendering
  const lastSaveAtRef = useRef(0);
  useEffect(() => {
    if (!campaign) return;
    const now = Date.now();
    if (now - lastSaveAtRef.current >= 4000) {
      lastSaveAtRef.current = now;
      saveCampaign(campaign);
    }
  }, [campaign]);

  useEffect(() => {
    const onUnload = () => {
      if (campaignRef.current) saveCampaign(campaignRef.current);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  useEffect(() => {
    if (campaign && !campaign.openingCompleted && !vnNodes) {
      const nodes = buildOpeningVisualNovel(
        campaign.chosenSpeciesId,
        campaign.chosenFactionId,
        campaign.playerName
      );
      setVnNodes(nodes);
      const doneSteps = campaign.chosenOriginSummary?.length ?? 0;
      setVnIndex(Math.min(Math.max(0, doneSteps), Math.max(0, nodes.length - 1)));
    }
  }, [campaign, vnNodes]);

  const currentSystemSummary = useMemo(() => {
    if (!campaign) return null;
    const raw = getSystemSummaryById(campaign.currentSystemId);
    return raw ? getEffectiveSystemSummary(raw, campaign) : null;
  }, [campaign?.currentSystemId, campaign?.systemOwnerOverrides]);

  const planetOverrides = campaign?.planetOverrides;
  const currentSystem = useMemo(() => {
    if (!currentSystemSummary) return null;
    const full = generateSolarSystem(currentSystemSummary);
    const overrides = planetOverrides ?? {};
    return {
      ...full,
      planets: full.planets.map((pl) => {
        const level = overrides[pl.id]?.level ?? pl.level;
        const base = level === -1 ? destroyedWorldDeposits(pl) : pl.deposits;
        if (level !== -1 && Object.keys(depletedDeposits).length === 0) return pl;
        return {
          ...pl,
          deposits: base.map((dep) => ({
            ...dep,
            remaining: depletedDeposits[dep.id] !== undefined ? depletedDeposits[dep.id] : dep.remaining,
          })),
        };
      }),
    };
  }, [currentSystemSummary, depletedDeposits, planetOverrides]);

  const bonuses = useMemo(
    () => (campaign ? computeCrewBonuses(campaign) : null),
    [campaign]
  );

  const activeShip = useMemo(() => {
    if (!campaign) return null;
    return campaign.ships.find((s) => s.uid === campaign.activeShipUid) ?? campaign.ships[0];
  }, [campaign]);

  const shipStats = useMemo(() => {
    if (!activeShip || !bonuses) return null;
    return computeShipDerivedStats(activeShip, bonuses);
  }, [activeShip, bonuses]);

  const combatMissionTarget = useMemo(() => {
    if (!campaign || !currentSystem) return null;
    return (
      campaign.missions.find(
        (m) =>
          m.status === 'aceita' &&
          m.type === 'combate' &&
          m.targetSystemId === currentSystem.id &&
          !m.targetEnemyDefeated
      ) ?? null
    );
  }, [campaign, currentSystem]);

  const prevInCombatRef = useRef(false);
  useEffect(() => {
    const inCombat = activeEnemies.length > 0;
    if (inCombat && !prevInCombatRef.current) {
      setDrawer({ kind: 'combat' });
    } else if (!inCombat && prevInCombatRef.current) {
      setFleeState(null);
      setDrawer((d) => (d.kind === 'combat' ? { kind: 'none' } : d));
    }
    prevInCombatRef.current = inCombat;
  }, [activeEnemies.length]);

  const fleePreview = useMemo(() => {
    if (!activeShip || !bonuses) {
      return { chancePct: 35, speedFactor: 0, cloakFactor: 0, racePilotBonus: 0, threatPenalty: 0 };
    }
    return computeFleeSuccessChance(activeShip, bonuses, activeEnemies);
  }, [activeShip, bonuses, activeEnemies]);

  const handleStartFlee = useCallback(() => {
    if (!activeShip || !bonuses || activeEnemies.length === 0 || fleeRef.current?.active) return;
    const preview = computeFleeSuccessChance(activeShip, bonuses, activeEnemies);
    soundEngine.playClick();
    setFleeState({
      active: true,
      elapsedSec: 0,
      durationSec: 5,
      chancePct: preview.chancePct,
    });
    notify('Manobra de fuga iniciada! Desviando entre planetas e asteroides por 5s...');
  }, [activeShip, bonuses, activeEnemies, notify]);

  // Keep refs for real-time interval loop
  const campaignRef = useRef(campaign);
  campaignRef.current = campaign;
  const miningRef = useRef(mining);
  miningRef.current = mining;
  const enemiesRef = useRef(activeEnemies);
  enemiesRef.current = activeEnemies;
  const currentSystemRef = useRef(currentSystem);
  currentSystemRef.current = currentSystem;
  const shipStatsRef = useRef(shipStats);
  shipStatsRef.current = shipStats;
  const bonusesRef = useRef(bonuses);
  bonusesRef.current = bonuses;
  const showGalacticMapRef = useRef(showGalacticMap);
  showGalacticMapRef.current = showGalacticMap;
  const inSystemEncounterTimerRef = useRef(18);

  const spawnRandomEncounter = useCallback(
    (
      sysSummary: StarSystemSummary,
      fullSys: StarSystemFull,
      curCampaign: PlayerCampaignState,
      pos: { x: number; z: number }
    ) => {
      if (sysSummary.isBlackHole) return;
      const ship = curCampaign.ships.find((s) => s.uid === curCampaign.activeShipUid) ?? curCampaign.ships[0];
      const bon = computeCrewBonuses(curCampaign);
      const effectiveSys = getEffectiveSystemSummary(sysSummary, curCampaign);
      const ownerId = effectiveSys.controllingFactionId;
      const plan = planRandomEncounter(curCampaign, effectiveSys.id, ownerId);
      const attackerFacId = plan.factionId;
      const isWarEncounter = plan.kind === 'guerra';
      const forced = plan.kind === 'guerra' || plan.kind === 'inimigos' || plan.kind === 'cacada';

      const techInfo = computeEnemyCombatTechLevel(attackerFacId, effectiveSys, fullSys, curCampaign);
      const enemyCount =
        plan.kind === 'cacada'
          ? 1
          : (plan.kind === 'guerra' || plan.kind === 'inimigos') &&
              effectiveSys.conflictLevel >= 4 &&
              Math.random() < 0.45
            ? 2
            : 1;
      const namePrefix =
        plan.kind === 'cacada'
          ? (plan.huntMission?.targetEnemyName ?? 'Alvo da Missão')
          : plan.kind === 'guerra'
            ? 'Incursor de Guerra'
            : plan.kind === 'inimigos'
              ? 'Interceptador Hostil'
              : plan.kind === 'diplomatico'
                ? 'Nave Diplomática'
                : 'Cargueiro';
      const enemies = buildEnemyWave(attackerFacId, enemyCount, techInfo.techLevel, pos, namePrefix).map((enemy, index) => {
        if (plan.kind !== 'cacada' || !plan.huntMission) return enemy;
        return {
          ...enemy,
          name: index === 0 ? (plan.huntMission.targetEnemyName ?? enemy.name) : enemy.name,
          huntMissionId: plan.huntMission.id,
        };
      });
      const est = estimateEncounterWinChance(ship, bon, enemies);
      const fac = FACTIONS_BY_ID[attackerFacId];

      const allRes = Object.values(RESOURCES_BY_ID);
      const seedMix = effectiveSys.seed + Math.floor(curCampaign.gameTimeSeconds);
      const pick3 = [0, 1, 2].map((idx) => {
        const res = allRes[(seedMix + idx * 7) % allRes.length];
        return {
          resourceId: res.id,
          qty: 3 + ((seedMix + idx) % 6),
          price: Math.max(4, Math.round(res.basePrice * (0.85 + idx * 0.12))),
        };
      });

      const missionOffer: Mission | undefined =
        plan.kind === 'diplomatico' && fullSys.planets.length > 0
          ? {
              id: `enc_mis_${Date.now()}`,
              title: `Contrato: ${RESOURCES_BY_ID[pick3[0].resourceId].name}`,
              type: 'entrega_comercio',
              issuerFactionId: attackerFacId,
              targetSystemId: effectiveSys.id,
              targetSystemName: effectiveSys.name,
              targetSystemCoord: { x: effectiveSys.x, y: effectiveSys.y, z: effectiveSys.z },
              targetPlanetId: fullSys.planets[0].id,
              targetPlanetName: fullSys.planets[0].name,
              requiredResourceId: pick3[0].resourceId,
              requiredResourceName: RESOURCES_BY_ID[pick3[0].resourceId].name,
              requiredQty: 4,
              rewardCredits: 420 + techInfo.techLevel * 140,
              rewardRenown: 14,
              isRivalTerritory: false,
              status: 'disponivel',
              description: `Entregar 4 unidades de ${RESOURCES_BY_ID[pick3[0].resourceId].name} em órbita de ${fullSys.planets[0].name}.`,
            }
          : undefined;

      const encounterTitle =
        plan.kind === 'comercial'
          ? `Comboio Comercial · ${fac?.name ?? 'Independente'}`
          : plan.kind === 'diplomatico'
            ? `Envio Diplomático · ${fac?.name ?? 'Independente'}`
            : plan.kind === 'inimigos'
              ? `Esquadra Hostil · ${fac?.name ?? 'Desconhecida'}`
              : plan.kind === 'guerra'
                ? `Frota de Guerra · ${fac?.name ?? 'Desconhecida'}`
                : `Caçada · ${plan.huntMission?.targetEnemyName ?? fac?.name ?? 'Alvo'}`;

      soundEngine.playAlert();
      setTravelTargetPlanetId(null);
      setPendingEncounter({
        id: `enc_${Date.now()}`,
        factionId: attackerFacId,
        enemyName: encounterTitle,
        techLevel: techInfo.techLevel,
        techReason: techInfo.reason,
        kind: plan.kind,
        isWarEncounter,
        enemies,
        forcedCombat: forced,
        winChancePct: est.winChancePct,
        tacticalRating: est.tacticalRating,
        tradeOffer: plan.kind === 'comercial' ? { resources: pick3, items: [] } : undefined,
        missionOffer,
      });
    },
    []
  );

  // Start / Continue handlers (enter fullscreen + landscape lock on mobile synchronously inside click)
  const handleStartNewGame = (speciesId: string, factionId: string, playerName: string) => {
    enterGameFullscreen(true);
    soundEngine.playClick();
    const fresh = createStarterCampaign(speciesId, factionId, playerName);
    setCampaign(fresh);
    setActiveEnemies([]);
    setPendingEncounter(null);
    setHullDestroyedModal(false);
    setMining(null);
    setTravelTargetPlanetId(null);
    setTravelTargetPhenomenonId(null);
    setAtPhenomenonId(null);
    setDrawer({ kind: 'none' });
    setVnNodes(buildOpeningVisualNovel(speciesId, factionId, fresh.playerName));
    setVnIndex(0);
  };

  const handleContinueSave = () => {
    if (!existingSave) return;
    enterGameFullscreen(true);
    soundEngine.playClick();
    setCampaign(existingSave);
    setActiveEnemies([]);
    setPendingEncounter(null);
    setHullDestroyedModal(false);
    setTravelTargetPlanetId(null);
    setTravelTargetPhenomenonId(null);
    setAtPhenomenonId(null);
    if (!existingSave.openingCompleted) {
      const nodes = buildOpeningVisualNovel(
        existingSave.chosenSpeciesId,
        existingSave.chosenFactionId,
        existingSave.playerName
      );
      setVnNodes(nodes);
      const doneSteps = existingSave.chosenOriginSummary?.length ?? 0;
      setVnIndex(Math.min(Math.max(0, doneSteps), Math.max(0, nodes.length - 1)));
    } else {
      setVnNodes(null);
    }
  };

  // Visual Novel choice application
  const handleVnChoice = (choice: VisualNovelChoice) => {
    soundEngine.playClick();
    const eff = choice.effects;
    const currentNode = vnNodes ? vnNodes[vnIndex] : null;
    const isOpeningNode = Boolean(currentNode?.isOpening);
    const isFinalOpeningStep = Boolean(isOpeningNode && !choice.nextNodeId);

    setCampaign((prev) => {
      if (!prev) return prev;
      let next: PlayerCampaignState = {
        ...prev,
        originBonuses: prev.originBonuses ?? { ...DEFAULT_ORIGIN_BONUSES },
        specialAbilityIds: [...(prev.specialAbilityIds ?? [])],
        abilityCooldowns: { ...(prev.abilityCooldowns ?? {}) },
        chosenOriginSummary: [...(prev.chosenOriginSummary ?? [])],
      };

      // 1. Apply fixed area bonus modifiers
      if (eff.bonusModifiers) {
        next.originBonuses = mergeOriginBonuses(next.originBonuses, eff.bonusModifiers);
        if (eff.bonusModifiers.hullFlatBonus) {
          next.ships = next.ships.map((s) =>
            s.uid === next.activeShipUid
              ? { ...s, currentHull: s.currentHull + eff.bonusModifiers!.hullFlatBonus! }
              : s
          );
        }
      }

      // 2. Grant special ability
      if (eff.grantAbilityId && !next.specialAbilityIds.includes(eff.grantAbilityId)) {
        next.specialAbilityIds.push(eff.grantAbilityId);
      }

      // 3. Grant race/faction blueprint
      if (eff.grantBlueprintId && !next.blueprintsOwned.includes(eff.grantBlueprintId)) {
        next.blueprintsOwned = [...next.blueprintsOwned, eff.grantBlueprintId];
      }

      // 4. Grant home species sector licenses
      if (eff.unlockHomeSectorLicenses) {
        const homeSpeciesId = next.chosenSpeciesId;
        const speciesFacIds = new Set(
          FACTIONS.filter((f) => f.speciesId === homeSpeciesId).map((f) => f.id)
        );
        const licenseIds = new Set(next.systemExtractionLicenses);
        for (const sys of KNOWN_GALAXY_SYSTEMS) {
          const effOwner = next.systemOwnerOverrides[sys.id] ?? sys.controllingFactionId;
          if (effOwner && speciesFacIds.has(effOwner)) {
            licenseIds.add(sys.id);
          }
        }
        next.systemExtractionLicenses = Array.from(licenseIds);
      }

      // 5. Grant race special hull (upgrade starter shuttle or add to fleet)
      if (eff.giveHullId && HULLS_BY_ID[eff.giveHullId]) {
        const newHull = HULLS_BY_ID[eff.giveHullId];
        const shipFactionId = newHull.factionExclusiveId ?? next.chosenFactionId;
        const shipColor = FACTIONS_BY_ID[shipFactionId]?.color ?? '#38bdf8';
        const curActive = next.ships.find((s) => s.uid === next.activeShipUid) ?? next.ships[0];
        const boostedMaxHull = Math.round(newHull.maxHull + (next.originBonuses.hullFlatBonus ?? 0));
        if (curActive && curActive.hullId === 'balsa_estelar_civil') {
          next.ships = next.ships.map((s) =>
            s.uid === curActive.uid
              ? {
                  ...s,
                  hullId: newHull.id,
                  customName: newHull.name,
                  factionId: shipFactionId,
                  color: shipColor,
                  avgCostPaid: newHull.price,
                  currentHull: boostedMaxHull,
                }
              : s
          );
        } else {
          const giftedShip: OwnedShip = {
            uid: `ship_origin_${Date.now()}`,
            hullId: newHull.id,
            customName: newHull.name,
            factionId: shipFactionId,
            color: shipColor,
            avgCostPaid: newHull.price,
            currentHull: boostedMaxHull,
            currentShield: 0,
            weaponId: 'laser_civil_mk1',
            shieldIds: [],
            jumpDriveId: 'motor_curto_mk1',
            extractorIds: ['broca_mineral_basica'],
            utilityIds: [],
            suitGearIds: [],
            depot: [],
          };
          next.ships = [...next.ships, giftedShip];
          next.activeShipUid = giftedShip.uid;
        }
      }

      // 6. Grant & auto-equip exclusive technology equipment
      if (eff.giveEquipment && eff.giveEquipment.length > 0) {
        for (const eq of eff.giveEquipment) {
          const curShip = next.ships.find((s) => s.uid === next.activeShipUid) ?? next.ships[0];
          const updated = storeInCompartment(curShip, eq.category, eq.itemId, 0);
          if (updated) {
            next.ships = next.ships.map((s) => (s.uid === curShip.uid ? updated : s));
          }
        }
      }

      const ship = next.ships.find((s) => s.uid === next.activeShipUid) ?? next.ships[0];
      const st = computeShipDerivedStats(ship, computeCrewBonuses(next));

      if (eff.creditsDelta) next.credits = Math.max(0, next.credits + eff.creditsDelta);
      if (eff.fuelDelta) next.fuel = Math.min(st.fuelCapacity, Math.max(0, next.fuel + eff.fuelDelta));
      if (eff.suppliesDelta) next.supplies = Math.max(0, next.supplies + eff.suppliesDelta);
      if (eff.priceBiasDelta) next.priceModifierBias += eff.priceBiasDelta;
      if (eff.hullDelta && eff.hullDelta > 0) {
        next.ships = next.ships.map((s) =>
          s.uid === ship.uid
            ? { ...s, currentHull: Math.max(1, Math.min(st.maxHull, s.currentHull + eff.hullDelta!)) }
            : s
        );
      }
      const narrativeCrewHit = (eff.crewHealthDelta ?? 0) + (eff.hullDelta && eff.hullDelta < 0 ? eff.hullDelta : 0);
      if (narrativeCrewHit !== 0) {
        const maxHealth = 100 + Math.max(0, next.healthPotency ?? 0);
        next.crewHealth = Math.max(0, Math.min(maxHealth, (next.crewHealth ?? 100) + narrativeCrewHit));
      }
      if (eff.renownDelta) {
        const targetFac = eff.factionId ?? next.chosenFactionId;
        next.factionRenown = {
          ...next.factionRenown,
          [targetFac]: (next.factionRenown[targetFac] ?? 0) + eff.renownDelta,
        };
      }
      if (eff.giveResourceId && eff.giveResourceQty) {
        const res = addCargoItem(next.cargo, eff.giveResourceId, eff.giveResourceQty, 0, st.cargoCapacity, next);
        next.cargo = res.nextCargo;
      }
      if (eff.giveConsumables) {
        const nextConsumables = { ...next.consumables };
        for (const [cid, qty] of Object.entries(eff.giveConsumables)) {
          nextConsumables[cid] = (nextConsumables[cid] ?? 0) + qty;
        }
        next.consumables = nextConsumables;
      }

      // Clamp currentHull to computed maxHull (in case bonuses changed cap)
      next.ships = next.ships.map((s) =>
        s.uid === ship.uid ? { ...s, currentHull: Math.min(st.maxHull, s.currentHull) } : s
      );

      // Level-2 contact planet evolution or collapse
      if (currentNode?.id.startsWith('contact_')) {
        const pId = currentNode.id.replace('contact_', '');
        const existingOv = next.planetOverrides[pId] ?? {};
        next.planetOverrides = {
          ...next.planetOverrides,
          [pId]: {
            ...existingOv,
            lastContactAt: next.gameTimeSeconds,
            level: eff.planetEvolve ? 3 : eff.planetCollapse ? 1 : existingOv.level,
            evolvedNote: eff.planetEvolve
              ? 'Evoluído para Nível 3 após cooperação pacífica'
              : eff.planetCollapse
              ? 'Colapso ecológico após extração intensiva'
              : existingOv.evolvedNote,
          },
        };
        next.missions = next.missions.map((m) =>
          m.status === 'aceita' &&
          m.type === 'contato_nivel2' &&
          (m.targetPlanetId === pId || m.targetSystemId === next.currentSystemId)
            ? { ...m, contactCompleted: true }
            : m
        );
      }

      if (isOpeningNode) {
        next.chosenOriginSummary.push({
          stage: currentNode?.stageTitle ?? 'Origem',
          label: choice.label,
          rewardTag: choice.categoryTag ?? 'Bônus',
        });
        if (isFinalOpeningStep) {
          next.openingCompleted = true;
        }
      }

      next.logbook = [...next.logbook, makeLog('diplomacia', choice.consequenceText, next.gameTimeSeconds)];
      if (isFinalOpeningStep) {
        saveCampaign(next);
      }
      return next;
    });

    if (!isOpeningNode || isFinalOpeningStep) {
      notify(isFinalOpeningStep ? `Preparação completa! ${choice.consequenceText}` : choice.consequenceText);
    }

    if (vnNodes && choice.nextNodeId) {
      const idx = vnNodes.findIndex((n) => n.id === choice.nextNodeId);
      if (idx >= 0) {
        setVnIndex(idx);
        return;
      }
    }
    if (vnNodes && vnIndex + 1 < vnNodes.length && choice.nextNodeId !== undefined) {
      setVnIndex(vnIndex + 1);
      return;
    }
    setVnNodes(null);
  };

  // Real-Time Simulation Loop (Supplies, Shield/Hull Regen, Mining, Hostile Orbit Countdown, Flee)
  useEffect(() => {
    const id = window.setInterval(() => {
      const c = campaignRef.current;
      const sys = currentSystemRef.current;
      const st = shipStatsRef.current;
      const bon = bonusesRef.current;
      if (!c || !sys || !st || !bon || hullDestroyedModal || vnNodes || pendingEncounter || warpTransitionRef.current) return;

      const dt = 0.25 * timeScale;
      const inOrbit = Boolean(c.orbitingPlanetId);
      const inCombat = enemiesRef.current.length > 0;

      // 0. 5-second Evasive Flee Countdown (real wall-clock 5s)
      const activeFlee = fleeRef.current;
      if (inCombat && activeFlee?.active) {
        const nextElapsed = activeFlee.elapsedSec + 0.25;
        if (nextElapsed >= activeFlee.durationSec) {
          const escaped = Math.random() * 100 < activeFlee.chancePct;
          setFleeState(null);
          if (escaped) {
            setActiveEnemies([]);
            setHostileCountdown(null);
            soundEngine.playWarp();
            notify('Fuga bem-sucedida! Você escapou dos perseguidores entre planetas e asteroides.');
            setCampaign((prev) =>
              prev
                ? {
                    ...prev,
                    logbook: [
                      ...prev.logbook,
                      makeLog(
                        'combate',
                        `Manobra evasiva bem-sucedida em ${sys.name}: inimigos despistados (${activeFlee.chancePct}%).`,
                        prev.gameTimeSeconds
                      ),
                    ],
                  }
                : prev
            );
          } else {
            soundEngine.playAlert();
            notify('Fuga falhou! Os inimigos cortaram a rota — o combate continua!');
          }
        } else {
          setFleeState({ ...activeFlee, elapsedSec: nextElapsed });
        }
      } else if (!inCombat && activeFlee) {
        setFleeState(null);
      }

      // 1. Mining progress tick (Orbital Atmospheric Extraction)
      const mine = miningRef.current;
      let minedUnits = 0;
      let minedResourceId = '';
      let minedDepositId = '';
      let stopMineReason: string | null = null;
      let atmosphericRiskDamage = 0;
      let atmosphericRiskRenownPenalty = 0;
      let atmosphericRiskFactionId: string | null = null;
      let atmosphericRevealPlanetId: string | null = null;
      let surfaceCrewDamage = 0;

      if (mine) {
        if (!inOrbit || c.orbitingPlanetId !== mine.planetId) {
          stopMineReason = 'Extração interrompida ao deixar a órbita.';
        } else if (inCombat) {
          stopMineReason = 'Extração interrompida durante combate!';
        } else {
          const planet = sys.planets.find((p) => p.id === mine.planetId);
          if ((mine.warmup ?? 0) > 0) {
            setMining({ ...mine, warmup: Math.max(0, (mine.warmup ?? 0) - dt) });
          } else {
          const dep = planet?.deposits.find((d) => d.id === mine.depositId);
          const holdUsed = compartmentUsed(c, c.ships.find((s) => s.uid === c.activeShipUid) ?? c.ships[0]);
          if (!dep || dep.remaining <= 0) {
            stopMineReason = 'Reserva esgotada. A nave volta à órbita.';
          } else if (holdUsed >= st.cargoCapacity) {
            stopMineReason = 'O compartimento de carga está cheio. A extração para e a nave volta à órbita.';
          } else {
            const newProgress = mine.progress + mine.ratePerSec * dt;
            const whole = Math.floor(newProgress);
            if (whole >= 1) {
              const canTake = Math.min(whole, dep.remaining, st.cargoCapacity - holdUsed);
              minedUnits = canTake;
              minedResourceId = mine.resourceId;
              minedDepositId = mine.depositId;
              soundEngine.playMiningPulse();
              const depositLeft = (dep.remaining ?? 0) - canTake;
              const cargoAfter = holdUsed + canTake;
              if (depositLeft <= 0) {
                stopMineReason = 'Reserva esgotada. A nave volta à órbita.';
              } else if (cargoAfter >= st.cargoCapacity) {
                stopMineReason = 'O compartimento de carga está cheio. A extração para e a nave volta à órbita.';
              } else {
                setMining({ ...mine, progress: newProgress - whole, warmup: 0 });
              }

              if (planet) {
                const orbLevel = getPlanetCurrentLevel(planet, c);
                if (orbLevel === 2 && !mine.surface) {
                  if (Math.random() < 0.12) {
                    atmosphericRevealPlanetId = planet.id;
                    stopMineReason = `Extração atmosférica avistada! Civilização de ${planet.name} evoluiu para Nível 3 (baixa tecnologia).`;
                  }
                } else if (orbLevel >= 3 && !mine.surface) {
                  const lic = getSystemExtractionLicenseStatus(sys, orbLevel, c);
                  if (!lic.licensed && Math.random() < 0.18) {
                    const shipObj = c.ships.find((s) => s.uid === c.activeShipUid) ?? c.ships[0];
                    const cond = evaluatePlanetConditionRisk(
                      planetForRisk(planet, c),
                      shipObj.suitGearIds,
                      bon.explorerBonus,
                      bon.hazardResistBonus
                    );
                    atmosphericRiskDamage = Math.round((8 + orbLevel * 2) * cond.damageMult);
                    atmosphericRiskRenownPenalty = -3;
                    atmosphericRiskFactionId = getPlanetControllingFaction(planet, c) ?? sys.controllingFactionId;
                  }
                } else if (mine.surface && orbLevel >= 2 && Math.random() < 0.08) {
                  const shipObj = c.ships.find((s) => s.uid === c.activeShipUid) ?? c.ships[0];
                  const cond = evaluatePlanetConditionRisk(
                    planetForRisk(planet, c),
                    shipObj.suitGearIds,
                    bon.explorerBonus,
                    bon.hazardResistBonus
                  );
                  surfaceCrewDamage = Math.round((6 + orbLevel) * cond.damageMult);
                  if (orbLevel === 2) atmosphericRevealPlanetId = planet.id;
                }
              }
            } else {
              setMining({ ...mine, progress: newProgress, warmup: 0 });
            }
          }
          }
        }
        if (stopMineReason) {
          setMining(null);
          notify(stopMineReason);
        }
      }

      // 2. Hostile Orbit Intrusion Check (Section 16.3)
      if (inOrbit && c.orbitingPlanetId) {
        const orbPlanet = sys.planets.find((p) => p.id === c.orbitingPlanetId);
        const orbLevel = orbPlanet ? getPlanetCurrentLevel(orbPlanet, c) : 0;
        const orbFacId = orbPlanet ? getPlanetControllingFaction(orbPlanet, c) : null;
        const isAtWar = Boolean(
          orbFacId &&
            orbFacId !== c.chosenFactionId &&
            ((c.activeWars[c.chosenFactionId] ?? []).includes(orbFacId) ||
              (c.activeWars[orbFacId] ?? []).includes(c.chosenFactionId))
        );
        const isHostile =
          orbLevel >= 3 &&
          orbFacId &&
          ((c.factionRenown[orbFacId] ?? 0) <= -30 || isAtWar);

        if (isHostile && orbFacId) {
          if (hostileCountdown === null && !inCombat) {
            setHostileCountdown(10);
            soundEngine.playAlert();
          } else if (hostileCountdown !== null && hostileCountdown > 0) {
            const nextCd = Math.max(0, hostileCountdown - 0.25);
            setHostileCountdown(nextCd);
            if (nextCd === 0) {
              const count = orbLevel >= 4 ? 3 : 2;
              const defenseTech = computeEnemyCombatTechLevel(orbFacId, sys, sys, c).techLevel;
              const wave = buildEnemyWave(orbFacId, count, defenseTech, c.playerPos, 'Patrulha de Defesa');
              setActiveEnemies((prev) => [...prev, ...wave]);
              setHostileWaveCooldown(orbLevel >= 4 ? 30 : 60);
              setHostileCountdown(0);
              soundEngine.playAlert();
              notify(`Intrusão detectada. ${count} naves hostis de nível ${defenseTech} decolaram de ${orbPlanet?.name}.`);
            }
          } else if (hostileCountdown === 0) {
            setHostileWaveCooldown((prevCd) => {
              const nextWave = prevCd - 0.25;
              if (nextWave <= 0) {
                const count = orbLevel >= 4 ? 3 : 2;
                const defenseTech = computeEnemyCombatTechLevel(orbFacId, sys, sys, c).techLevel;
                const wave = buildEnemyWave(orbFacId, count, defenseTech, c.playerPos, 'Reforço Orbital');
                setActiveEnemies((prev) => [...prev, ...wave]);
                soundEngine.playAlert();
                notify(`Reforços hostis. Mais ${count} naves de nível ${defenseTech} entraram em órbita.`);
                return orbLevel >= 4 ? 30 : 60;
              }
              return nextWave;
            });
          }
        } else if (hostileCountdown !== null) {
          setHostileCountdown(null);
          setHostileWaveCooldown(0);
        }
      } else if (hostileCountdown !== null) {
        setHostileCountdown(null);
        setHostileWaveCooldown(0);
      }

      // 3. In-system Random Encounter Check (triggers reliably while flying inside a solar system!)
      if (!inOrbit && !inCombat && !showGalacticMapRef.current && !sys.isBlackHole) {
        const conflictSpeed = 1 + (sys.conflictLevel - 1) * 0.25;
        const cloakSlow = 1 - Math.min(0.45, st.cloakReduction);
        inSystemEncounterTimerRef.current -= dt * conflictSpeed * cloakSlow;
        if (inSystemEncounterTimerRef.current <= 0) {
          inSystemEncounterTimerRef.current = 24 + Math.random() * 18;
          spawnRandomEncounter(sys, sys, c, c.playerPos);
        }
      }

      // 4. Apply state deltas (Time, Galactic Cycle, Supplies outside orbit, Regen, Mining Cargo)
      if (minedUnits > 0) {
        setDepletedDeposits((prev) => {
          const planet = sys.planets.find((p) => p.id === mine!.planetId);
          const dep = planet?.deposits.find((d) => d.id === minedDepositId);
          const cur = prev[minedDepositId] ?? dep?.remaining ?? 0;
          return { ...prev, [minedDepositId]: Math.max(0, cur - minedUnits) };
        });
      }

      if (atmosphericRiskDamage > 0) {
        soundEngine.playAlert();
        notify(`Extração sem licença interceptada! -${atmosphericRiskDamage} dano (${atmosphericRiskRenownPenalty} reputação).`);
      }
      if (surfaceCrewDamage > 0) {
        soundEngine.playAlert();
        notify(`Contato com o solo: a tripulação perde ${surfaceCrewDamage} de saúde.`);
      }

      let cycleAnnouncement: string | null = null;

      setCampaign((prev) => {
        if (!prev) return prev;
        const ship = prev.ships.find((s) => s.uid === prev.activeShipUid) ?? prev.ships[0];
        const shipDerived = computeShipDerivedStats(ship, computeCrewBonuses(prev));

        // Supplies drain ONLY outside planet orbit
        const totalSkill = prev.crew.reduce((s, m) => s + m.skill, 0);
        const supplyDrain = inOrbit ? 0 : ((totalSkill * bon.supplyCostMult) / 60) * dt * 1.5;
        const nextSupplies = Math.max(0, prev.supplies - supplyDrain);

        const maxCrewHealth = 100 + Math.max(0, prev.healthPotency ?? 0);
        const master = prev.crew.find((member) => member.status === 'ativo' && member.role === 'mestre_tripulacao');
        const masterRaw = master ? master.skill * (prev.supplies > 0 ? 1 : 0.5) : 0;
        let abilityRegen = 0;
        for (const abilityId of prev.specialAbilityIds ?? []) {
          abilityRegen += SPECIAL_ABILITIES_BY_ID[abilityId]?.healthRegenPerSec ?? 0;
        }
        let nextCrewHealth = Math.min(
          maxCrewHealth,
          (prev.crewHealth ?? 100) + (masterRaw * 0.004 + abilityRegen) * dt
        );
        if (surfaceCrewDamage > 0) {
          nextCrewHealth = Math.max(0, nextCrewHealth - surfaceCrewDamage);
        }

        // Passive shield & engineer hull regeneration
        const shieldGain =
          ship.currentShield < shipDerived.maxShield
            ? shipDerived.shieldRegen * (inCombat ? 0.55 : 1.0) * dt
            : 0;
        const hullGain =
          !inCombat && ship.currentHull < shipDerived.maxHull
            ? bon.hullRegenPerSec * dt
            : 0;

        let nextCargo = prev.cargo;
        if (minedUnits > 0 && minedResourceId) {
          nextCargo = addCargoItem(
            prev.cargo,
            minedResourceId,
            minedUnits,
            0,
            shipDerived.cargoCapacity,
            prev
          ).nextCargo;
        }

        let nextShield = Math.min(shipDerived.maxShield, ship.currentShield + shieldGain);
        let nextHull = Math.min(shipDerived.maxHull, ship.currentHull + hullGain);

        if (atmosphericRiskDamage > 0) {
          const absorb = Math.min(nextShield, atmosphericRiskDamage);
          nextShield -= absorb;
          const overflow = atmosphericRiskDamage - absorb;
          nextHull = Math.max(0, nextHull - Math.max(0, overflow - shipDerived.armor * 0.25));
          if (nextHull <= 0) {
            setHullDestroyedModal(true);
            setMining(null);
          }
        }

        const nextShips =
          shieldGain > 0 || hullGain > 0 || atmosphericRiskDamage > 0
            ? prev.ships.map((s) =>
                s.uid === ship.uid
                  ? {
                      ...s,
                      currentShield: nextShield,
                      currentHull: nextHull,
                    }
                  : s
              )
            : prev.ships;

        let nextPlanetOverrides = prev.planetOverrides;
        if (atmosphericRevealPlanetId) {
          nextPlanetOverrides = {
            ...prev.planetOverrides,
            [atmosphericRevealPlanetId]: {
              ...(prev.planetOverrides[atmosphericRevealPlanetId] ?? {}),
              level: 3,
              techLevelOverride: 1,
              evolvedNote: 'Existência revelada durante coleta atmosférica (Nível 3 Baixa Tecnologia)',
            },
          };
        }

        let nextRenown = prev.factionRenown;
        if (atmosphericRiskRenownPenalty !== 0 && atmosphericRiskFactionId) {
          nextRenown = {
            ...prev.factionRenown,
            [atmosphericRiskFactionId]: (prev.factionRenown[atmosphericRiskFactionId] ?? 0) + atmosphericRiskRenownPenalty,
          };
        }

        const baseUpdated: PlayerCampaignState = {
          ...prev,
          gameTimeSeconds: prev.gameTimeSeconds + dt,
          cycleElapsedSec: prev.cycleElapsedSec + dt,
          supplies: nextSupplies,
          crewHealth: nextCrewHealth,
          cargo: nextCargo,
          ships: nextShips,
          planetOverrides: nextPlanetOverrides,
          factionRenown: nextRenown,
        };

        if (baseUpdated.cycleElapsedSec >= GALACTIC_CYCLE_DURATION_SEC) {
          const cycleRes = advanceGalacticCycle(baseUpdated);
          if (cycleRes.announcements.length > 0) {
            cycleAnnouncement = cycleRes.announcements[0];
          }
          return cycleRes.nextCampaign;
        }

        return baseUpdated;
      });

      if (cycleAnnouncement) {
        notify(cycleAnnouncement);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [timeScale, hullDestroyedModal, vnNodes, pendingEncounter, hostileCountdown, notify, spawnRandomEncounter]);

  // Combat Tick Handler from SolarSystemViewport (never drop throttled ticks so all DPS & war hits apply reliably)
  const handleCombatTick = useCallback(
    (
      updatedEnemies: ActiveEnemy[],
      playerDamageTaken: number,
      _reflectedDamage: number,
      enemyKilledIds: string[]
    ) => {
      const accDmg = playerDamageTaken;
      const killedSet = new Set(enemyKilledIds);

      const c = campaignRef.current;
      const sys = currentSystemRef.current;
      if (!c || !sys) return;

      const ship = c.ships.find((s) => s.uid === c.activeShipUid) ?? c.ships[0];
      const st = computeShipDerivedStats(ship, computeCrewBonuses(c));

      // Apply shield reflection back onto closest enemy if player took damage
      let finalEnemies = updatedEnemies;
      if (accDmg > 0 && st.reflectRatio > 0 && finalEnemies.length > 0) {
        const refAmt = accDmg * st.reflectRatio;
        finalEnemies = finalEnemies.map((e, idx) =>
          idx === 0 ? { ...e, hull: e.hull - refAmt } : e
        );
      }

      // Recover exact defeated enemy records (including techLevel & factionId) before updating survivors
      const preEnemies = enemiesRef.current;
      const survivorIds = new Set(finalEnemies.filter((e) => e.hull > 0).map((e) => e.id));
      const defeatedMap = new Map<string, ActiveEnemy>();
      for (const e of preEnemies) {
        if (killedSet.has(e.id) || !survivorIds.has(e.id)) {
          defeatedMap.set(e.id, e);
        }
      }
      for (const e of finalEnemies) {
        if (e.hull <= 0) {
          defeatedMap.set(e.id, e);
        }
      }
      const defeatedEnemies = Array.from(defeatedMap.values());

      // Remove defeated
      const survivors = finalEnemies.filter((e) => e.hull > 0);
      const allDeadCount = Math.max(defeatedEnemies.length, killedSet.size + finalEnemies.filter((e) => e.hull <= 0).length);

      setActiveEnemies(survivors);

      // Apply damage to player shield & armor-mitigated hull
      if (accDmg > 0 || allDeadCount > 0) {
        const primaryDmgType: WeaponDamageType = updatedEnemies[0]?.damageType ?? 'laser';
        const shieldMit = st.mitigation[primaryDmgType];
        const mitigatedDmg = accDmg * (1 - shieldMit);

        let warAnnouncement: string | null = null;

        setCampaign((prev) => {
          if (!prev) return prev;
          const curShip = prev.ships.find((s) => s.uid === prev.activeShipUid) ?? prev.ships[0];
          let sh = curShip.currentShield;
          let hl = curShip.currentHull;

          if (mitigatedDmg > 0) {
            if (sh > 0) {
              const absorbed = Math.min(sh, mitigatedDmg);
              sh -= absorbed;
              const overflow = mitigatedDmg - absorbed;
              const afterArmor = Math.max(0, overflow - st.armor * 0.25);
              hl -= afterArmor;
            } else {
              const afterArmor = Math.max(0.5, mitigatedDmg - st.armor * 0.35);
              hl -= afterArmor;
            }
          }

          let nextCredits = prev.credits;
          let nextCargo = prev.cargo;
          let nextMissions = prev.missions;
          const newLogs = [...prev.logbook];

          if (allDeadCount > 0) {
            const knownLoot = defeatedEnemies.reduce(
              (sum, enemy) => sum + 50 * Math.max(1, Math.round(enemy.techLevel)),
              0
            );
            const missing = Math.max(0, allDeadCount - defeatedEnemies.length);
            const lootCr = knownLoot + missing * 50;
            nextCredits += lootCr;
            const lootResId = sys.rareMultiplier > 1.3 ? 'ligas_avancadas' : 'titanio';
            nextCargo = addCargoItem(nextCargo, lootResId, allDeadCount * 2, 0, st.cargoCapacity, prev).nextCargo;
            newLogs.push(
              makeLog('combate', `Inimigo abatido em ${sys.name}! Saque: +${lootCr} créditos.`, prev.gameTimeSeconds)
            );
            if (survivors.length === 0) {
              nextMissions = markDefeatedHuntMissions(prev.missions, defeatedEnemies, true);
            }
          }

          if (hl <= 0) {
            setHullDestroyedModal(true);
            setActiveEnemies([]);
          }

          let updatedState: PlayerCampaignState = {
            ...prev,
            credits: nextCredits,
            cargo: nextCargo,
            missions: nextMissions,
            logbook: newLogs,
            ships: prev.ships.map((s) =>
              s.uid === curShip.uid ? { ...s, currentHull: Math.max(0, hl), currentShield: Math.max(0, sh) } : s
            ),
          };

          if (defeatedEnemies.length > 0) {
            const renown = { ...updatedState.factionRenown };
            for (const killed of defeatedEnemies) {
              if (!killed.factionId) continue;
              renown[killed.factionId] = (renown[killed.factionId] ?? 0) - 24;
              const rivals = FACTIONS_BY_ID[killed.factionId]?.warsWith ?? [];
              for (const rivalId of rivals) {
                renown[rivalId] = (renown[rivalId] ?? 0) + 10;
              }
            }
            updatedState = { ...updatedState, factionRenown: renown };
            const warRes = applyPlayerKillToWars(updatedState, defeatedEnemies);
            updatedState = warRes.nextCampaign;
            if (warRes.announcements.length > 0) {
              warAnnouncement = warRes.announcements[0];
            }
          }

          return updatedState;
        });

        if (warAnnouncement) {
          notify(warAnnouncement);
        } else if (allDeadCount > 0 && survivors.length === 0) {
          notify('Ameaça neutralizada! Destroços saqueados.');
        }
      }
    },
    [notify]
  );

  // Hyperspace Jump from Galactic Map (Section 13 & 16.4)
  const handleJumpToSystem = (rawTarget: StarSystemSummary, fuelCost: number) => {
    if (!campaign || !shipStats || !activeShip) return;
    const target = getEffectiveSystemSummary(rawTarget, campaign);
    const targetFac = target.controllingFactionId ? FACTIONS_BY_ID[target.controllingFactionId] : null;
    const shipFacColor = activeShip.factionId ? FACTIONS_BY_ID[activeShip.factionId]?.color : undefined;

    soundEngine.playWarp();
    if (warpTimerRef.current) window.clearTimeout(warpTimerRef.current);

    setWarpTransition({
      targetName: target.name,
      shipColor: activeShip.color ?? shipFacColor ?? '#38bdf8',
      factionColor: targetFac?.color ?? shipFacColor ?? '#38bdf8',
      factionName: targetFac?.name ?? 'Espaço Selvagem',
    });
    setShowGalacticMap(false);
    setMining(null);
    setTravelTargetPlanetId(null);
    setTravelTargetPhenomenonId(null);
    setAtPhenomenonId(null);
    setActiveEnemies([]);
    setFleeState(null);
    setPendingEncounter(null);
    setHostileCountdown(null);
    setDrawer({ kind: 'none' });
    inSystemEncounterTimerRef.current = 20 + Math.random() * 14;

    // Reveal neighboring factions within jump/scanner range
    const nearbySystems = getSystemsInRadius(target, shipStats.hasLongScanner ? 26 : 18).map((s) =>
      getEffectiveSystemSummary(s, campaign)
    );
    const newlyScannedIds = shipStats.hasLongScanner ? nearbySystems.map((s) => s.id) : [target.id];
    const discoveredFactions = new Set<string>(campaign.knownFactionIds);
    nearbySystems.forEach((s) => {
      if (s.controllingFactionId) discoveredFactions.add(s.controllingFactionId);
    });

    const targetFull = generateSolarSystem(target);
    const entryPos = { x: target.starExclusionRadius + 14, z: 10 };
    const shipFactionId = activeShip.factionId ?? campaign.chosenFactionId;
    const ownerId = target.controllingFactionId;
    const shipWars = FACTIONS_BY_ID[shipFactionId]?.warsWith ?? [];
    const hostileEntry = Boolean(ownerId && shipWars.includes(ownerId));
    const entryRenown = hostileEntry && ownerId
      ? { ...campaign.factionRenown, [ownerId]: (campaign.factionRenown[ownerId] ?? 0) - 8 }
      : campaign.factionRenown;

    const updatedCampaign: PlayerCampaignState = {
      ...campaign,
      fuel: Math.max(0, campaign.fuel - fuelCost),
      currentSystemId: target.id,
      visitedSystemIds: campaign.visitedSystemIds.includes(target.id)
        ? campaign.visitedSystemIds
        : [...campaign.visitedSystemIds, target.id],
      scannedSystemIds: Array.from(new Set([...campaign.scannedSystemIds, ...newlyScannedIds])),
      knownFactionIds: Array.from(discoveredFactions),
      playerPos: entryPos,
      orbitingPlanetId: null,
      factionRenown: entryRenown,
      logbook: [
        ...campaign.logbook,
        makeLog('viagem', `Salto interestelar concluído para ${target.name} (${target.region}).`, campaign.gameTimeSeconds),
        ...(hostileEntry && ownerId
          ? [
              makeLog(
                'diplomacia',
                `A nave de ${FACTIONS_BY_ID[shipFactionId]?.name ?? 'sua facção'} entrou em território inimigo. Sua reputação com ${FACTIONS_BY_ID[ownerId]?.name ?? 'a facção local'} caiu.`,
                campaign.gameTimeSeconds
              ),
            ]
          : []),
      ],
    };

    setCampaign(updatedCampaign);

    // Random Encounter Roll on Jump (triggered cleanly right as ship exits warp tunnel)
    const hostileRollChance = Math.max(10, target.hostileChancePct * (1 - shipStats.cloakReduction));
    const triggerChance = Math.min(82, 34 + hostileRollChance * 0.5);
    const shouldTriggerEncounter = Math.random() * 100 < triggerChance && !target.isBlackHole;

    warpTimerRef.current = window.setTimeout(() => {
      setWarpTransition(null);
      if (shouldTriggerEncounter) {
        spawnRandomEncounter(target, targetFull, updatedCampaign, entryPos);
      }
    }, 1850);
  };

  // Planet & Phenomenon Interactions
  const handleTravelToPlanet = (planetId: string) => {
    soundEngine.playClick();
    setMining(null);
    setTravelTargetPhenomenonId(null);
    setAtPhenomenonId(null);
    setTravelTargetPlanetId(planetId);
    setCampaign((prev) => (prev ? { ...prev, orbitingPlanetId: null } : prev));
  };

  const handleArrivedAtPlanetOrbit = useCallback(
    (planetId: string) => {
      setTravelTargetPlanetId(null);
      setTravelTargetPhenomenonId(null);
      setAtPhenomenonId(null);
      setCampaign((prev) => (prev ? { ...prev, orbitingPlanetId: planetId } : prev));

      const cur = campaignRef.current;
      const sys = currentSystemRef.current;
      if (cur && sys) {
        const orbPlanet = sys.planets.find((p) => p.id === planetId);
        if (orbPlanet) {
          const orbLevel = getPlanetCurrentLevel(orbPlanet, cur);
          const orbFacId = getPlanetControllingFaction(orbPlanet, cur) ?? sys.controllingFactionId;
          const isAtWar = Boolean(
            orbFacId &&
              orbFacId !== cur.chosenFactionId &&
              ((cur.activeWars[cur.chosenFactionId] ?? FACTIONS_BY_ID[cur.chosenFactionId]?.warsWith ?? []).includes(
                orbFacId
              ) ||
                (cur.activeWars[orbFacId] ?? FACTIONS_BY_ID[orbFacId]?.warsWith ?? []).includes(cur.chosenFactionId))
          );

          if (orbLevel >= 3 && orbFacId && isAtWar) {
            const count = orbLevel >= 4 ? 3 : 2;
            const defenseTech = computeEnemyCombatTechLevel(orbFacId, sys, sys, cur).techLevel;
            const wave = buildEnemyWave(
              orbFacId,
              count,
              defenseTech,
              cur.playerPos,
              'Defesa Planetária'
            );
            setActiveEnemies((prev) => [...prev, ...wave]);
            setHostileCountdown(0);
            setHostileWaveCooldown(orbLevel >= 4 ? 30 : 60);
            setDrawer({ kind: 'combat' });
            soundEngine.playAlert();
            notify(
              `Alerta de Guerra! Sistemas de defesa de ${orbPlanet.name} (${FACTIONS_BY_ID[orbFacId]?.name ?? orbFacId}) ativados em órbita!`
            );
            return;
          }
        }
      }

      // Open the Action Panel automatically upon entering non-war orbit
      setDrawer({ kind: 'planet', planetId });
    },
    [notify]
  );

  const handleTravelToPhenomenon = (phenId: string) => {
    soundEngine.playClick();
    setMining(null);
    setTravelTargetPlanetId(null);
    setAtPhenomenonId(null);
    setTravelTargetPhenomenonId(phenId);
    setCampaign((prev) => (prev ? { ...prev, orbitingPlanetId: null } : prev));
  };

  const handleArrivedAtPhenomenon = useCallback((phenId: string) => {
    setTravelTargetPhenomenonId(null);
    setAtPhenomenonId(phenId);
    setDrawer({ kind: 'phenomenon', phenomenonId: phenId });
    notify('Nave posicionada junto ao fenômeno espacial.');
  }, [notify]);

  const handleScanPlanet = (planet: PlanetData) => {
    if (!campaign) return;
    if (campaign.orbitingPlanetId !== planet.id) {
      notify('Entre em órbita do planeta para escaneá-lo.');
      return;
    }

    soundEngine.playScan();
    setCampaign((prev) => {
      if (!prev) return prev;
      const scannedPlanets = prev.scannedPlanetIds.includes(planet.id)
        ? prev.scannedPlanetIds
        : [...prev.scannedPlanetIds, planet.id];
      const facSet = new Set(prev.knownFactionIds);
      if (planet.factionId) facSet.add(planet.factionId);

      const nextMissions = prev.missions.map((m) =>
        m.status === 'aceita' && m.type === 'escanear_planeta' && m.targetPlanetId === planet.id
          ? { ...m, planetScanned: true }
          : m
      );

      return {
        ...prev,
        scannedPlanetIds: scannedPlanets,
        knownFactionIds: Array.from(facSet),
        missions: nextMissions,
        logbook: [
          ...prev.logbook,
          makeLog(
            'exploracao',
            `Planeta ${planet.name} escaneado (${getPlanetEffectiveTypeCode(planet, prev)}, Nível ${getPlanetCurrentLevel(planet, prev)}).`,
            prev.gameTimeSeconds
          ),
        ],
      };
    });
    notify(`Escaneamento de ${planet.name} concluído!`);
  };

  const applyShipDamageState = (
    ships: OwnedShip[],
    activeUid: string,
    maxShield: number,
    armor: number,
    rawDamage: number
  ): { nextShips: OwnedShip[]; destroyed: boolean; shieldLost: number; hullLost: number } => {
    const target = ships.find((s) => s.uid === activeUid) ?? ships[0];
    if (!target || rawDamage <= 0) {
      return { nextShips: ships, destroyed: false, shieldLost: 0, hullLost: 0 };
    }
    let sh = Math.min(maxShield, target.currentShield);
    let hl = target.currentHull;
    const absorb = Math.min(sh, rawDamage);
    sh -= absorb;
    const overflow = rawDamage - absorb;
    const hullDmg = overflow > 0 ? Math.max(1, overflow - armor * 0.25) : 0;
    hl = Math.max(0, hl - hullDmg);
    return {
      nextShips: ships.map((s) =>
        s.uid === target.uid ? { ...s, currentShield: sh, currentHull: hl } : s
      ),
      destroyed: hl <= 0,
      shieldLost: Math.round(absorb),
      hullLost: Math.round(hullDmg),
    };
  };

  const handleDescendPlanet = (planet: PlanetData) => {
    if (!campaign || !bonuses || !activeShip || !shipStats) return;
    if (getPlanetCurrentLevel(planet, campaign) === -1) {
      notify('Este mundo queimou. Não há chão seguro para descer.');
      return;
    }
    soundEngine.playScan();
    triggerLandingPulse(planet.id);

    const actualLevel = getPlanetCurrentLevel(planet, campaign);
    const activeExplorer = campaign.crew.find((c) => c.status === 'ativo' && c.role === 'explorador');
    const suitGear = activeShip.suitGearIds.map((id) => SUIT_GEAR_BY_ID[id]).filter(Boolean);
    const gearPower = suitGear.reduce((s, g) => s + g.combatPower + g.explorationBonus, 0);
    const riskInfo = evaluatePlanetConditionRisk(
      planetForRisk(planet, campaign),
      activeShip.suitGearIds,
      bonuses.explorerBonus,
      bonuses.hazardResistBonus
    );

    const explorerSkill = (activeExplorer ? activeExplorer.skill : 15) * crewHealthRatio(campaign);
    const successScore = explorerSkill + gearPower + bonuses.explorerBonus * 0.4 - riskInfo.uncoveredThreats * 20;
    const roll = Math.random() * 100;

    // 1. Catalog creature (not on Level 5; Lotus ability guarantees fauna discovery)
    const unscannedCreatures =
      actualLevel < 5 ? planet.creatureIds.filter((id) => !campaign.scannedCreatureIds.includes(id)) : [];
    let newCreatureId: string | null = null;
    const guaranteedFauna = (campaign.specialAbilityIds ?? []).includes('hab_sp_lotus');
    if (unscannedCreatures.length > 0 && (guaranteedFauna || roll < Math.max(48, successScore))) {
      newCreatureId = unscannedCreatures[0];
    }

    // 2. Medium risk of damage amplified by planet condition across all levels
    const dmgChancePct = Math.max(15, Math.min(86, 38 + riskInfo.riskBonusPct));
    const tookDamage = Math.random() * 100 < dmgChancePct;
    const rawDamage = tookDamage ? Math.round((12 + Math.random() * 12) * riskInfo.damageMult) : 0;

    // 3. Level 2 medium risk of revealing existence
    const revealedExistence = actualLevel === 2 && Math.random() < 0.42;

    // 4. Fatal explorer failure only on severe uncovered hazards
    const fatalFailure = activeExplorer && riskInfo.uncoveredThreats >= 2 && roll > successScore + 28;

    // 5. Loot roll
    const foundCredits =
      roll < successScore + 18 ? Math.round((actualLevel === 5 ? 160 : 90) + Math.random() * 220) : 0;
    const bonusRes = actualLevel < 5 ? planet.deposits.find((d) => d.remaining > 0)?.resourceId : undefined;
    const foundQty = bonusRes && roll < successScore ? 2 : 0;

    setCampaign((prev) => {
      if (!prev) return prev;
      let nextCrew = prev.crew;
      const logs = [...prev.logbook];
      const parts: string[] = [];

      if (fatalFailure && activeExplorer) {
        nextCrew = prev.crew.filter((m) => m.id !== activeExplorer.id);
        parts.push(`Tragédia em ${planet.name}: ${activeExplorer.name} não resistiu às condições locais.`);
      } else if (newCreatureId) {
        const cr = CREATURES_BY_ID[newCreatureId];
        const catalogPay = cr?.baseValue ?? 0;
        parts.push(
          `Criatura "${cr?.name}" catalogada em ${planet.name}. O catálogo pagou ${catalogPay} créditos.`
        );
        if (foundCredits > 0) parts.push(`A expedição também achou ${foundCredits} créditos.`);
      } else if (foundCredits > 0) {
        parts.push(
          actualLevel === 5
            ? `Inspeção urbana em ${planet.name}: +${foundCredits} cr`
            : `Expedição em ${planet.name}: +${foundCredits} cr`
        );
      } else {
        parts.push(`Expedição em ${planet.name} concluída`);
      }

      if (rawDamage > 0) {
        parts.push(`-${rawDamage} de saúde da tripulação (${riskInfo.conditionLabel})`);
      }
      if (revealedExistence) {
        parts.push(`Existência revelada! ${planet.name} evoluiu para Nível 3 (baixa tecnologia)`);
      }

      const msg = parts.join(' · ');
      logs.push(makeLog(fatalFailure ? 'tripulacao' : 'exploracao', msg, prev.gameTimeSeconds));

      const nextScannedCreatures =
        newCreatureId && !prev.scannedCreatureIds.includes(newCreatureId)
          ? [...prev.scannedCreatureIds, newCreatureId]
          : prev.scannedCreatureIds;

      const ship = prev.ships.find((s) => s.uid === prev.activeShipUid) ?? prev.ships[0];
      const st = computeShipDerivedStats(ship, computeCrewBonuses(prev));
      const nextCargo =
        foundQty > 0 && bonusRes
          ? addCargoItem(prev.cargo, bonusRes, foundQty, 0, st.cargoCapacity, prev).nextCargo
          : prev.cargo;

      const maxCrewHealth = 100 + Math.max(0, prev.healthPotency ?? 0);
      const nextCrewHealth = Math.max(0, Math.min(maxCrewHealth, (prev.crewHealth ?? 100) - rawDamage));

      const nextMissions = prev.missions.map((m) => {
        if (m.status !== 'aceita') return m;
        if (
          newCreatureId &&
          m.type === 'escanear_criatura' &&
          (m.targetPlanetId === planet.id || m.targetSystemId === prev.currentSystemId)
        ) {
          return { ...m, creatureScanned: true };
        }
        if (
          revealedExistence &&
          m.type === 'contato_nivel2' &&
          (m.targetPlanetId === planet.id || m.targetSystemId === prev.currentSystemId)
        ) {
          return { ...m, contactCompleted: true };
        }
        return m;
      });

      const prevOv = prev.planetOverrides[planet.id] ?? {};
      const nextPlanetOverrides = {
        ...prev.planetOverrides,
        [planet.id]: {
          ...prevOv,
          lastDescendAt: prev.gameTimeSeconds,
          ...(revealedExistence
            ? {
                level: 3,
                techLevelOverride: 1 as const,
                evolvedNote: 'Existência revelada em solo — civilização Nível 3 (baixa tecnologia)',
              }
            : {}),
        },
      };

      const catalogPay =
        !fatalFailure && newCreatureId ? (CREATURES_BY_ID[newCreatureId]?.baseValue ?? 0) : 0;

      notify(msg);

      return {
        ...prev,
        credits: prev.credits + (fatalFailure ? 0 : foundCredits) + catalogPay,
        crew: nextCrew,
        crewHealth: nextCrewHealth,
        cargo: nextCargo,
        scannedCreatureIds: nextScannedCreatures,
        missions: nextMissions,
        planetOverrides: nextPlanetOverrides,
        logbook: logs,
      };
    });
  };

  const handleExtractGround = (planet: PlanetData, depositId: string) => {
    if (!campaign || !activeShip || !shipStats || !bonuses || !currentSystem) return;
    if (campaign.orbitingPlanetId !== planet.id) return;
    if (mining?.depositId === depositId && mining.planetId === planet.id) {
      setMining(null);
      notify('A extração parou. A nave volta à órbita.');
      return;
    }

    const dep = planet.deposits.find((d) => d.id === depositId);
    if (!dep || dep.remaining <= 0) {
      notify('Esse depósito já secou.');
      return;
    }
    const res = RESOURCES_BY_ID[dep.resourceId];
    if (!res) return;

    const matchingExtractors = activeShip.extractorIds
      .map((id) => EXTRACTORS_BY_ID[id])
      .filter((ex) => ex && ex.extractionClass === res.extractionClass);
    if (matchingExtractors.length === 0) {
      notify('A nave não tem a ferramenta certa para esse minério.');
      return;
    }

    const freeCargo = Math.max(0, shipStats.cargoCapacity - compartmentUsed(campaign, activeShip));
    if (freeCargo <= 0) {
      notify('O compartimento de carga está cheio. A nave não pousa.');
      return;
    }

    const totalRate = matchingExtractors.reduce((s, ex) => s + ex.ratePerSec, 0) * bonuses.minerRateMult;
    const actualLevel = getPlanetCurrentLevel(planet, campaign);
    const riskInfo = evaluatePlanetConditionRisk(
      planetForRisk(planet, campaign),
      activeShip.suitGearIds,
      bonuses.explorerBonus,
      bonuses.hazardResistBonus
    );
    const lic = getSystemExtractionLicenseStatus(currentSystem, actualLevel, campaign);
    const ctrlFacId = getPlanetControllingFaction(planet, campaign) ?? currentSystem.controllingFactionId;

    let dmgChancePct = 44 + riskInfo.riskBonusPct;
    let baseDmg = 18 + Math.random() * 12;
    let revealExistence = false;
    let renownPenalty = 0;

    if (actualLevel === 2) {
      revealExistence = Math.random() < 0.72;
      dmgChancePct = 66 + riskInfo.riskBonusPct;
      baseDmg = 22 + Math.random() * 14;
    } else if (actualLevel >= 3) {
      if (!lic.licensed) {
        dmgChancePct = 74 + riskInfo.riskBonusPct;
        baseDmg = 26 + Math.random() * 16;
        renownPenalty = -8;
      } else {
        dmgChancePct = 18 + Math.max(0, riskInfo.riskBonusPct * 0.6);
        baseDmg = 10 + Math.random() * 8;
      }
    }

    const tookDamage = Math.random() * 100 < Math.max(10, Math.min(95, dmgChancePct));
    const rawDamage = tookDamage ? Math.round(baseDmg * riskInfo.damageMult) : 0;

    triggerLandingPulse(planet.id);
    soundEngine.playMiningPulse();
    if (rawDamage > 0) soundEngine.playAlert();

    setMining({
      planetId: planet.id,
      depositId,
      resourceId: res.id,
      ratePerSec: totalRate,
      progress: 0,
      surface: true,
      warmup: 1.6,
    });

    setCampaign((prev) => {
      if (!prev) return prev;
      const maxCrewHealth = 100 + Math.max(0, prev.healthPotency ?? 0);
      const nextCrewHealth = Math.max(0, Math.min(maxCrewHealth, (prev.crewHealth ?? 100) - rawDamage));
      const prevOv = prev.planetOverrides[planet.id] ?? {};
      const nextPlanetOverrides = revealExistence
        ? {
            ...prev.planetOverrides,
            [planet.id]: {
              ...prevOv,
              level: 3,
              techLevelOverride: 1 as const,
              evolvedNote: 'Existência revelada durante extração no solo (Nível 3 Baixa Tecnologia)',
            },
          }
        : prev.planetOverrides;

      const nextRenown =
        renownPenalty !== 0 && ctrlFacId
          ? {
              ...prev.factionRenown,
              [ctrlFacId]: (prev.factionRenown[ctrlFacId] ?? 0) + renownPenalty,
            }
          : prev.factionRenown;

      const parts = [`Pouso em ${planet.name}: extração de ${res.name} começa após a nave assentar.`];
      if (rawDamage > 0) parts.push(`-${rawDamage} de saúde da tripulação (${riskInfo.conditionLabel})`);
      if (renownPenalty !== 0) parts.push(`${renownPenalty} reputação (sem licença)`);
      if (revealExistence) parts.push('Existência revelada! Evoluiu para Nível 3');
      const msg = parts.join(' · ');
      notify(msg);

      return {
        ...prev,
        crewHealth: nextCrewHealth,
        planetOverrides: nextPlanetOverrides,
        factionRenown: nextRenown,
        logbook: [...prev.logbook, makeLog('exploracao', msg, prev.gameTimeSeconds)],
      };
    });
  };

  const handleRevealExistence = (planet: PlanetData) => {
    if (!campaign) return;
    soundEngine.playScan();
    setCampaign((prev) => {
      if (!prev) return prev;
      const prevOv = prev.planetOverrides[planet.id] ?? {};
      const nextMissions = prev.missions.map((m) =>
        m.status === 'aceita' &&
        m.type === 'contato_nivel2' &&
        (m.targetPlanetId === planet.id || m.targetSystemId === prev.currentSystemId)
          ? { ...m, contactCompleted: true }
          : m
      );
      const msg = `Existência revelada em ${planet.name}! Civilização evoluiu para Nível 3 (baixa tecnologia).`;
      notify(msg);
      return {
        ...prev,
        missions: nextMissions,
        planetOverrides: {
          ...prev.planetOverrides,
          [planet.id]: {
            ...prevOv,
            level: 3,
            techLevelOverride: 1,
            evolvedNote: 'Evoluído para Nível 3 de baixa tecnologia após revelação',
          },
        },
        logbook: [...prev.logbook, makeLog('diplomacia', msg, prev.gameTimeSeconds)],
      };
    });
  };

  const handleBombardPlanet = (planet: PlanetData) => {
    if (!campaign || !activeShip || !currentSystem) return;
    const weapon = activeShip.weaponId ? WEAPONS_BY_ID[activeShip.weaponId] : null;
    if (!weapon || !weapon.canBombard) {
      notify('Requer arma de Bombardeio Orbital equipada!');
      return;
    }

    const actualLevel = getPlanetCurrentLevel(planet, campaign);
    if (actualLevel < 2) {
      notify('Planeta já está em nível mínimo.');
      return;
    }

    soundEngine.playAlert();
    const ctrlFacId = getPlanetControllingFaction(planet, campaign) ?? currentSystem.controllingFactionId;
    const planetTech = getEffectivePlanetTechLevel(planet, currentSystem, campaign);

    // Level 2: reduces level directly without ship defense; Level 3-5: chance to reduce + activates defense ships!
    const reduceChance =
      actualLevel === 2
        ? 1.0
        : (actualLevel === 3 ? 0.72 : actualLevel === 4 ? 0.56 : 0.44) + weapon.attackLevel * 0.04;
    const levelReduced = Math.random() < reduceChance;
    const nextLevel = levelReduced ? Math.max(0, actualLevel - 1) : actualLevel;

    // Activate planetary defense ships on level 3+
    if (actualLevel >= 3) {
      const defFacId = ctrlFacId ?? FACTIONS[0].id;
      const shipCount = actualLevel === 5 ? 4 : actualLevel === 4 ? 3 : 2;
      const defenseTech = Math.max(planetTech, actualLevel - 1);
      const defenseWave = buildEnemyWave(
        defFacId,
        shipCount,
        defenseTech,
        campaign.playerPos,
        'Defesa Planetária'
      );
      setActiveEnemies((prev) => [...prev, ...defenseWave]);
    }

    setCampaign((prev) => {
      if (!prev) return prev;
      const prevOv = prev.planetOverrides[planet.id] ?? {};
      let nextPlanetOverrides: PlayerCampaignState['planetOverrides'] = {
        ...prev.planetOverrides,
        [planet.id]: {
          ...prevOv,
          level: nextLevel,
          techLevelOverride: nextLevel <= 2 ? undefined : prevOv.techLevelOverride,
          evolvedNote: levelReduced
            ? `Bombardeio orbital reduziu infraestrutura para Nível ${nextLevel}`
            : prevOv.evolvedNote,
        },
      };

      const nextSystemOwners = { ...prev.systemOwnerOverrides };
      const nextWarHistory = [...prev.warHistory];
      const nextLogs = [...prev.logbook];
      const renownDelta = actualLevel >= 3 ? -35 : -15;
      const nextRenown = ctrlFacId
        ? {
            ...prev.factionRenown,
            [ctrlFacId]: (prev.factionRenown[ctrlFacId] ?? 0) + renownDelta,
          }
        : prev.factionRenown;

      // Check if ALL planets in currentSystem are now level 0 or 1 -> collapse system to Wild Space!
      const allReducedToZeroOrOne = currentSystem.planets.every((pl) => {
        const lv = pl.id === planet.id ? nextLevel : nextPlanetOverrides[pl.id]?.level ?? pl.level;
        return lv <= 1;
      });

      let systemCollapsed = false;
      if (allReducedToZeroOrOne && currentSystem.controllingFactionId) {
        systemCollapsed = true;
        nextSystemOwners[currentSystem.id] = WILD_SYSTEM_SENTINEL;
        for (const pl of currentSystem.planets) {
          nextPlanetOverrides[pl.id] = {
            ...(nextPlanetOverrides[pl.id] ?? {}),
            factionId: WILD_SYSTEM_SENTINEL,
          };
        }
        const collapseMsg = `Todos os mundos de ${currentSystem.name} foram reduzidos a Nível 0–1! O sistema tornou-se Espaço Selvagem sem facção.`;
        nextWarHistory.unshift({
          id: `wh_col_${Date.now()}`,
          cycle: prev.galacticCycle,
          kind: 'batalha',
          text: collapseMsg,
        });
        nextLogs.push(makeLog('combate', collapseMsg, prev.gameTimeSeconds));
      }

      const mainMsg = systemCollapsed
        ? `Bombardeio devastador! ${currentSystem.name} perdeu todo o controle de facção e virou Espaço Selvagem!`
        : levelReduced
        ? `O bombardeio em ${planet.name} derruba a civilização para o nível ${nextLevel}.${actualLevel >= 3 ? ' A defesa local sobe.' : ''}`
        : `O bombardeio em ${planet.name} encontra os escudos continentais. A civilização segue no nível ${actualLevel}. A defesa local sobe.`;

      nextLogs.push(makeLog('combate', mainMsg, prev.gameTimeSeconds));
      notify(mainMsg);

      return {
        ...prev,
        planetOverrides: nextPlanetOverrides,
        systemOwnerOverrides: nextSystemOwners,
        factionRenown: nextRenown,
        warHistory: nextWarHistory.slice(0, 60),
        logbook: nextLogs,
      };
    });
  };

  const handleBuyExtractionLicense = () => {
    if (!campaign || !currentSystem) return;
    const maxPlanetLevel = currentSystem.planets.reduce(
      (m, p) => Math.max(m, getPlanetCurrentLevel(p, campaign)),
      0
    );
    const lic = getSystemExtractionLicenseStatus(currentSystem, Math.max(3, maxPlanetLevel), campaign);
    if (lic.licensed || !lic.canBuy || campaign.credits < lic.buyCost) return;

    soundEngine.playClick();
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credits: prev.credits - lic.buyCost,
        systemExtractionLicenses: prev.systemExtractionLicenses.includes(currentSystem.id)
          ? prev.systemExtractionLicenses
          : [...prev.systemExtractionLicenses, currentSystem.id],
        logbook: [
          ...prev.logbook,
          makeLog(
            'comercio',
            `Licença de extração adquirida para o sistema ${currentSystem.name} (-${lic.buyCost} cr).`,
            prev.gameTimeSeconds
          ),
        ],
      };
    });
    notify(`Licença de extração ativa em ${currentSystem.name}!`);
  };

  const handleCreateHeadquarters = (planet: PlanetData, targetFactionId: string) => {
    if (!campaign || !currentSystem) return;
    if (currentSystem.controllingFactionId) return;
    const actualLevel = getPlanetCurrentLevel(planet, campaign);
    if (actualLevel !== 3) return;

    const renown = campaign.factionRenown[targetFactionId] ?? 0;
    const isHonored = renown >= 80 || campaign.formalAlliances.includes(targetFactionId);
    if (!isHonored) {
      notify('Você precisa ser Honrado (80+ Reputação) com a facção escolhida.');
      return;
    }
    const missingRes = HEADQUARTERS_COST.resources.find(
      (r) => (campaign.cargo.find((c) => c.resourceId === r.resourceId)?.qty ?? 0) < r.qty
    );
    if (missingRes) {
      const already = (campaign.pendingHeadquarters ?? []).some((entry) => entry.planetId === planet.id);
      if (!already) {
        soundEngine.playClick();
        setCampaign((prev) => {
          if (!prev) return prev;
          const rest = (prev.pendingHeadquarters ?? []).filter((entry) => entry.planetId !== planet.id);
          return {
            ...prev,
            pendingHeadquarters: [
              ...rest,
              { planetId: planet.id, systemId: currentSystem.id, factionId: targetFactionId },
            ],
            logbook: [
              ...prev.logbook,
              makeLog(
                'diplomacia',
                `Sede iniciada em ${planet.name}. O comércio passa a marcar os recursos que ainda faltam.`,
                prev.gameTimeSeconds
              ),
            ],
          };
        });
      }
      const missingName = RESOURCES_BY_ID[missingRes.resourceId]?.name ?? 'um recurso';
      notify(
        already
          ? `A sede em ${planet.name} já está iniciada. Ainda falta ${missingName}.`
          : `Sede iniciada em ${planet.name}. O comércio marca em dourado o que ainda falta, começando por ${missingName}.`
      );
      return;
    }
    if (campaign.credits < HEADQUARTERS_COST.credits) {
      notify('Créditos insuficientes para fundar a sede.');
      return;
    }

    const fac = FACTIONS_BY_ID[targetFactionId];
    soundEngine.playClick();
    setCampaign((prev) => {
      if (!prev) return prev;
      let nextCargo = prev.cargo;
      for (const req of HEADQUARTERS_COST.resources) {
        nextCargo = removeCargoItem(nextCargo, req.resourceId, req.qty);
      }

      const prevOv = prev.planetOverrides[planet.id] ?? {};
      const msg = `A sede se ergue em ${planet.name}. ${fac?.name ?? targetFactionId} assume ${currentSystem.name}.`;
      notify(msg);

      return {
        ...prev,
        credits: prev.credits - HEADQUARTERS_COST.credits,
        cargo: nextCargo,
        pendingHeadquarters: (prev.pendingHeadquarters ?? []).filter((entry) => entry.planetId !== planet.id),
        systemOwnerOverrides: {
          ...prev.systemOwnerOverrides,
          [currentSystem.id]: targetFactionId,
        },
        planetOverrides: {
          ...prev.planetOverrides,
          [planet.id]: {
            ...prevOv,
            level: 4,
            techLevelOverride: 4,
            factionId: targetFactionId,
            evolvedNote: `Sede regional estabelecida para ${fac?.name ?? targetFactionId}`,
          },
        },
        factionRenown: {
          ...prev.factionRenown,
          [targetFactionId]: (prev.factionRenown[targetFactionId] ?? 0) + 15,
        },
        warHistory: [
          {
            id: `wh_hq_${Date.now()}`,
            cycle: prev.galacticCycle,
            kind: 'colonizacao' as const,
            text: msg,
          },
          ...prev.warHistory,
        ].slice(0, 60),
        logbook: [...prev.logbook, makeLog('diplomacia', msg, prev.gameTimeSeconds)],
      };
    });
  };

  const handleColonizePlanet = (planet: PlanetData) => {
    if (!campaign || campaign.credits < 900) return;
    soundEngine.playClick();
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credits: prev.credits - 900,
        planetOverrides: {
          ...prev.planetOverrides,
          [planet.id]: {
            ...(prev.planetOverrides[planet.id] ?? {}),
            level: 3,
            colonizedByPlayer: true,
            factionId: prev.chosenFactionId,
          },
        },
        factionRenown: {
          ...prev.factionRenown,
          [prev.chosenFactionId]: (prev.factionRenown[prev.chosenFactionId] ?? 0) + 18,
        },
        logbook: [
          ...prev.logbook,
          makeLog('exploracao', `Posto colonial fundado em ${planet.name}! Nível elevado para 3.`, prev.gameTimeSeconds),
        ],
      };
    });
    notify(`Colônia fundada em ${planet.name}! Mercado e estaleiro locais agora disponíveis.`);
  };

  const handlePlanetDevastated = (planetId: string, causeLabel: string) => {
    if (!currentSystem) return;
    const planet = currentSystem.planets.find((p) => p.id === planetId);
    if (!planet) return;

    if (mining && planet.deposits.some((d) => d.id === mining.depositId)) {
      setMining(null);
    }

    let alreadyDestroyed = false;
    setCampaign((prev) => {
      if (!prev) return prev;
      const curLv = prev.planetOverrides[planetId]?.level ?? planet.level;
      if (curLv === -1) {
        alreadyDestroyed = true;
        return prev;
      }

      const prevOv = prev.planetOverrides[planetId] ?? {};
      const nextPlanetOverrides: PlayerCampaignState['planetOverrides'] = {
        ...prev.planetOverrides,
        [planetId]: {
          ...prevOv,
          level: -1,
          typeCodeOverride: 'TX31',
          techLevelOverride: undefined,
          factionId: WILD_SYSTEM_SENTINEL,
          colonizedByPlayer: false,
          evolvedNote: `Devastado por ${causeLabel}`,
        },
      };

      const nextSystemOwners = { ...prev.systemOwnerOverrides };
      const nextWarHistory = [...prev.warHistory];
      const nextLogs = [
        ...prev.logbook,
        makeLog(
          'combate',
          `Cataclismo em ${planet.name}. ${causeLabel} deixa a crosta em brasa. O mundo queima.`,
          prev.gameTimeSeconds
        ),
      ];

      const allReducedToZeroOrOne = currentSystem.planets.every((pl) => {
        const lv = pl.id === planetId ? -1 : nextPlanetOverrides[pl.id]?.level ?? pl.level;
        return lv <= 1;
      });
      if (allReducedToZeroOrOne && currentSystem.controllingFactionId && nextSystemOwners[currentSystem.id] !== WILD_SYSTEM_SENTINEL) {
        nextSystemOwners[currentSystem.id] = WILD_SYSTEM_SENTINEL;
        for (const pl of currentSystem.planets) {
          nextPlanetOverrides[pl.id] = {
            ...(nextPlanetOverrides[pl.id] ?? {}),
            factionId: WILD_SYSTEM_SENTINEL,
          };
        }
        const collapseMsg = `Após a devastação de ${planet.name}, ${currentSystem.name} perdeu toda infraestrutura civil e tornou-se Espaço Selvagem.`;
        nextWarHistory.unshift({
          id: `wh_cat_${Date.now()}`,
          cycle: prev.galacticCycle,
          kind: 'batalha',
          text: collapseMsg,
        });
        nextLogs.push(makeLog('diplomacia', collapseMsg, prev.gameTimeSeconds));
      }

      return {
        ...prev,
        planetOverrides: nextPlanetOverrides,
        systemOwnerOverrides: nextSystemOwners,
        warHistory: nextWarHistory.slice(0, 60),
        logbook: nextLogs,
      };
    });

    if (!alreadyDestroyed) {
      notify(`Cataclismo. ${causeLabel} deixa ${planet.name} em brasa.`);
    }
  };

  const handleInvestigateAnomaly = (planet: PlanetData) => {
    if (!campaign || !planet.anomaly || planet.anomaly.investigated || !shipStats) return;
    soundEngine.playScan();
    planet.anomaly.investigated = true;
    const rewardCr = planet.anomaly.rewardCredits;
    const rewardRes = planet.anomaly.rewardResourceId;

    setCampaign((prev) => {
      if (!prev) return prev;
      const nextCargo = rewardRes
        ? addCargoItem(prev.cargo, rewardRes, 3, 0, shipStats.cargoCapacity, prev).nextCargo
        : prev.cargo;
      return {
        ...prev,
        credits: prev.credits + rewardCr,
        cargo: nextCargo,
        logbook: [
          ...prev.logbook,
          makeLog(
            'exploracao',
            `Anomalia "${planet.anomaly?.title}" investigada em ${planet.name}: +${rewardCr} cr${
              rewardRes ? ` e +3 ${RESOURCES_BY_ID[rewardRes]?.name}` : ''
            }.`,
            prev.gameTimeSeconds
          ),
        ],
      };
    });
    notify(`Anomalia decifrada! +${rewardCr} créditos.`);
  };

  const handleInteractPhenomenon = (phen: SystemPhenomenon) => {
    if (!campaign || !shipStats) return;
    if (atPhenomenonId !== phen.id) {
      notify('Viaje até o local do fenômeno para minerar ou interagir.');
      return;
    }
    const remaining = campaign.phenomenonCooldowns[phen.id] ?? phen.remaining;
    if (remaining <= 0) return;

    soundEngine.playMiningPulse();
    const collected = phen.kind === 'destrocos_nave' ? 1 : Math.min(8, remaining);
    const lootCr = phen.kind === 'destrocos_nave' ? phen.lootCredits ?? 280 : 0;

    // Meteor Field mining has hull damage risk mitigated by Pilot crew skill
    let meteorDamageTaken = 0;
    let meteorHitMsg = '';
    if (phen.kind === 'campo_meteoros') {
      const hasSup = campaign.supplies > 0;
      const navSkill = getEffectiveRoleSkill(campaign.crew, 'piloto_navegador', hasSup);
      const combatSkill = getEffectiveRoleSkill(campaign.crew, 'piloto_combate', hasSup);
      const pilotMitigationPct = Math.min(34, Math.round(navSkill * 0.28 + combatSkill * 0.18));
      const damageChancePct = Math.max(8, 42 - pilotMitigationPct);
      if (Math.random() * 100 < damageChancePct) {
        meteorDamageTaken = 14 + Math.round(Math.random() * 14);
      }
    }

    setCampaign((prev) => {
      if (!prev) return prev;
      const ship = prev.ships.find((s) => s.uid === prev.activeShipUid) ?? prev.ships[0];
      const st = computeShipDerivedStats(ship, computeCrewBonuses(prev));

      let nextShips = prev.ships;
      if (meteorDamageTaken > 0) {
        const dmgRes = applyShipDamageState(prev.ships, ship.uid, st.maxShield, st.armor, meteorDamageTaken);
        nextShips = dmgRes.nextShips;
        if (dmgRes.destroyed) {
          setHullDestroyedModal(true);
        }
        meteorHitMsg = ` Impacto de fragmento! (-${dmgRes.hullLost} casco / -${dmgRes.shieldLost} escudo)`;
      }

      const nextCargo = phen.resourceId
        ? addCargoItem(prev.cargo, phen.resourceId, phen.kind === 'destrocos_nave' ? 4 : collected, 0, st.cargoCapacity, prev).nextCargo
        : prev.cargo;
      const nextMissions =
        phen.hasSurvivors
          ? prev.missions.map((m) =>
              m.status === 'aceita' && m.type === 'resgate_escolta' && m.targetSystemId === prev.currentSystemId
                ? { ...m, rescueCompleted: true }
                : m
            )
          : prev.missions;

      return {
        ...prev,
        ships: nextShips,
        credits: prev.credits + lootCr,
        cargo: nextCargo,
        missions: nextMissions,
        phenomenonCooldowns: {
          ...prev.phenomenonCooldowns,
          [phen.id]: Math.max(0, remaining - collected),
        },
        logbook: [
          ...prev.logbook,
          makeLog(
            meteorDamageTaken > 0 ? 'combate' : 'exploracao',
            `Interação com ${phen.name}: recursos e dados recuperados.${meteorHitMsg}`,
            prev.gameTimeSeconds
          ),
        ],
      };
    });

    if (meteorDamageTaken > 0) {
      notify(`${phen.name} minerado, mas um meteoro atingiu o casco! (-${meteorDamageTaken} dano bruto)`);
    } else {
      notify(`${phen.name} explorado com sucesso!`);
    }
  };

  // Economy, Equipment, Shipyard & Crew Handlers
  const handleBuyResource = (resourceId: string, qty: number, unitPrice: number) => {
    if (!campaign || !shipStats) return;
    const total = unitPrice * qty;
    if (campaign.credits < total) return;
    const curTotal = compartmentUsed(campaign, activeShip);
    if (curTotal + qty > shipStats.cargoCapacity) {
      notify('O compartimento de carga não tem espaço.');
      return;
    }
    soundEngine.playClick();
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credits: prev.credits - total,
        cargo: addCargoItem(prev.cargo, resourceId, qty, unitPrice, shipStats.cargoCapacity, prev).nextCargo,
      };
    });
  };

  const handleSellResource = (resourceId: string, qty: number) => {
    if (!campaign || !currentSystem) return;
    const res = RESOURCES_BY_ID[resourceId];
    if (!res || qty <= 0) return;
    const held = campaign.cargo.find((entry) => entry.resourceId === resourceId)?.qty ?? 0;
    const sellQty = Math.min(qty, held);
    if (sellQty <= 0) return;
    const planetId = campaign.orbitingPlanetId;
    const band = resourceSupplyBand(resourceId, planetId, currentSystem.planets);
    const already = planetId ? campaign.planetSales?.[planetId]?.[resourceId] ?? 0 : 0;
    const tradeBonus = bonuses?.tradePriceBonus ?? 0;
    const { total } = quoteSale(res.basePrice, band, tradeBonus, already, sellQty, Boolean(planetId));
    soundEngine.playClick();
    setCampaign((prev) => {
      if (!prev) return prev;
      const nextSales = { ...(prev.planetSales ?? {}) };
      if (planetId) {
        const bucket = { ...(nextSales[planetId] ?? {}) };
        bucket[resourceId] = (bucket[resourceId] ?? 0) + sellQty;
        nextSales[planetId] = bucket;
      }
      return {
        ...prev,
        credits: prev.credits + total,
        cargo: removeCargoItem(prev.cargo, resourceId, sellQty),
        planetSales: nextSales,
      };
    });
    notify(`Vendido ${sellQty} ${res.name} por ${total} créditos.`);
  };

  const handleBuyConsumable = (consumableId: string, price: number) => {
    if (!campaign || !activeShip || !shipStats || campaign.credits < price) return;
    const def = CONSUMABLES_BY_ID[consumableId];
    if (!def) return;
    if (compartmentUsed(campaign, activeShip) + 1 > shipStats.cargoCapacity) {
      notify('O compartimento de carga não tem espaço.');
      return;
    }
    soundEngine.playClick();
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credits: prev.credits - price,
        consumables: {
          ...prev.consumables,
          [consumableId]: (prev.consumables[consumableId] ?? 0) + 1,
        },
      };
    });
    notify(`${def.name} foi para o compartimento de carga.`);
  };

  const applyInstantCombatBlast = (damageAll: number, stripShieldPct: number, actionLabel: string) => {
    if (!currentSystem || activeEnemies.length === 0) return;
    const sys = currentSystem;
    const defeatedEnemies: Array<{ factionId: string; techLevel: number; huntMissionId?: string }> = [];
    const survivors: ActiveEnemy[] = [];

    for (const enemy of activeEnemies) {
      let sh = Math.max(0, enemy.shield * (1 - Math.max(0, Math.min(0.95, stripShieldPct))));
      let hl = enemy.hull;
      if (damageAll > 0) {
        const absorbed = Math.min(sh, damageAll);
        sh -= absorbed;
        hl -= damageAll - absorbed;
      }
      if (hl > 0) {
        survivors.push({ ...enemy, shield: sh, hull: hl });
      } else {
        defeatedEnemies.push({ factionId: enemy.factionId, techLevel: enemy.techLevel, huntMissionId: enemy.huntMissionId });
      }
    }

    setActiveEnemies(survivors);
    soundEngine.playWeapon('plasma');

    if (defeatedEnemies.length > 0) {
      let warAnnouncement: string | null = null;
      setCampaign((prev) => {
        if (!prev) return prev;
        const curShip = prev.ships.find((s) => s.uid === prev.activeShipUid) ?? prev.ships[0];
        const st = computeShipDerivedStats(curShip, computeCrewBonuses(prev));
        const lootCr = defeatedEnemies.reduce(
          (sum, enemy) => sum + 50 * Math.max(1, Math.round(enemy.techLevel)),
          0
        );
        const lootResId = sys.rareMultiplier > 1.3 ? 'ligas_avancadas' : 'titanio';
        const nextCargo = addCargoItem(prev.cargo, lootResId, defeatedEnemies.length * 2, 0, st.cargoCapacity, prev).nextCargo;
        const nextMissions = markDefeatedHuntMissions(prev.missions, defeatedEnemies, survivors.length === 0);

        let updatedState: PlayerCampaignState = {
          ...prev,
          credits: prev.credits + lootCr,
          cargo: nextCargo,
          missions: nextMissions,
          logbook: [
            ...prev.logbook,
            makeLog(
              'combate',
              `${actionLabel}: ${defeatedEnemies.length} inimigo(s) abatido(s) em ${sys.name}! (+${lootCr} créditos)`,
              prev.gameTimeSeconds
            ),
          ],
        };
        const warRes = applyPlayerKillToWars(updatedState, defeatedEnemies);
        updatedState = warRes.nextCampaign;
        if (warRes.announcements.length > 0) {
          warAnnouncement = warRes.announcements[0];
        }
        return updatedState;
      });
      if (warAnnouncement) notify(warAnnouncement);
    }
  };

  const handleUseConsumable = (consumableId: string, source: 'compartimento' | 'cofre' = 'compartimento') => {
    if (!campaign || !activeShip || !shipStats || !bonuses) return;
    const vaultKits = normalizeFactionVault(campaign.factionVault).consumables;
    const count = source === 'cofre' ? (vaultKits[consumableId] ?? 0) : (campaign.consumables[consumableId] ?? 0);
    if (count <= 0) return;
    const def = CONSUMABLES_BY_ID[consumableId];
    if (!def) return;

    if (def.kind === 'combustivel' && campaign.fuel >= shipStats.fuelCapacity - 0.05) {
      notify('Tanque de combustível já está cheio.');
      return;
    }
    if (def.kind === 'reparo' && activeShip.currentHull >= shipStats.maxHull - 0.05) {
      notify('Casco da nave já está em 100%.');
      return;
    }
    if (def.kind === 'escudo_desc') {
      if (shipStats.maxShield <= 0) {
        notify('Esta nave não possui módulo de escudo equipado.');
        return;
      }
      if (activeShip.currentShield >= shipStats.maxShield - 0.05) {
        notify('Escudo já está totalmente carregado.');
        return;
      }
    }
    if (def.kind === 'especial_raca') {
      const fx = def.combatEffect;
      const cmp = def.campaignEffect;
      const combatDmgOnly = Boolean(fx?.damageAllEnemies && !fx.hullHeal && !fx.shieldRestore && !cmp);
      if (combatDmgOnly && activeEnemies.length === 0) {
        notify(`${def.name} só pode ser disparado durante um combate ativo.`);
        return;
      }
    }
    if (def.kind === 'saude' || def.campaignEffect?.healthGain || def.campaignEffect?.healthPotency) {
      const maxNow = 100 + Math.max(0, campaign.healthPotency ?? 0);
      const gain = def.campaignEffect?.healthGain ?? (def.kind === 'saude' ? def.amount : 0);
      const potency = def.campaignEffect?.healthPotency ?? 0;
      if ((campaign.crewHealth ?? 100) >= maxNow - 0.05 && potency <= 0 && gain > 0) {
        notify('A saúde da tripulação já está no teto.');
        return;
      }
    }

    soundEngine.playClick();
    setCampaign((prev) => {
      if (!prev) return prev;
      let nextFuel = prev.fuel;
      let nextSupplies = prev.supplies;
      let nextShips = prev.ships;
      let nextCrewHealth = prev.crewHealth ?? 100;
      let nextPotency = prev.healthPotency ?? 0;

      if (def.kind === 'combustivel') {
        nextFuel = Math.min(shipStats.fuelCapacity, prev.fuel + def.amount);
      } else if (def.kind === 'mantimentos') {
        nextSupplies = prev.supplies + def.amount;
      } else if (def.kind === 'reparo') {
        const heal = Math.round(def.amount * bonuses.repairKitMult);
        nextShips = prev.ships.map((s) =>
          s.uid === prev.activeShipUid
            ? { ...s, currentHull: Math.min(shipStats.maxHull, s.currentHull + heal) }
            : s
        );
      } else if (def.kind === 'escudo_desc') {
        nextShips = prev.ships.map((s) =>
          s.uid === prev.activeShipUid
            ? { ...s, currentShield: Math.min(shipStats.maxShield, s.currentShield + def.amount) }
            : s
        );
      } else if (def.kind === 'especial_raca') {
        const fx = def.combatEffect;
        const cmp = def.campaignEffect;
        if (cmp?.fuelGain) nextFuel = Math.min(shipStats.fuelCapacity, nextFuel + cmp.fuelGain);
        if (cmp?.suppliesGain) nextSupplies += cmp.suppliesGain;
        if (fx?.hullHeal || fx?.shieldRestore) {
          nextShips = prev.ships.map((s) =>
            s.uid === prev.activeShipUid
              ? {
                  ...s,
                  currentHull: Math.min(shipStats.maxHull, s.currentHull + (fx.hullHeal ?? 0)),
                  currentShield: Math.min(shipStats.maxShield, s.currentShield + (fx.shieldRestore ?? 0)),
                }
              : s
          );
        }
      }

      const healthGain = def.campaignEffect?.healthGain ?? (def.kind === 'saude' ? def.amount : 0);
      const potencyGain = def.campaignEffect?.healthPotency ?? 0;
      if (healthGain || potencyGain) {
        nextPotency += potencyGain;
        const maxHealth = 100 + Math.max(0, nextPotency);
        nextCrewHealth = Math.max(0, Math.min(maxHealth, nextCrewHealth + healthGain));
      }

      if (source === 'cofre') {
        const vault = normalizeFactionVault(prev.factionVault);
        const left = Math.max(0, (vault.consumables[consumableId] ?? 0) - 1);
        const nextKits = { ...vault.consumables };
        if (left <= 0) delete nextKits[consumableId];
        else nextKits[consumableId] = left;
        return {
          ...prev,
          fuel: nextFuel,
          supplies: nextSupplies,
          ships: nextShips,
          crewHealth: nextCrewHealth,
          healthPotency: nextPotency,
          factionVault: { ...vault, consumables: nextKits },
        };
      }

      return {
        ...prev,
        fuel: nextFuel,
        supplies: nextSupplies,
        ships: nextShips,
        crewHealth: nextCrewHealth,
        healthPotency: nextPotency,
        consumables: {
          ...prev.consumables,
          [consumableId]: Math.max(0, (prev.consumables[consumableId] ?? 0) - 1),
        },
      };
    });

    if (def.kind === 'especial_raca' && def.combatEffect?.damageAllEnemies && activeEnemies.length > 0) {
      applyInstantCombatBlast(def.combatEffect.damageAllEnemies, 0, def.name);
    }

    notify(`${def.name} utilizado.`);
  };

  const handleTriggerAbility = (abilityId: string) => {
    if (!campaign || !activeShip || !shipStats) return;
    if (!(campaign.specialAbilityIds ?? []).includes(abilityId)) return;
    const ab = SPECIAL_ABILITIES_BY_ID[abilityId];
    if (!ab || ab.kind !== 'combate_ativa' || !ab.combatAction) return;

    const readyAt = campaign.abilityCooldowns?.[abilityId] ?? 0;
    if (campaign.gameTimeSeconds < readyAt) return;

    soundEngine.playClick();
    const act = ab.combatAction;
    setCampaign((prev) => {
      if (!prev) return prev;
      const curShip = prev.ships.find((s) => s.uid === prev.activeShipUid) ?? prev.ships[0];
      const st = computeShipDerivedStats(curShip, computeCrewBonuses(prev));
      const nextShips =
        act.hullHeal || act.shieldRestore
          ? prev.ships.map((s) =>
              s.uid === curShip.uid
                ? {
                    ...s,
                    currentHull: Math.min(st.maxHull, s.currentHull + (act.hullHeal ?? 0)),
                    currentShield: Math.min(st.maxShield, s.currentShield + (act.shieldRestore ?? 0)),
                  }
                : s
            )
          : prev.ships;

      return {
        ...prev,
        ships: nextShips,
        abilityCooldowns: {
          ...(prev.abilityCooldowns ?? {}),
          [abilityId]: prev.gameTimeSeconds + (ab.cooldownSec ?? 24),
        },
      };
    });

    if ((act.damageAllEnemies || act.stripEnemyShieldPct) && activeEnemies.length > 0) {
      applyInstantCombatBlast(act.damageAllEnemies ?? 0, act.stripEnemyShieldPct ?? 0, ab.name);
    }
    notify(`Habilidade ativada: ${ab.name}!`);
  };

  const handleBuyEquipment = (
    category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit',
    itemId: string,
    price: number
  ) => {
    if (!campaign || !activeShip || !shipStats || campaign.credits < price) return;
    if (compartmentUsed(campaign, activeShip) + 1 > shipStats.cargoCapacity) {
      notify('O compartimento de carga não tem espaço.');
      return;
    }
    soundEngine.playClick();
    const stored = {
      uid: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category,
      itemId,
      avgCostPaid: price,
    };
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credits: prev.credits - price,
        ships: prev.ships.map((s) =>
          s.uid === activeShip.uid ? { ...s, depot: [...s.depot, stored] } : s
        ),
      };
    });
    notify('A peça foi para o compartimento de carga.');
  };

  const handleUnequipToCompartment = (
    category: 'weapon' | 'shield' | 'jumpDrive' | 'extractor' | 'utility' | 'suit',
    itemId: string,
    slotIndex: number
  ) => {
    if (!campaign || !activeShip || !shipStats) return;
    if (compartmentUsed(campaign, activeShip) + 1 > shipStats.cargoCapacity) {
      notify('O compartimento de carga não tem espaço para guardar essa peça.');
      return;
    }
    const hull = HULLS_BY_ID[activeShip.hullId];
    const next = {
      ...activeShip,
      shieldIds: [...activeShip.shieldIds],
      extractorIds: [...activeShip.extractorIds],
      utilityIds: [...activeShip.utilityIds],
      suitGearIds: [...activeShip.suitGearIds],
      depot: [...activeShip.depot],
    };
    const priceOf = () => {
      if (category === 'weapon') return WEAPONS_BY_ID[itemId]?.price ?? 0;
      if (category === 'shield') return SHIELDS_BY_ID[itemId]?.price ?? 0;
      if (category === 'jumpDrive') return JUMP_DRIVES_BY_ID[itemId]?.price ?? 0;
      if (category === 'extractor') return EXTRACTORS_BY_ID[itemId]?.price ?? 0;
      if (category === 'utility') return UTILITY_BY_ID[itemId]?.price ?? 0;
      return SUIT_GEAR_BY_ID[itemId]?.price ?? 0;
    };
    let removed = false;
    if (category === 'weapon' && next.weaponId === itemId) {
      next.weaponId = null;
      removed = true;
    } else if (category === 'jumpDrive' && next.jumpDriveId === itemId) {
      next.jumpDriveId = '';
      removed = true;
    } else if (category === 'shield' && next.shieldIds[slotIndex] === itemId) {
      next.shieldIds.splice(slotIndex, 1);
      removed = true;
    } else if (category === 'extractor' && next.extractorIds[slotIndex] === itemId) {
      next.extractorIds.splice(slotIndex, 1);
      removed = true;
    } else if (category === 'utility' && next.utilityIds[slotIndex] === itemId) {
      next.utilityIds.splice(slotIndex, 1);
      removed = true;
    } else if (category === 'suit' && next.suitGearIds[slotIndex] === itemId) {
      next.suitGearIds.splice(slotIndex, 1);
      removed = true;
    }
    if (!removed || !hull) return;
    next.depot.push({
      uid: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category,
      itemId,
      avgCostPaid: priceOf(),
    });
    soundEngine.playClick();
    setCampaign((prev) =>
      prev ? { ...prev, ships: prev.ships.map((s) => (s.uid === activeShip.uid ? next : s)) } : prev
    );
    notify('A peça voltou ao compartimento de carga.');
  };

  const handleEquipFromDepot = (depotUid: string) => {
    soundEngine.playClick();
    let error: string | null = null;
    setCampaign((prev) => {
      if (!prev) return prev;
      const ship = prev.ships.find((entry) => entry.uid === prev.activeShipUid) ?? prev.ships[0];
      const item = ship?.depot.find((entry) => entry.uid === depotUid);
      if (!ship || !item) {
        error = 'A peça não está no compartimento.';
        return prev;
      }
      const installed = installGearOnShip(ship, item);
      if (!installed.ok) {
        error = installed.error ?? 'Não foi possível equipar.';
        return prev;
      }
      error = null;
      const nextShip = {
        ...installed.ship,
        depot: [...ship.depot.filter((entry) => entry.uid !== depotUid), ...installed.displaced],
      };
      return {
        ...prev,
        ships: prev.ships.map((entry) => (entry.uid === ship.uid ? nextShip : entry)),
      };
    });
    if (error) notify(error);
  };

  const applyVault = (run: (state: PlayerCampaignState) => VaultOp) => {
    soundEngine.playClick();
    let message = '';
    setCampaign((prev) => {
      if (!prev) return prev;
      const res = run(prev);
      message = res.message;
      return res.ok ? res.state : prev;
    });
    if (message) notify(message);
  };

  const applyShipSwitchAndFaction = (
    prev: PlayerCampaignState,
    targetShipUid: string,
    extraShips?: OwnedShip[]
  ): { next: PlayerCampaignState; switchedFactionName?: string } => {
    const shipsList = extraShips ?? prev.ships;
    const targetShip = shipsList.find((s) => s.uid === targetShipUid);
    if (!targetShip) return { next: prev };

    const hull = HULLS_BY_ID[targetShip.hullId];
    const newFactionId = targetShip.factionId ?? hull?.factionExclusiveId ?? prev.chosenFactionId;
    const factionChanged = newFactionId !== prev.chosenFactionId;
    const knownSet = new Set(prev.knownFactionIds);
    if (newFactionId) knownSet.add(newFactionId);

    const nextRenown = { ...prev.factionRenown };
    if (factionChanged && newFactionId && (nextRenown[newFactionId] ?? 0) < 20 && (nextRenown[newFactionId] ?? 0) > -30) {
      nextRenown[newFactionId] = 25;
    }

    const facName = newFactionId ? FACTIONS_BY_ID[newFactionId]?.name : undefined;
    const nextLogs = factionChanged
      ? [
          ...prev.logbook,
          makeLog(
            'diplomacia',
            `Nave ${targetShip.customName} assumida: alinhamento transferido para ${facName ?? newFactionId}.`,
            prev.gameTimeSeconds
          ),
        ]
      : prev.logbook;

    return {
      next: {
        ...prev,
        ships: shipsList,
        activeShipUid: targetShipUid,
        chosenFactionId: newFactionId,
        knownFactionIds: Array.from(knownSet),
        factionRenown: nextRenown,
        logbook: nextLogs,
      },
      switchedFactionName: factionChanged ? facName : undefined,
    };
  };

  const handleBuyHull = (hullId: string, price: number) => {
    if (!campaign || campaign.credits < price) return;
    const h = HULLS_BY_ID[hullId];
    if (!h) return;
    soundEngine.playClick();

    const orbPlanet = campaign.orbitingPlanetId
      ? currentSystem?.planets.find((p) => p.id === campaign.orbitingPlanetId)
      : undefined;
    const localFacId =
      (orbPlanet ? getPlanetControllingFaction(orbPlanet, campaign) : null) ??
      currentSystem?.controllingFactionId;
    const shipFactionId = h.factionExclusiveId ?? localFacId ?? campaign.chosenFactionId;
    const shipColor = FACTIONS_BY_ID[shipFactionId]?.color ?? '#38bdf8';

    const newShip: OwnedShip = {
      uid: `ship_${Date.now()}`,
      hullId,
      customName: `${h.name.split(' ')[0]} #${campaign.ships.length + 1}`,
      factionId: shipFactionId,
      color: shipColor,
      avgCostPaid: price,
      currentHull: h.maxHull,
      currentShield: 0,
      weaponId: 'laser_civil_mk1',
      shieldIds: [],
      jumpDriveId: 'motor_curto_mk1',
      extractorIds: ['broca_mineral_basica'],
      utilityIds: [],
      suitGearIds: [],
      depot: [],
    };
    const facChanged = shipFactionId !== campaign.chosenFactionId;
    setCampaign((prev) => {
      if (!prev) return prev;
      const baseNext: PlayerCampaignState = {
        ...prev,
        credits: prev.credits - price,
        logbook: [...prev.logbook, makeLog('comercio', `Nova nave adquirida: ${h.name}.`, prev.gameTimeSeconds)],
      };
      return applyShipSwitchAndFaction(baseNext, newShip.uid, [...prev.ships, newShip]).next;
    });
    notify(
      facChanged
        ? `Nova nave ${h.name} adquirida! Facção ativa alterada para ${FACTIONS_BY_ID[shipFactionId]?.name ?? shipFactionId}.`
        : `Nova nave ${h.name} adquirida e definida como ativa!`
    );
  };

  const handleSellShip = (shipUid: string, sellPrice: number) => {
    if (!campaign || campaign.ships.length <= 1 || shipUid === campaign.activeShipUid) return;
    soundEngine.playClick();
    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            credits: prev.credits + sellPrice,
            ships: prev.ships.filter((s) => s.uid !== shipUid),
          }
        : prev
    );
    notify(`Nave vendida por ${sellPrice.toLocaleString('pt-BR')} créditos.`);
  };

  const handleBuyBlueprint = (blueprintId: string, price: number) => {
    if (!campaign || campaign.credits < price || campaign.blueprintsOwned.includes(blueprintId)) return;
    soundEngine.playClick();
    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            credits: prev.credits - price,
            blueprintsOwned: [...prev.blueprintsOwned, blueprintId],
          }
        : prev
    );
    notify('Projeto adquirido para o Estaleiro!');
  };

  const handleCraftBlueprint = (blueprintId: string) => {
    if (!campaign || !activeShip) return;
    const bp = BLUEPRINTS_BY_ID[blueprintId];
    if (!bp || campaign.credits < bp.craftCredits) return;
    const hasAll = bp.requiredResources.every(
      (r) => (campaign.cargo.find((c) => c.resourceId === r.resourceId)?.qty ?? 0) >= r.qty
    );
    if (!hasAll) return;

    soundEngine.playClick();
    const orbPlanet = campaign.orbitingPlanetId
      ? currentSystem?.planets.find((p) => p.id === campaign.orbitingPlanetId)
      : undefined;
    const localFacId =
      (orbPlanet ? getPlanetControllingFaction(orbPlanet, campaign) : null) ??
      currentSystem?.controllingFactionId;

    let craftedHullFactionName: string | undefined;
    setCampaign((prev) => {
      if (!prev) return prev;
      let nextCargo = prev.cargo;
      bp.requiredResources.forEach((r) => {
        nextCargo = removeCargoItem(nextCargo, r.resourceId, r.qty);
      });

      const nextCrafted = (prev.craftedBlueprintIds ?? []).includes(blueprintId)
        ? prev.craftedBlueprintIds
        : [...(prev.craftedBlueprintIds ?? []), blueprintId];

      if (bp.targetCategory === 'hull') {
        const h = HULLS_BY_ID[bp.targetId];
        const shipFactionId =
          bp.factionExclusiveId ?? h?.factionExclusiveId ?? localFacId ?? prev.chosenFactionId;
        const shipColor = FACTIONS_BY_ID[shipFactionId]?.color ?? '#38bdf8';
        if (shipFactionId !== prev.chosenFactionId) {
          craftedHullFactionName = FACTIONS_BY_ID[shipFactionId]?.name ?? shipFactionId;
        }
        const built: OwnedShip = {
          uid: `ship_${Date.now()}`,
          hullId: bp.targetId,
          customName: `${h.name.split(' ')[0]} Forjada`,
          factionId: shipFactionId,
          color: shipColor,
          avgCostPaid: bp.craftCredits,
          currentHull: h.maxHull,
          currentShield: 0,
          weaponId: 'laser_civil_mk1',
          shieldIds: [],
          jumpDriveId: 'motor_curto_mk1',
          extractorIds: ['broca_mineral_basica'],
          utilityIds: [],
          suitGearIds: [],
          depot: [],
        };
        const baseNext: PlayerCampaignState = {
          ...prev,
          credits: prev.credits - bp.craftCredits,
          cargo: nextCargo,
          craftedBlueprintIds: nextCrafted,
          logbook: [...prev.logbook, makeLog('comercio', `Construído casco avançado: ${h.name}.`, prev.gameTimeSeconds)],
        };
        return applyShipSwitchAndFaction(baseNext, built.uid, [...prev.ships, built]).next;
      }

      const cat = bp.targetCategory;
      const updated = storeInCompartment(activeShip, cat, bp.targetId, bp.craftCredits);
      if (!updated) return prev;
      return {
        ...prev,
        credits: prev.credits - bp.craftCredits,
        cargo: nextCargo,
        craftedBlueprintIds: nextCrafted,
        ships: prev.ships.map((s) => (s.uid === activeShip.uid ? updated : s)),
        logbook: [...prev.logbook, makeLog('comercio', `Construída peça de projeto: ${bp.name}.`, prev.gameTimeSeconds)],
      };
    });
    notify(
      craftedHullFactionName
        ? `Nave construída: ${bp.name}! Facção ativa alterada para ${craftedHullFactionName}.`
        : `Construção concluída: ${bp.name}!`
    );
  };

  const handleHireCrew = (candidate: CrewMember) => {
    if (!campaign || campaign.credits < candidate.hireCost) return;
    soundEngine.playClick();
    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            credits: prev.credits - candidate.hireCost,
            crew: [...prev.crew, candidate],
            logbook: [
              ...prev.logbook,
              makeLog('tripulacao', `Tripulante ${candidate.name} contratado como ${candidate.role}.`, prev.gameTimeSeconds),
            ],
          }
        : prev
    );
    notify(`${candidate.name} embarcou na tripulação!`);
  };

  const handleToggleCrewStatus = (crewId: string) => {
    if (!campaign || !activeShip) return;
    const hull = HULLS_BY_ID[activeShip.hullId];
    const target = campaign.crew.find((m) => m.id === crewId);
    if (!target) return;

    const activeCount = campaign.crew.filter((m) => m.status === 'ativo').length;
    const reserveCount = campaign.crew.filter((m) => m.status === 'reserva').length;

    if (target.status === 'ativo' && reserveCount >= hull.reserveQuarters) return;
    if (target.status === 'reserva' && activeCount >= hull.activeCrewPosts) return;

    soundEngine.playClick();
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        crew: prev.crew.map((m) => {
          if (m.id === crewId) {
            return { ...m, status: target.status === 'ativo' ? 'reserva' : 'ativo' };
          }
          // If activating into an occupied role, swap existing active specialist to reserve
          if (target.status === 'reserva' && m.status === 'ativo' && m.role === target.role) {
            return { ...m, status: 'reserva' };
          }
          return m;
        }),
      };
    });
  };

  const handleDismissCrew = (crewId: string) => {
    soundEngine.playClick();
    setCampaign((prev) =>
      prev ? { ...prev, crew: prev.crew.filter((m) => m.id !== crewId) } : prev
    );
  };

  // Missions & Diplomacy
  const handleAcceptMission = (mission: Mission) => {
    if (!campaign) return;
    const acceptedCount = campaign.missions.filter((m) => m.status === 'aceita').length;
    if (acceptedCount >= 5) return;
    soundEngine.playClick();
    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            missions: [...prev.missions, { ...mission, status: 'aceita' }],
          }
        : prev
    );
    notify(`Missão aceita: ${mission.title}`);
  };

  const handleCompleteMission = (mission: Mission) => {
    if (!campaign || !bonuses) return;
    const check = checkMissionReadyInLocation(mission, campaign);
    if (!check.ready) {
      notify(check.reason);
      return;
    }

    soundEngine.playClick();
    const finalRenown = Math.round(mission.rewardRenown * bonuses.diplomatRenownMult);
    const rewardBpName =
      mission.rewardBlueprintId
        ? mission.rewardItemName ?? BLUEPRINTS_BY_ID[mission.rewardBlueprintId]?.name ?? mission.rewardBlueprintId
        : null;

    setCampaign((prev) => {
      if (!prev) return prev;
      let nextCargo = prev.cargo;
      if ((mission.type === 'entrega_comercio' || mission.type === 'coleta_raro') && mission.requiredResourceId) {
        nextCargo = removeCargoItem(nextCargo, mission.requiredResourceId, mission.requiredQty ?? 1);
      }

      const updatedMissions = prev.missions.map((m) =>
        m.id === mission.id ? { ...m, status: 'finalizada' as const } : m
      );

      // Advance faction chain mission 1/3 -> 2/3 -> 3/3
      if (mission.type === 'cadeia_faccao' && (mission.chainStep ?? 1) < (mission.chainTotal ?? 3)) {
        const nextStep = (mission.chainStep ?? 1) + 1;
        const sysSummary = getSystemSummaryById(prev.currentSystemId)!;
        const near = getSystemsInRadius(sysSummary, 38).filter((s) => !s.isBlackHole);
        const nextTarget = near[(nextStep * 5) % Math.max(1, near.length)] ?? sysSummary;
        const nextFull = generateSolarSystem(nextTarget);
        const p = nextFull.planets[0];
        updatedMissions.push({
          ...mission,
          id: `chain_${Date.now()}`,
          title: `Operação Estratégica da Facção (${nextStep}/3)`,
          targetSystemId: nextTarget.id,
          targetSystemName: nextTarget.name,
          targetSystemCoord: { x: nextTarget.x, y: nextTarget.y, z: nextTarget.z },
          targetPlanetId: p?.id,
          targetPlanetName: p?.name,
          chainStep: nextStep,
          rewardCredits: Math.round(mission.rewardCredits * 1.35),
          rewardRenown: mission.rewardRenown + 8,
          status: 'aceita',
          description: `Fase ${nextStep}/3: seguir para a órbita de ${p?.name ?? nextTarget.name} (${nextTarget.name}).`,
        });
      }

      const nextBlueprints =
        mission.rewardBlueprintId && !prev.blueprintsOwned.includes(mission.rewardBlueprintId)
          ? [...prev.blueprintsOwned, mission.rewardBlueprintId]
          : prev.blueprintsOwned;

      return {
        ...prev,
        credits: prev.credits + mission.rewardCredits,
        cargo: nextCargo,
        blueprintsOwned: nextBlueprints,
        missions: updatedMissions,
        factionRenown: {
          ...prev.factionRenown,
          [mission.issuerFactionId]: (prev.factionRenown[mission.issuerFactionId] ?? 0) + finalRenown,
        },
        logbook: [
          ...prev.logbook,
          makeLog(
            'diplomacia',
            `Missão concluída: ${mission.title} (+${mission.rewardCredits} cr, +${finalRenown} Reputação${
              rewardBpName ? `, Projeto: ${rewardBpName}` : ''
            }).`,
            prev.gameTimeSeconds
          ),
        ],
      };
    });
    notify(
      rewardBpName
        ? `Missão concluída! +${mission.rewardCredits} créditos, +${finalRenown} Reputação e Projeto: ${rewardBpName}!`
        : `Missão concluída! +${mission.rewardCredits} créditos e +${finalRenown} Reputação.`
    );
  };

  const handleAbandonMission = (missionId: string) => {
    soundEngine.playClick();
    setCampaign((prev) =>
      prev ? { ...prev, missions: prev.missions.filter((m) => m.id !== missionId) } : prev
    );
  };

  const handleFormAlliance = (factionId: string) => {
    if (!campaign || !activeShip) return;
    const piloted = activeShip.factionId ?? campaign.chosenFactionId;
    const renown = campaign.factionRenown[factionId] ?? 0;
    const wars = new Set([
      ...(campaign.activeWars[piloted] ?? []),
      ...(FACTIONS_BY_ID[piloted]?.warsWith ?? []),
      ...(FACTIONS_BY_ID[factionId]?.warsWith.includes(piloted) ? [factionId] : []),
    ]);
    if (factionId === piloted || renown <= 80 || wars.has(factionId)) {
      notify('Eles recusam o pacto. É preciso reputação acima de oitenta com essa facção, e nenhuma guerra em aberto.');
      return;
    }
    soundEngine.playClick();
    const fac = FACTIONS_BY_ID[factionId];
    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            formalAlliances: prev.formalAlliances.includes(factionId)
              ? prev.formalAlliances
              : [...prev.formalAlliances, factionId],
            logbook: [
              ...prev.logbook,
              makeLog('diplomacia', `Aliança Formal assinada com ${fac?.name}!`, prev.gameTimeSeconds),
            ],
          }
        : prev
    );
    notify(`Aliança Formal estabelecida com ${fac?.name}!`);
  };

  // Recovery from Hull Destruction (Section 16.2)
  const handleEscapePodRescue = () => {
    if (!campaign) return;
    soundEngine.playWarp();
    const homeFac = FACTIONS_BY_ID[campaign.chosenFactionId];
    const homeSysId = homeFac?.capitalSystemId ?? campaign.visitedSystemIds[0];
    const homeSys = getSystemSummaryById(homeSysId) ?? currentSystemSummary!;
    const homeFull = generateSolarSystem(homeSys);
    const homePlanet = homeFull.planets.find((p) => p.level === 5) ?? homeFull.planets[0];
    const fee = Math.min(campaign.credits, Math.round(campaign.credits * 0.2));

    setHullDestroyedModal(false);
    setActiveEnemies([]);
    setHostileCountdown(null);
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credits: prev.credits - fee,
        cargo: [],
        fuel: Math.max(prev.fuel, 60),
        currentSystemId: homeFull.id,
        orbitingPlanetId: homePlanet?.id ?? null,
        playerPos: homePlanet
          ? {
              x: Math.cos(homePlanet.orbitPhase) * homePlanet.orbitRadius,
              z: Math.sin(homePlanet.orbitPhase) * homePlanet.orbitRadius,
            }
          : { x: 24, z: 0 },
        ships: prev.ships.map((s) =>
          s.uid === prev.activeShipUid
            ? { ...s, currentHull: Math.round(HULLS_BY_ID[s.hullId].maxHull * 0.65), currentShield: 0 }
            : s
        ),
        logbook: [
          ...prev.logbook,
          makeLog(
            'combate',
            `A cápsula chega a ${homeFull.name}. O compartimento de carga ficou no naufrágio. O resgate cobra ${fee} créditos.`,
            prev.gameTimeSeconds
          ),
        ],
      };
    });
    notify(`A cápsula chega a ${homeFull.name}. O compartimento de carga se perdeu e o resgate cobrou parte dos créditos.`);
  };

  const handleResetCampaign = () => {
    clearSavedCampaign();
    setCampaign(null);
    setHullDestroyedModal(false);
    setActiveEnemies([]);
  };

  if (!campaign || !currentSystem || !activeShip || !shipStats) {
    return (
      <StartScreen
        existingSave={existingSave}
        onContinueSave={handleContinueSave}
        onStartNewGame={handleStartNewGame}
      />
    );
  }

  const isOpeningSequence =
    Boolean(vnNodes && vnNodes[vnIndex]?.isOpening) || !campaign.openingCompleted;

  if (isOpeningSequence) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#040710] text-slate-100 select-none">
        {vnNodes && vnNodes[vnIndex] && (
          <VisualNovelOverlay node={vnNodes[vnIndex]} onSelectChoice={handleVnChoice} />
        )}
      </div>
    );
  }

  const totalCargo = activeShip ? compartmentUsed(campaign, activeShip) : 0;
  const acceptedMissions = campaign.missions.filter((m) => m.status === 'aceita');
  const systemOwner = currentSystem.controllingFactionId
    ? FACTIONS_BY_ID[currentSystem.controllingFactionId]
    : null;
  const currentRenown = systemOwner ? campaign.factionRenown[systemOwner.id] ?? 0 : 0;
  const currentRenownTier = systemOwner
    ? getRenownTierName(currentRenown, campaign.formalAlliances.includes(systemOwner.id))
    : 'Território Livre';
  const orbitingPlanet = campaign.orbitingPlanetId
    ? currentSystem.planets.find((p) => p.id === campaign.orbitingPlanetId) ?? null
    : null;

  const selectedPlanet =
    drawer.kind === 'planet'
      ? currentSystem.planets.find((p) => p.id === drawer.planetId) ?? null
      : null;
  const selectedPhenomenon =
    drawer.kind === 'phenomenon'
      ? currentSystem.phenomena.find((ph) => ph.id === drawer.phenomenonId) ?? null
      : null;

  const rightPanelOpen = drawer.kind !== 'none';
  const miningDockId =
    mining?.surface && campaign.orbitingPlanetId === mining.planetId ? mining.planetId : null;
  const dockedPlanetId =
    miningDockId ??
    (drawer.kind === 'planet' &&
    selectedPlanet &&
    campaign.orbitingPlanetId === selectedPlanet.id &&
    (activePlanetTab === 'comercio_estaleiro' || activePlanetTab === 'conversar')
      ? selectedPlanet.id
      : null);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#040710] text-slate-100 select-none">
      {/* 3D Solar System Viewport (Fixed Full-Screen Behind HUD Shell) */}
      <div className="fixed inset-0 z-0">
        <ErrorBoundary
          fallbackTitle="Visualização 3D do Sistema Solar"
          onReset={() => setDrawer({ kind: 'none' })}
        >
          <SolarSystemViewport
            system={currentSystem}
            campaign={campaign}
            timeScale={timeScale}
            selectedPlanetId={drawer.kind === 'planet' ? drawer.planetId : null}
            selectedPhenomenonId={drawer.kind === 'phenomenon' ? drawer.phenomenonId : null}
            rightPanelOpen={rightPanelOpen}
            rightPanelHalfScreen={rightPanelOpen}
            travelTargetPlanetId={travelTargetPlanetId}
            travelTargetPhenomenonId={travelTargetPhenomenonId}
            miningTargetId={mining?.depositId ?? null}
            landingPulse={landingPulse}
            dockedPlanetId={dockedPlanetId}
            activeEnemies={activeEnemies}
            isFleeing={Boolean(fleeState?.active)}
            combatMissionTarget={combatMissionTarget}
            onSelectPlanet={(planetId) => setDrawer({ kind: 'planet', planetId })}
            onSelectPhenomenon={(phenomenonId) => setDrawer({ kind: 'phenomenon', phenomenonId })}
            onArrivedAtPlanetOrbit={handleArrivedAtPlanetOrbit}
            onArrivedAtPhenomenon={handleArrivedAtPhenomenon}
            onShipMoveUpdate={(pos, orbId) => {
              if (atPhenomenonId) {
                const ph = currentSystem.phenomena.find((item) => item.id === atPhenomenonId);
                if (!ph || Math.hypot(pos.x - ph.position.x, pos.z - ph.position.z) > 10.5) {
                  setAtPhenomenonId(null);
                }
              }
              setCampaign((prev) =>
                prev ? { ...prev, playerPos: pos, orbitingPlanetId: orbId } : prev
              );
            }}
            onStartMissionCombat={(mission) => {
              const facId = mission.targetFactionId ?? currentSystem.controllingFactionId ?? FACTIONS[0].id;
              const wave = buildEnemyWave(
                facId,
                1,
                Math.max(2, currentSystem.techLevel),
                campaign.playerPos,
                mission.targetEnemyName ?? 'Alvo Hostil'
              ).map((enemy) => ({
                ...enemy,
                name: mission.targetEnemyName ?? enemy.name,
                huntMissionId: mission.id,
              }));
              setActiveEnemies(wave);
              soundEngine.playAlert();
              notify(`Combate iniciado contra ${mission.targetEnemyName}!`);
            }}
            onCombatTick={handleCombatTick}
            onPlanetDevastated={handlePlanetDevastated}
            onHazardCleared={(hazardId) => {
              setCampaign((prev) => {
                if (!prev || (prev.clearedHazards ?? []).includes(hazardId)) return prev;
                return { ...prev, clearedHazards: [...(prev.clearedHazards ?? []), hazardId] };
              });
            }}
            onPlayerMessage={(text) => notify(text)}
          />
        </ErrorBoundary>
      </div>

      {/* TOP HUD BAR: Hidden completely during Hyperspace Warp Transition */}
      {!warpTransition && (
      <>
      <header className="relative z-30 shrink-0 px-3 py-2 bg-[#070b15]/95 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
        {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {/* 1. Créditos */}
          <div className="min-w-[82px]">
            <div className="flex justify-between gap-2 text-slate-400">
              <span>Créditos</span>
              <span className="font-mono-tabular font-bold text-amber-300">
                {campaign.credits.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
              <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (campaign.credits / 10000) * 100)}%` }} />
            </div>
          </div>

          {/* 2. Combustível */}
          <div className="min-w-[88px]">
            <div className="flex justify-between gap-2 text-slate-400">
              <span>Combustível</span>
              <span className="font-mono-tabular font-bold text-cyan-300">
                {Math.round(campaign.fuel)}/{shipStats.fuelCapacity}
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-cyan-400"
                style={{ width: `${Math.min(100, (campaign.fuel / Math.max(1, shipStats.fuelCapacity)) * 100)}%` }}
              />
            </div>
          </div>

          {/* 3. Ataque */}
          <div className="min-w-[88px]">
            <div className="flex justify-between gap-2 text-slate-400">
              <span>Ataque</span>
              <span className={`font-mono-tabular font-bold ${getLevelStyle(shipStats.attackLevel, 'attack').text}`}>
                Nível {shipStats.attackLevel} ({shipStats.combatScore})
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
              <div className="h-full bg-rose-400" style={{ width: `${Math.min(100, (shipStats.attackLevel / 5) * 100)}%` }} />
            </div>
          </div>

          {/* 4. Casco */}
          <div className="min-w-[92px]">
            <div className="flex justify-between gap-2 text-slate-400">
              <span>Casco</span>
              <span className="font-mono-tabular font-bold text-emerald-300">
                {Math.round(activeShip.currentHull)}/{shipStats.maxHull}
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.min(100, (activeShip.currentHull / Math.max(1, shipStats.maxHull)) * 100)}%` }}
              />
            </div>
          </div>

          {/* 5. Suprimento e Saúde */}
          <div className="min-w-[128px]">
            <div className="flex justify-between gap-2 text-slate-400">
              <span>Suprimento e Saúde</span>
              <span className={`font-mono-tabular font-bold ${campaign.supplies > 0 ? 'text-lime-300' : 'text-rose-400'}`}>
                {Math.round(campaign.supplies)}
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-lime-400"
                style={{ width: `${Math.min(100, (campaign.supplies / 200) * 100)}%` }}
              />
            </div>
            {(() => {
              const maxHealth = 100 + Math.max(0, campaign.healthPotency ?? 0);
              const health = campaign.crewHealth ?? 100;
              const pct = Math.max(0, Math.min(100, (health / Math.max(1, maxHealth)) * 100));
              return (
                <>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                    <div
                      className={`h-full ${pct < 30 ? 'bg-rose-500' : 'bg-rose-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                    <span>Saúde da tripulação</span>
                    <span className={`font-mono-tabular ${pct < 30 ? 'text-rose-400' : 'text-rose-200'}`}>
                      {Math.round(health)}/{maxHealth}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* 6. Carga */}
          <div className="min-w-[82px]">
            <div className="flex justify-between gap-2 text-slate-400">
              <span>Compartimento</span>
              <span className="font-mono-tabular font-bold text-sky-300">
                {totalCargo}/{shipStats.cargoCapacity}
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-sky-400"
                style={{ width: `${Math.min(100, (totalCargo / Math.max(1, shipStats.cargoCapacity)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {activeEnemies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setDrawer(drawer.kind === 'combat' ? { kind: 'none' } : { kind: 'combat' });
              }}
              className={`px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer ${
                drawer.kind === 'combat'
                  ? 'bg-rose-600 border-rose-300 text-white'
                  : 'bg-rose-950/90 border-rose-500/80 text-rose-200 hover:bg-rose-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-rose-200" />
              Combate ({activeEnemies.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowGalacticMap(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            Mapa Galáctico
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setDrawer(drawer.kind === 'ship' ? { kind: 'none' } : { kind: 'ship' });
            }}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer ${
              drawer.kind === 'ship'
                ? 'bg-slate-800 border-cyan-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-cyan-400" />
            Nave & Tripulação
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setDrawer(drawer.kind === 'missions' ? { kind: 'none' } : { kind: 'missions' });
            }}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer ${
              drawer.kind === 'missions'
                ? 'bg-slate-800 border-cyan-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            Missões ({acceptedMissions.length}/5)
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setDrawer(drawer.kind === 'war' ? { kind: 'none' } : { kind: 'war' });
            }}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer ${
              drawer.kind === 'war'
                ? 'bg-slate-800 border-rose-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            Guerra Galáctica ({campaign.galacticWars.length})
            <span className="font-mono-tabular text-[10px] text-cyan-300">C{campaign.galacticCycle}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setDrawer(drawer.kind === 'codex' ? { kind: 'none' } : { kind: 'codex' });
            }}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer ${
              drawer.kind === 'codex'
                ? 'bg-slate-800 border-cyan-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Facções & Códex
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setDrawer(drawer.kind === 'logbook' ? { kind: 'none' } : { kind: 'logbook' });
            }}
            className={`px-2 py-1.5 rounded-lg border font-medium flex items-center gap-1 cursor-pointer ${
              drawer.kind === 'logbook'
                ? 'bg-slate-800 border-cyan-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
            }`}
            title="Diário de Bordo"
          >
            <ScrollText className="w-3.5 h-3.5 text-slate-300" />
          </button>

          <button
            type="button"
            onClick={() => setTimeScale((v) => (v === 1 ? 2 : v === 2 ? 4 : 1))}
            className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-mono-tabular font-semibold flex items-center gap-1 cursor-pointer"
            title="Velocidade de simulação"
          >
            <Gauge className="w-3.5 h-3.5" />
            {timeScale}×
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              soundEngine.muted = next;
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 cursor-pointer"
            title="Alternar Áudio"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (isFullscreen) exitGameFullscreen();
              else enterGameFullscreen(true);
            }}
            className={`p-1.5 rounded-lg border cursor-pointer ${
              isFullscreen
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia (Paisagem no Mobile)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowTutorial(true);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-cyan-400/70 bg-cyan-500/15 text-cyan-100 font-semibold cursor-pointer"
          >
            Tutorial
          </button>
        </div>
      </header>

      {/* MIDDLE WORKSPACE: Left 3D Visual Area Overlay + Right Docked Drawer (zero overlap with header/footer) */}
      <div className="relative z-20 flex-1 min-h-0 flex pointer-events-none overflow-hidden">
        {/* LEFT UNCOVERED 3D VISUAL AREA */}
        <div
          className={`game-stage-side relative flex h-full min-w-0 flex-1 flex-col justify-between overflow-hidden p-3 pointer-events-none sm:p-4 ${
            rightPanelOpen ? 'panel-open' : ''
          }`}
        >
          {/* Top Zone of Left 3D Area: Mission List + Action/Exploration Alerts & Combat */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
            {/* Center/Left 3D Visual Area Alerts: Hostile Orbit / Combat / Enlarged Exploration Banner */}
            <div className="flex-1 flex flex-col items-center gap-2.5 min-w-0 pointer-events-none">
              {hostileCountdown !== null && hostileCountdown > 0 && (
                <div className="pointer-events-auto px-4 py-2 rounded-lg bg-rose-950/95 border border-rose-500 text-rose-200 text-xs font-semibold flex items-center gap-2 shadow-xl">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Órbita hostil! Patrulha de defesa decolando em{' '}
                    <span className="font-mono-tabular text-white">{Math.ceil(hostileCountdown)}s</span>
                  </span>
                </div>
              )}

              {fleeState?.active && (
                <div className="pointer-events-auto px-5 py-2.5 rounded-xl bg-amber-950/95 border-2 border-amber-400/90 text-amber-100 text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-2xl">
                  <span>
                    Manobra de fuga entre planetas e asteroides ·{' '}
                    <span className="font-mono-tabular text-white">
                      {Math.max(0, fleeState.durationSec - fleeState.elapsedSec).toFixed(1)}s
                    </span>{' '}
                    (Chance: {fleeState.chancePct}%)
                  </span>
                </div>
              )}

              {toastMsg && (
                <div className="pointer-events-auto max-w-xl w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#081122]/96 border-2 border-cyan-400/80 text-slate-50 text-sm sm:text-[15px] font-semibold leading-snug shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-start justify-between gap-3">
                  <span>{toastMsg}</span>
                  <button
                    type="button"
                    onClick={() => setToastMsg(null)}
                    className="text-xs text-slate-400 hover:text-white shrink-0 px-1.5 py-0.5 rounded bg-slate-800/80 cursor-pointer"
                    title="Fechar aviso"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom-Left: planetas estreitos (minimizáveis) + missões no canto */}
          <div className="pointer-events-auto flex w-[176px] max-h-[calc(var(--fit-h)*0.62)] flex-col justify-end gap-2">
            <div className="min-h-0 overflow-y-auto space-y-2 pr-0.5">
            {currentSystem.planets.length > 0 && (
              planetsHudOpen ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    Planetas
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanetsHudOpen(false)}
                    className="p-0.5 rounded-md bg-[#090e1a]/90 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Minimizar planetas do sistema"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {currentSystem.planets.map((p) => {
                    const isOrb = campaign.orbitingPlanetId === p.id;
                    const isSel = drawer.kind === 'planet' && drawer.planetId === p.id;
                    const isScanned = campaign.scannedPlanetIds.includes(p.id);
                    const lv = getPlanetCurrentLevel(p, campaign);
                    const lvStyle = getLevelStyle(lv, 'planet');
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setDrawer({ kind: 'planet', planetId: p.id });
                        }}
                        className={`text-left px-1.5 py-1 rounded-lg border text-[11px] flex items-center justify-between gap-1 cursor-pointer transition-colors ${
                          isSel
                            ? 'bg-slate-800/95 border-cyan-400 text-white'
                            : 'bg-[#090e1a]/88 border-slate-800/90 text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        <span className="truncate">
                          <span className="font-mono-tabular text-slate-400 mr-1">{p.index + 1}.</span>
                          {p.name}
                        </span>
                        <span className="flex items-center gap-0.5 shrink-0 font-mono-tabular text-[9px]">
                          {isOrb && (
                            <span className="px-1 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold">
                              Órb
                            </span>
                          )}
                          {isScanned ? (
                            <span className={`px-1 py-0.5 rounded border font-semibold ${lvStyle.badge}`}>
                              {lv}
                            </span>
                          ) : !isOrb ? (
                            <span className="px-1 py-0.5 rounded border bg-slate-900 border-slate-700 text-amber-300 font-semibold">
                              ?
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              ) : (
              <button
                type="button"
                onClick={() => setPlanetsHudOpen(true)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-700/90 bg-[#090e1a]/92 text-[11px] font-semibold text-slate-200 flex items-center justify-between gap-1 cursor-pointer"
                title="Mostrar planetas do sistema"
              >
                <span className="truncate">Planetas ({currentSystem.planets.length})</span>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              )
            )}

            {currentSystem.phenomena.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Fenômenos
                </div>
                <div className="flex flex-col gap-1">
                  {currentSystem.phenomena.map((ph) => {
                    const isSel = drawer.kind === 'phenomenon' && drawer.phenomenonId === ph.id;
                    return (
                      <button
                        key={ph.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setDrawer({ kind: 'phenomenon', phenomenonId: ph.id });
                        }}
                        className={`text-left px-1.5 py-1 rounded-lg border text-[11px] flex items-center justify-between gap-1 cursor-pointer ${
                          isSel
                            ? 'bg-slate-800/95 border-amber-400 text-white'
                            : 'bg-[#090e1a]/88 border-slate-800/90 text-amber-200 hover:border-amber-500/60'
                        }`}
                      >
                        <span className="truncate">{ph.name}</span>
                        <span className="font-mono-tabular text-[9px] text-slate-400 shrink-0">
                          T{ph.minTechTier}+
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            </div>

            <MissionCornerHud
              campaign={campaign}
              minimized={!missionsHudOpen}
              onToggleMinimize={() => setMissionsHudOpen((v) => !v)}
              onOpenMission={() => {
                soundEngine.playClick();
                setDrawer({ kind: 'missions' });
              }}
            />
          </div>
        </div>

        {/* Mobile portrait (< sm) floating toast fallback when right drawer fills full screen */}
        {rightPanelOpen && toastMsg && (
          <div className="game-portrait-toast pointer-events-auto fixed inset-x-3 top-20 z-40 flex items-start justify-between gap-3 rounded-xl border-2 border-cyan-400/80 bg-[#081122]/98 px-4 py-3 text-sm font-semibold leading-snug text-slate-50 shadow-2xl sm:hidden">
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-xs text-slate-400 hover:text-white shrink-0 px-1.5 py-0.5 rounded bg-slate-800/80 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* RIGHT DOCKED DRAWER (Unified half-screen size across all panels, sits strictly below header & above footer) */}
        {rightPanelOpen && (
          <div className="game-drawer pointer-events-auto z-30 h-full shrink-0 shadow-2xl transition-all duration-200">
            <ErrorBoundary
              fallbackTitle="Erro ao carregar painel lateral"
              onReset={() => setDrawer({ kind: 'none' })}
            >
              {(drawer.kind === 'planet' || drawer.kind === 'phenomenon') && (
                <PlanetPanel
                  system={currentSystem}
                  planet={selectedPlanet}
                  phenomenon={selectedPhenomenon}
                  campaign={campaign}
                  miningTargetId={mining?.depositId ?? null}
                  miningProgress={mining?.progress ?? 0}
                  atPhenomenon={Boolean(selectedPhenomenon && atPhenomenonId === selectedPhenomenon.id)}
                  onClose={() => setDrawer({ kind: 'none' })}
                  onTabChange={setActivePlanetTab}
                  onTriggerLanding={triggerLandingPulse}
                  onTravelToPlanet={handleTravelToPlanet}
                  onTravelToPhenomenon={handleTravelToPhenomenon}
                  onScanPlanet={handleScanPlanet}
                  onToggleMining={(depositId, resourceId, ratePerSec, surface) => {
                    if (!selectedPlanet) return;
                    soundEngine.playClick();
                    if (surface) triggerLandingPulse(selectedPlanet.id);
                    setMining({
                      planetId: selectedPlanet.id,
                      depositId,
                      resourceId,
                      ratePerSec,
                      progress: 0,
                      surface,
                      warmup: surface ? 1.6 : 0,
                    });
                  }}
                  onStopMining={() => setMining(null)}
                  onExtractGround={handleExtractGround}
                  onRevealExistence={handleRevealExistence}
                  onBombardPlanet={handleBombardPlanet}
                  onDestroyMovingHazard={(hazardId) => {
                    soundEngine.playExplosion();
                    setCampaign((prev) => {
                      if (!prev || (prev.clearedHazards ?? []).includes(hazardId)) return prev;
                      return { ...prev, clearedHazards: [...(prev.clearedHazards ?? []), hazardId] };
                    });
                    setDrawer({ kind: 'none' });
                    notify('O cometa se parte. O que resta dele não chega a mundo nenhum.');
                  }}
                  onBuyExtractionLicense={handleBuyExtractionLicense}
                  onCreateHeadquarters={handleCreateHeadquarters}
                  onAcceptMission={handleAcceptMission}
                  onCompleteMission={handleCompleteMission}
                  onContactCiv={(pl) => {
                    soundEngine.playClick();
                    triggerLandingPulse(pl.id);
                    setVnNodes([buildLevel2ContactDialogue(pl, campaign)]);
                    setVnIndex(0);
                  }}
                  onDescendPlanet={handleDescendPlanet}
                  onColonizePlanet={handleColonizePlanet}
                  onInvestigateAnomaly={handleInvestigateAnomaly}
                  onBuyResource={handleBuyResource}
                  onSellResource={handleSellResource}
                  onBuyConsumable={handleBuyConsumable}
                  onBuyEquipment={handleBuyEquipment}
                  onBuyBlueprint={handleBuyBlueprint}
                  onCraftBlueprint={handleCraftBlueprint}
                  onBuyHull={handleBuyHull}
                  onSellShip={handleSellShip}
                  onHireCrew={handleHireCrew}
                  onInteractPhenomenon={handleInteractPhenomenon}
                />
              )}

              {drawer.kind === 'ship' && (
                <ShipAndCrewPanel
                  campaign={campaign}
                  inOrbit={Boolean(campaign.orbitingPlanetId)}
                  onClose={() => setDrawer({ kind: 'none' })}
                  onUseConsumable={handleUseConsumable}
                  onEquipFromDepot={handleEquipFromDepot}
                  onUnequip={handleUnequipToCompartment}
                  onSendResourceToVault={(resourceId, qty) => applyVault((state) => sendResourceToVault(state, resourceId, qty))}
                  onSendConsumableToVault={(consumableId, qty) =>
                    applyVault((state) => sendConsumableToVault(state, consumableId, qty))
                  }
                  onSendDepotToVault={(depotUid) => applyVault((state) => sendDepotGearToVault(state, depotUid))}
                  onSendInstalledToVault={(category, itemId, slotIndex) =>
                    applyVault((state) => sendInstalledGearToVault(state, category, itemId, slotIndex))
                  }
                  onEquipFromVault={(gearUid, shipUid) => applyVault((state) => equipVaultGear(state, gearUid, shipUid))}
                  onWithdrawResource={(resourceId, qty) =>
                    applyVault((state) => withdrawResourceFromVault(state, resourceId, qty))
                  }
                  onWithdrawConsumable={(consumableId, qty) =>
                    applyVault((state) => withdrawConsumableFromVault(state, consumableId, qty))
                  }
                  onWithdrawGear={(gearUid) => applyVault((state) => withdrawGearFromVault(state, gearUid))}
                  onUseVaultConsumable={(consumableId) => handleUseConsumable(consumableId, 'cofre')}
                  onSwitchShip={(uid) => {
                    soundEngine.playClick();
                    let newFacName: string | undefined;
                    setCampaign((prev) => {
                      if (!prev) return prev;
                      const res = applyShipSwitchAndFaction(prev, uid);
                      newFacName = res.switchedFactionName;
                      return res.next;
                    });
                    if (newFacName) {
                      notify(`Nave comandada trocada! Sua facção ativa agora é ${newFacName}.`);
                    }
                  }}
                  onToggleCrewStatus={handleToggleCrewStatus}
                  onDismissCrew={handleDismissCrew}
                />
              )}

              {(drawer.kind === 'missions' || drawer.kind === 'codex' || drawer.kind === 'logbook') && (
                <MissionsAndCodexPanel
                  mode={drawer.kind}
                  campaign={campaign}
                  currentSystem={currentSystem}
                  onClose={() => setDrawer({ kind: 'none' })}
                  onAcceptMission={handleAcceptMission}
                  onCompleteMission={handleCompleteMission}
                  onAbandonMission={handleAbandonMission}
                  onFormAlliance={handleFormAlliance}
                />
              )}

              {drawer.kind === 'war' && (
                <GalacticWarPanel
                  campaign={campaign}
                  onClose={() => setDrawer({ kind: 'none' })}
                  onAdvanceCycle={() => {
                    soundEngine.playClick();
                    let announcement: string | null = null;
                    setCampaign((prev) => {
                      if (!prev) return prev;
                      const res = advanceGalacticCycle({
                        ...prev,
                        gameTimeSeconds: prev.gameTimeSeconds + GALACTIC_CYCLE_DURATION_SEC,
                      });
                      if (res.announcements.length > 0) {
                        announcement = res.announcements[0];
                      }
                      return res.nextCampaign;
                    });
                    notify(announcement ?? `Ciclo Galáctico #${campaign.galacticCycle + 1} concluído!`);
                  }}
                />
              )}

              {drawer.kind === 'combat' && activeEnemies.length > 0 && bonuses && (
                <CombatPanel
                  activeShip={activeShip}
                  maxHull={shipStats.maxHull}
                  maxShield={shipStats.maxShield}
                  bonuses={bonuses}
                  activeEnemies={activeEnemies}
                  consumables={campaign.consumables}
                  specialAbilityIds={campaign.specialAbilityIds ?? []}
                  abilityCooldowns={campaign.abilityCooldowns ?? {}}
                  gameTimeSeconds={campaign.gameTimeSeconds}
                  fleeState={fleeState}
                  fleePreview={fleePreview}
                  onUseConsumable={handleUseConsumable}
                  onTriggerAbility={handleTriggerAbility}
                  onStartFlee={handleStartFlee}
                  onClose={() => setDrawer({ kind: 'none' })}
                />
              )}
            </ErrorBoundary>
          </div>
        )}
      </div>
      </>
      )}

      {/* BOTTOM HUD BAR: Hidden during Hyperspace Warp Transition */}
      {!warpTransition && (
      <footer className="relative z-30 shrink-0 px-4 py-1.5 bg-[#070b15]/95 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            <strong className="text-white">{currentSystem.name}</strong> · {currentSystem.starType}
          </span>
          <span>
            Controle:{' '}
            <strong style={{ color: systemOwner?.color ?? '#94a3b8' }}>
              {systemOwner ? systemOwner.name : 'Espaço Selvagem'}
            </strong>
          </span>
          {systemOwner && (
            <span>
              Sua reputação com essa facção:{' '}
              <strong className={currentRenown > 80 ? 'text-emerald-300' : currentRenown < 0 ? 'text-rose-300' : 'text-cyan-200'}>
                {currentRenown}
              </strong>{' '}
              ({currentRenownTier})
            </span>
          )}
          <span>
            Órbita: <strong className="text-emerald-300">{orbitingPlanet ? orbitingPlanet.name : 'Espaço livre'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5 font-mono-tabular">
          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getLevelStyle(currentSystem.conflictLevel, 'conflict').badge}`}>
            Tensão nível {currentSystem.conflictLevel} de 5
          </span>
          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getLevelStyle(currentSystem.techLevel, 'tech').badge}`}>
            Tecnologia nível {currentSystem.techLevel}
          </span>
          <span>
            Raros <strong className="text-cyan-300">{currentSystem.rareMultiplier.toFixed(2)}×</strong>
          </span>
        </div>
      </footer>
      )}

      {/* 3D GALACTIC MAP OVERLAY */}
      {showGalacticMap && !warpTransition && (
        <ErrorBoundary
          fallbackTitle="Erro no Mapa Galáctico 3D"
          onReset={() => setShowGalacticMap(false)}
        >
          <GalacticMapViewport
            campaign={campaign}
            currentSystem={currentSystem}
            onJumpToSystem={handleJumpToSystem}
            onClose={() => setShowGalacticMap(false)}
          />
        </ErrorBoundary>
      )}

      {/* HYPERSPACE WARP TUNNEL ANIMATION (Full-Screen Space Tunnel, all menus hidden) */}
      {warpTransition && (
        <HyperspaceWarpOverlay
          targetSystemName={warpTransition.targetName}
          shipColor={warpTransition.shipColor}
          factionColor={warpTransition.factionColor}
          factionName={warpTransition.factionName}
        />
      )}

      {/* RANDOM ENCOUNTER MODAL */}
      {pendingEncounter && (
        <EncounterModal
          encounter={pendingEncounter}
          campaign={campaign}
          onStartCombat={() => {
            soundEngine.playAlert();
            if (!pendingEncounter.forcedCombat) {
              setCampaign((prev) =>
                prev
                  ? {
                      ...prev,
                      factionRenown: {
                        ...prev.factionRenown,
                        [pendingEncounter.factionId]: (prev.factionRenown[pendingEncounter.factionId] ?? 0) - 18,
                      },
                    }
                  : prev
              );
            }
            setActiveEnemies(pendingEncounter.enemies);
            setPendingEncounter(null);
          }}
          onPassPeacefully={() => {
            soundEngine.playClick();
            setPendingEncounter(null);
          }}
          onBuyResource={(resourceId, qty, totalCost) => {
            handleBuyResource(resourceId, qty, Math.round(totalCost / qty));
            setPendingEncounter((prev) =>
              prev && prev.tradeOffer
                ? {
                    ...prev,
                    tradeOffer: {
                      ...prev.tradeOffer,
                      resources: prev.tradeOffer.resources.map((r) =>
                        r.resourceId === resourceId ? { ...r, qty: Math.max(0, r.qty - qty) } : r
                      ),
                    },
                  }
                : prev
            );
          }}
          onSellResource={(resourceId, qty) => {
            handleSellResource(resourceId, qty);
          }}
          onAcceptMission={() => {
            if (pendingEncounter.missionOffer) {
              handleAcceptMission(pendingEncounter.missionOffer);
              setPendingEncounter((prev) => (prev ? { ...prev, missionOffer: undefined } : prev));
            }
          }}
        />
      )}

      {/* VISUAL NOVEL OVERLAY (Opening & Level-2 Contact) */}
      {vnNodes && vnNodes[vnIndex] && (
        <VisualNovelOverlay node={vnNodes[vnIndex]} onSelectChoice={handleVnChoice} />
      )}

      {/* HULL DESTROYED / ESCAPE POD MODAL (Section 16.2) */}
      {hullDestroyedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090e1a] border border-rose-500/60 rounded-2xl p-6 space-y-4 text-center shadow-2xl">
            <Skull className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="font-display text-2xl font-bold text-white">Casco Destruído</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              A cápsula deixa o casco para trás. O compartimento de carga inteiro fica no naufrágio, e o resgate cobra um quinto dos créditos.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleEscapePodRescue}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm cursor-pointer"
              >
                Acionar Cápsula de Resgate (Retornar à Base)
              </button>
              <button
                type="button"
                onClick={handleResetCampaign}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Reiniciar Nova Campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
