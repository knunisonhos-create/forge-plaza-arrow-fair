import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SlidersHorizontal, Eye, Compass, AlertTriangle, Zap, X, Crown, Fuel, Globe2, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import type {
  GalacticRegion,
  LifeFormId,
  PlayerCampaignState,
  StarSystemSummary,
} from '../types/game';
import { FACTIONS, FACTIONS_BY_ID, isFactionConservative, LIFE_FORMS, SPECIES } from '../data/lifeforms';
import { GALAXY_NEBULAE, getSystemsInRadius, getSystemSummaryById, KNOWN_GALAXY_SYSTEMS } from '../data/universe';
import { getRenownTierName, getSystemHostileStatus } from '../data/narrative';
import { createRadialGlowTexture } from '../engine/proceduralTextures';
import { computeCrewBonuses, computeShipDerivedStats } from '../engine/combat';
import { getEffectiveSystemSummary } from '../engine/galacticWar';
import { soundEngine } from '../engine/audio';
import { canvasPixelRatio } from '../utils/mobileLandscape';
import { getLevelStyle } from '../utils/formatting';
import { MissionCornerHud } from './MissionsAndCodexPanel';

const VISUAL_SCALE = 4.2; // Section 20.2: 4.2x visual spacing while real distances & fuel stay exact

interface GalacticMapViewportProps {
  campaign: PlayerCampaignState;
  currentSystem: StarSystemSummary;
  onJumpToSystem: (target: StarSystemSummary, fuelCost: number) => void;
  onClose: () => void;
}

export const GalacticMapViewport: React.FC<GalacticMapViewportProps> = ({
  campaign,
  currentSystem,
  onJumpToSystem,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<StarSystemSummary>(currentSystem);
  const [showJumpSphere, setShowJumpSphere] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [missionsHudOpen, setMissionsHudOpen] = useState(true);

  // Filters (Section 20.2)
  const [factionFilter, setFactionFilter] = useState<string>('all');
  const [lifeFormFilter, setLifeFormFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<GalacticRegion | 'all'>('all');
  const [conflictFilter, setConflictFilter] = useState<'all' | 'alto' | 'medio' | 'baixo'>('all');
  const [techFilter, setTechFilter] = useState<'all' | 'alta' | 'media' | 'baixa'>('all');
  const [onlyMission, setOnlyMission] = useState(false);
  const [onlyRoute, setOnlyRoute] = useState(false);
  const [onlyInRange, setOnlyInRange] = useState(false);
  const [showFactionAreas, setShowFactionAreas] = useState(true);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (factionFilter !== 'all') c++;
    if (lifeFormFilter !== 'all') c++;
    if (regionFilter !== 'all') c++;
    if (conflictFilter !== 'all') c++;
    if (techFilter !== 'all') c++;
    if (onlyMission) c++;
    if (onlyRoute) c++;
    if (onlyInRange) c++;
    if (!showFactionAreas) c++;
    return c;
  }, [factionFilter, lifeFormFilter, regionFilter, conflictFilter, techFilter, onlyMission, onlyRoute, onlyInRange, showFactionAreas]);

  const bonuses = useMemo(() => computeCrewBonuses(campaign), [campaign]);
  const activeShip = campaign.ships.find((s) => s.uid === campaign.activeShipUid) ?? campaign.ships[0];
  const shipStats = useMemo(() => computeShipDerivedStats(activeShip, bonuses), [activeShip, bonuses]);

  // Full 500-system known galaxy + nearby outer procedural wild systems, with live territory overrides applied
  const visibleSystems = useMemo(() => {
    const map = new Map<string, StarSystemSummary>();
    KNOWN_GALAXY_SYSTEMS.forEach((s) => map.set(s.id, getEffectiveSystemSummary(s, campaign)));
    getSystemsInRadius(currentSystem, 72).forEach((s) => {
      if (!map.has(s.id)) {
        map.set(s.id, getEffectiveSystemSummary(s, campaign));
      }
    });
    return Array.from(map.values());
  }, [currentSystem, campaign.systemOwnerOverrides]);

  const effectiveSelectedSystem = useMemo(
    () => getEffectiveSystemSummary(selectedSystem, campaign),
    [selectedSystem, campaign.systemOwnerOverrides]
  );

  const missionSystemIds = useMemo(
    () =>
      new Set(
        campaign.missions
          .filter((m) => m.status === 'aceita')
          .map((m) => m.targetSystemId)
      ),
    [campaign.missions]
  );

  const passesFilter = (sys: StarSystemSummary): boolean => {
    if (factionFilter === 'selvagem' && sys.controllingFactionId !== null) return false;
    if (factionFilter !== 'all' && factionFilter !== 'selvagem' && sys.controllingFactionId !== factionFilter) {
      return false;
    }
    if (lifeFormFilter !== 'all') {
      const fac = sys.controllingFactionId ? FACTIONS_BY_ID[sys.controllingFactionId] : null;
      if (!fac) return false;
      if (lifeFormFilter.startsWith('lf_')) {
        if (fac.lifeFormId !== (lifeFormFilter.slice(3) as LifeFormId)) return false;
      } else if (fac.speciesId !== lifeFormFilter) {
        return false;
      }
    }
    if (regionFilter !== 'all' && sys.region !== regionFilter) return false;
    if (conflictFilter === 'alto' && sys.conflictLevel < 4) return false;
    if (conflictFilter === 'medio' && sys.conflictLevel !== 3) return false;
    if (conflictFilter === 'baixo' && sys.conflictLevel > 2) return false;
    if (techFilter === 'alta' && sys.techLevel < 4) return false;
    if (techFilter === 'media' && sys.techLevel !== 3) return false;
    if (techFilter === 'baixa' && sys.techLevel > 2) return false;
    if (onlyMission && !missionSystemIds.has(sys.id)) return false;
    if (onlyRoute && !campaign.visitedSystemIds.includes(sys.id)) return false;
    const dist = Math.hypot(sys.x - currentSystem.x, sys.y - currentSystem.y, sys.z - currentSystem.z);
    if (onlyInRange && dist > shipStats.jumpRangeLy) return false;
    return true;
  };

  const filterKey = `${factionFilter}_${lifeFormFilter}_${regionFilter}_${conflictFilter}_${techFilter}_${onlyMission}_${onlyRoute}_${onlyInRange}`;

  // Keep latest state in ref for Three.js loop
  const stateRef = useRef({
    selectedSystem: effectiveSelectedSystem,
    showJumpSphere,
    showFactionAreas,
    onlyRoute,
    visibleSystems,
    passesFilter,
    currentSystem,
    campaign,
    shipStats,
    missionSystemIds,
    filterKey,
  });
  stateRef.current = {
    selectedSystem: effectiveSelectedSystem,
    showJumpSphere,
    showFactionAreas,
    onlyRoute,
    visibleSystems,
    passesFilter,
    currentSystem,
    campaign,
    shipStats,
    missionSystemIds,
    filterKey,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, powerPreference: 'high-performance' });
    renderer.setSize(w, h);
    renderer.setPixelRatio(isSoftwareGl ? 1 : canvasPixelRatio(w, h));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#03060d');

    const camera = new THREE.PerspectiveCamera(50, w / h, 1, 3500);
    camera.position.set(0, 165, 195);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 28;
    controls.maxDistance = 950;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight('#ffffff', 0.9));

    const mapGroup = new THREE.Group();
    scene.add(mapGroup);

    const starClickableMeshes: THREE.Mesh[] = [];
    const domainGroup = new THREE.Group();
    const routeGroup = new THREE.Group();
    const jumpGroup = new THREE.Group();
    const selectionRingsGroup = new THREE.Group();

    mapGroup.add(domainGroup, routeGroup, jumpGroup, selectionRingsGroup);

    const rebuildMapObjects = () => {
      const st = stateRef.current;
      while (mapGroup.children.length > 4) {
        mapGroup.remove(mapGroup.children[mapGroup.children.length - 1]);
      }
      while (domainGroup.children.length > 0) domainGroup.remove(domainGroup.children[0]);
      while (routeGroup.children.length > 0) routeGroup.remove(routeGroup.children[0]);
      while (jumpGroup.children.length > 0) jumpGroup.remove(jumpGroup.children[0]);
      while (selectionRingsGroup.children.length > 0) selectionRingsGroup.remove(selectionRingsGroup.children[0]);
      starClickableMeshes.length = 0;

      const cx = st.currentSystem.x;
      const cy = st.currentSystem.y;
      const cz = st.currentSystem.z;

      // Nebulae clouds across the 3D galaxy
      GALAXY_NEBULAE.forEach((neb) => {
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: createRadialGlowTexture(neb.color),
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
          })
        );
        sp.position.set((neb.x - cx) * VISUAL_SCALE, (neb.y - cy) * VISUAL_SCALE, (neb.z - cz) * VISUAL_SCALE);
        const s = neb.radius * VISUAL_SCALE * 1.9;
        sp.scale.set(s, s, 1);
        mapGroup.add(sp);
      });

      // Jump Range Sphere & Equatorial Blue Circle (Section 20.2)
      if (st.showJumpSphere) {
        const jr = st.shipStats.jumpRangeLy * VISUAL_SCALE;
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(jr, 32, 24),
          new THREE.MeshBasicMaterial({
            color: '#0ea5e9',
            transparent: true,
            opacity: 0.05,
            depthWrite: false,
            wireframe: false,
          })
        );
        const ringPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          ringPts.push(new THREE.Vector3(Math.cos(a) * jr, 0, Math.sin(a) * jr));
        }
        const eqCircle = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(ringPts),
          new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.72 })
        );
        jumpGroup.add(sphere, eqCircle);
      }

      // Chronological Route Dashed Line (Section 20.2)
      const routePts: THREE.Vector3[] = [];
      st.campaign.visitedSystemIds.forEach((id) => {
        const sum = getSystemSummaryById(id);
        if (!sum) return;
        routePts.push(
          new THREE.Vector3((sum.x - cx) * VISUAL_SCALE, (sum.y - cy) * VISUAL_SCALE, (sum.z - cz) * VISUAL_SCALE)
        );
      });
      if (routePts.length >= 2) {
        const rGeo = new THREE.BufferGeometry().setFromPoints(routePts);
        const rLine = new THREE.Line(
          rGeo,
          new THREE.LineDashedMaterial({ color: '#fbbf24', dashSize: 2.5, gapSize: 1.5, transparent: true, opacity: 0.85 })
        );
        rLine.computeLineDistances();
        routeGroup.add(rLine);
      }

      // Systems: NO vertical height lines! Translucent faction domain spheres WITHOUT rings!
      const starGeo = new THREE.SphereGeometry(1, 12, 12);
      const sphereDomainGeo = new THREE.SphereGeometry(1, 18, 14);

      st.visibleSystems.forEach((sys) => {
        const px = (sys.x - cx) * VISUAL_SCALE;
        const py = (sys.y - cy) * VISUAL_SCALE;
        const pz = (sys.z - cz) * VISUAL_SCALE;

        const dist = Math.hypot(sys.x - cx, sys.y - cy, sys.z - cz);
        const inRange = dist <= st.shipStats.jumpRangeLy;
        const pass = st.passesFilter(sys);
        const isCurrent = sys.id === st.currentSystem.id;
        const isSelected = sys.id === st.selectedSystem.id;
        const hasMission = st.missionSystemIds.has(sys.id);
        const fac = sys.controllingFactionId ? FACTIONS_BY_ID[sys.controllingFactionId] : null;
        const facKnown = !fac || st.campaign.knownFactionIds.includes(fac.id) || st.campaign.visitedSystemIds.includes(sys.id);

        // Star color: true color within range, grayed outside range (Section 20.2)
        const displayColor = inRange || isCurrent ? sys.starColor : '#64748b';
        const opacity = pass ? (inRange || isCurrent ? 1.0 : 0.72) : 0.08;
        const radius = sys.isCapital ? 2.6 : sys.isBlackHole ? 2.4 : 1.55;

        const starMesh = new THREE.Mesh(
          starGeo,
          new THREE.MeshBasicMaterial({
            color: sys.isBlackHole ? '#a855f7' : displayColor,
            transparent: opacity < 1,
            opacity,
          })
        );
        starMesh.position.set(px, py, pz);
        starMesh.scale.setScalar(radius);
        starMesh.userData = { system: sys, clickable: pass };
        mapGroup.add(starMesh);
        if (pass) {
          starClickableMeshes.push(starMesh);
        }

        // Translucent faction-colored sphere marker on ALL systems belonging to a faction
        if (st.showFactionAreas && fac && pass) {
          const domMesh = new THREE.Mesh(
            sphereDomainGeo,
            new THREE.MeshBasicMaterial({
              color: fac.color,
              transparent: true,
              opacity: 0.13,
              depthWrite: false,
            })
          );
          domMesh.position.set(px, py, pz);
          domMesh.scale.setScalar(sys.isCapital ? 10.5 : 8.2);
          domainGroup.add(domMesh);
        }

        // Markings:
        // Cyan/white ring on current system (NOT gold), Blue ring on selected,
        // GOLD ring ONLY on Prime (capital) systems, Green ring on active mission
        if (isCurrent) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(3.0, 3.6, 24),
            new THREE.MeshBasicMaterial({ color: '#22d3ee', side: THREE.DoubleSide })
          );
          ring.position.set(px, py, pz);
          ring.rotation.x = -Math.PI / 2;
          selectionRingsGroup.add(ring);
        }
        if (isSelected && !isCurrent) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(3.1, 3.75, 24),
            new THREE.MeshBasicMaterial({ color: '#e2e8f0', side: THREE.DoubleSide })
          );
          ring.position.set(px, py, pz);
          ring.rotation.x = -Math.PI / 2;
          selectionRingsGroup.add(ring);
        }
        if (sys.isCapital && pass) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(4.0, 4.85, 28),
            new THREE.MeshBasicMaterial({
              color: '#facc15',
              side: THREE.DoubleSide,
            })
          );
          ring.position.set(px, py, pz);
          ring.rotation.x = -Math.PI / 2;
          selectionRingsGroup.add(ring);
        }
        if (sys.id.startsWith('sys_wild_') && pass && !isCurrent) {
          const wildRing = new THREE.Mesh(
            new THREE.RingGeometry(2.2, 2.55, 16),
            new THREE.MeshBasicMaterial({
              color: '#e7d3a1',
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.9,
            })
          );
          wildRing.position.set(px, py, pz);
          wildRing.rotation.x = -Math.PI / 2;
          selectionRingsGroup.add(wildRing);
        }
        if (hasMission && pass) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(5.1, 5.8, 24),
            new THREE.MeshBasicMaterial({ color: '#4ade80', side: THREE.DoubleSide })
          );
          ring.position.set(px, py, pz);
          ring.rotation.x = -Math.PI / 2;
          selectionRingsGroup.add(ring);
        }
      });
    };

    rebuildMapObjects();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (!Number.isFinite(mouse.x) || !Number.isFinite(mouse.y)) return;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(starClickableMeshes, false);
      if (hits.length > 0) {
        const sys = hits[0].object.userData.system as StarSystemSummary;
        if (sys) {
          soundEngine.playClick();
          setSelectedSystem(sys);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      const nw = Math.max(1, container.clientWidth || window.innerWidth);
      const nh = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(isSoftwareGl ? 1 : canvasPixelRatio(nw, nh));
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastHash = '';

    const afterDraw = (cb: () => void) => {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 16);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          try {
            const s = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (s === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
            else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 16);
            }
          } catch {
            frameId = window.setTimeout(cb, 16);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 16);
      }
    };

    const tick = () => {
      if (disposed) return;
      if (contextLost) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      const st = stateRef.current;
      const ownerHash = `${st.campaign.galacticCycle}_${Object.keys(st.campaign.systemOwnerOverrides).length}`;
      const hash = `${st.selectedSystem.id}_${st.showJumpSphere}_${st.showFactionAreas}_${ownerHash}_${st.filterKey}`;
      if (hash !== lastHash) {
        lastHash = hash;
        rebuildMapObjects();
      }
      if (
        !Number.isFinite(controls.target.x) ||
        !Number.isFinite(controls.target.y) ||
        !Number.isFinite(controls.target.z)
      ) {
        controls.target.set(0, 0, 0);
      }
      if (
        !Number.isFinite(camera.position.x) ||
        !Number.isFinite(camera.position.y) ||
        !Number.isFinite(camera.position.z)
      ) {
        camera.position.set(0, 165, 195);
      }
      controls.update();
      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const selDist = Math.hypot(
    effectiveSelectedSystem.x - currentSystem.x,
    effectiveSelectedSystem.y - currentSystem.y,
    effectiveSelectedSystem.z - currentSystem.z
  );
  const fuelCost = Math.max(2, Math.round(selDist * 2.1 * shipStats.fuelEfficiency));
  const canJump =
    effectiveSelectedSystem.id !== currentSystem.id &&
    selDist <= shipStats.jumpRangeLy &&
    campaign.fuel >= fuelCost;

  const selVisited = campaign.visitedSystemIds.includes(effectiveSelectedSystem.id);
  const selScanned = campaign.scannedSystemIds.includes(effectiveSelectedSystem.id);
  const selOwner = effectiveSelectedSystem.controllingFactionId
    ? FACTIONS_BY_ID[effectiveSelectedSystem.controllingFactionId]
    : null;
  const selHostile = getSystemHostileStatus(effectiveSelectedSystem, campaign);
  const selRenown = selOwner ? campaign.factionRenown[selOwner.id] ?? 0 : 0;
  const selTier = selOwner
    ? getRenownTierName(selRenown, campaign.formalAlliances.includes(selOwner.id))
    : 'Neutro';
  const showFullDetails = selVisited || selScanned || shipStats.hasLongScanner;

  return (
    <div className="fixed inset-0 z-30 bg-[#03060d]">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Selected System Card (Section 20.2) */}
      <div className="fixed top-4 left-4 z-40 w-84 bg-[#090e1a]/95 border border-slate-700/80 rounded-xl p-4 shadow-2xl space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs text-cyan-400 font-medium flex items-center gap-1.5">
              <span>{effectiveSelectedSystem.id === currentSystem.id ? 'Sistema Atual' : `Distância: ${selDist.toFixed(1)} a.l.`}</span>
              {effectiveSelectedSystem.isCapital && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-400/50 bg-amber-500/15 text-amber-300 text-[10px] font-semibold">
                  <Crown className="w-2.5 h-2.5" /> Sede (Nv 5)
                </span>
              )}
            </div>
            <h2 className="font-display text-lg font-bold text-white leading-tight mt-0.5">
              {effectiveSelectedSystem.name}
            </h2>
            <p className="text-xs text-slate-400">
              {effectiveSelectedSystem.starType} · {effectiveSelectedSystem.region}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Voltar ao sistema solar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs space-y-1.5 border-t border-slate-800 pt-2.5">
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-400">Controle</span>
            <span className="font-medium text-right" style={{ color: selOwner?.color ?? '#94a3b8' }}>
              {selOwner ? selOwner.name : 'Espaço Selvagem'}
            </span>
          </div>

          {selOwner ? (
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400">Política Civil</span>
              <span
                className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                  isFactionConservative(selOwner)
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                }`}
              >
                {selOwner.axis} · {isFactionConservative(selOwner) ? 'Preserva Nv 2' : 'Sem Nv 2'}
              </span>
            </div>
          ) : (
            !effectiveSelectedSystem.isBlackHole && (
              <div className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1">
                Zona fora de facções: alta incidência de civilizações Nível 2 e raros.
              </div>
            )
          )}

          {selOwner && (
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400">Relação</span>
              <span className={`font-semibold ${selHostile ? 'text-rose-300' : selRenown === 0 ? 'text-slate-200' : selRenown > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {selHostile && selRenown >= 0 ? 'Em guerra' : selTier}
                {selRenown !== 0 ? ` (${selRenown})` : ''}
              </span>
            </div>
          )}

          {selHostile && (
            <div className="flex items-center gap-1.5 text-rose-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{selRenown < 0 ? 'Reputação hostil' : 'Território em guerra com a sua nave'}</span>
            </div>
          )}

          {showFullDetails ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Tensão do setor
                </span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono-tabular ${getLevelStyle(effectiveSelectedSystem.conflictLevel, 'conflict').badge}`}>
                  Nível {effectiveSelectedSystem.conflictLevel}/5
                </span>
              </div>
              {selOwner && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Fronteira de guerra da facção local</span>
                  <span className="font-mono-tabular text-slate-200 shrink-0">
                    {effectiveSelectedSystem.nearestHostileDistLy.toFixed(1)} a.l.
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" /> Tecnologia
                </span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono-tabular ${getLevelStyle(effectiveSelectedSystem.techLevel, 'tech').badge}`}>
                  Nível {effectiveSelectedSystem.techLevel}/5
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Multiplicador Raros
                </span>
                <span className="font-mono-tabular text-emerald-300 font-semibold">
                  {effectiveSelectedSystem.rareMultiplier.toFixed(2)}×
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Globe2 className="w-3.5 h-3.5 text-cyan-400" /> Planetas
                </span>
                <span className="font-mono-tabular text-slate-200">{effectiveSelectedSystem.planetCount}</span>
              </div>
            </>
          ) : (
            <div className="text-slate-400 italic py-1">
              Dados completos ocultos até visitar ou escanear este sistema.
            </div>
          )}

          {effectiveSelectedSystem.id !== currentSystem.id && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-amber-400" /> Combustível pós-salto
              </span>
              <span className={`font-mono-tabular font-semibold ${campaign.fuel >= fuelCost ? 'text-amber-300' : 'text-rose-400'}`}>
                {Math.round(campaign.fuel)} → {Math.max(0, Math.round(campaign.fuel - fuelCost))} un.
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
          {effectiveSelectedSystem.id !== currentSystem.id && (
            <button
              type="button"
              disabled={!canJump}
              onClick={() => onJumpToSystem(effectiveSelectedSystem, fuelCost)}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                canJump
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {selDist > shipStats.jumpRangeLy
                ? `Fora do Alcance (Máx ${shipStats.jumpRangeLy} a.l.)`
                : campaign.fuel < fuelCost
                ? `Combustível Insuficiente (${fuelCost} un.)`
                : `Saltar para Sistema (-${fuelCost} Comb.)`}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowJumpSphere((v) => !v)}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                showJumpSphere
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Visão do salto
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              Sistema
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Vertical Filter Bar on the Right (Section 20.2) */}
      <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="px-3 py-2 rounded-lg bg-[#090e1a]/95 border border-slate-700/80 text-xs font-semibold text-slate-100 flex items-center gap-2 hover:border-cyan-400/60 cursor-pointer shadow-lg"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filtros ({activeFilterCount})</span>
        </button>

        {filtersOpen && (
          <div className="w-64 max-h-[calc(var(--fit-h)*0.82)] overflow-y-auto bg-[#090e1a]/95 border border-slate-700/80 rounded-xl p-3 space-y-3 text-xs shadow-2xl">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Facção</label>
              <select
                value={factionFilter}
                onChange={(e) => setFactionFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200"
              >
                <option value="all">Todas as facções</option>
                <option value="selvagem">Espaço Selvagem</option>
                {FACTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Raça / Forma de vida</label>
              <select
                value={lifeFormFilter}
                onChange={(e) => setLifeFormFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200"
              >
                <option value="all">Todas</option>
                <optgroup label="7 Formas de Vida">
                  {LIFE_FORMS.map((lf) => (
                    <option key={lf.id} value={`lf_${lf.id}`}>
                      {lf.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="21 Espécies">
                  {SPECIES.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Região galáctica</label>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as GalacticRegion | 'all')}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200"
              >
                <option value="all">Todas as regiões</option>
                <option value="Núcleo galáctico">Núcleo galáctico</option>
                <option value="Braços galácticos">Braços galácticos</option>
                <option value="Regiões nebulosas">Regiões nebulosas</option>
                <option value="Regiões periféricas">Regiões periféricas</option>
                <option value="Zonas anômalas">Zonas anômalas</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Tensão do setor</label>
                <select
                  value={conflictFilter}
                  onChange={(e) => setConflictFilter(e.target.value as 'all' | 'alto' | 'medio' | 'baixo')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-1.5 py-1 text-slate-200"
                >
                  <option value="all">Todos</option>
                  <option value="alto">Alto (4-5)</option>
                  <option value="medio">Médio (3)</option>
                  <option value="baixo">Baixo (1-2)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Tecnologia</label>
                <select
                  value={techFilter}
                  onChange={(e) => setTechFilter(e.target.value as 'all' | 'alta' | 'media' | 'baixa')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-1.5 py-1 text-slate-200"
                >
                  <option value="all">Todas</option>
                  <option value="alta">Alta (4-5)</option>
                  <option value="media">Média (3)</option>
                  <option value="baixa">Baixa (1-2)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={onlyMission}
                  onChange={(e) => setOnlyMission(e.target.checked)}
                  className="accent-emerald-400"
                />
                <span>Missão ativa (anel verde)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={onlyRoute}
                  onChange={(e) => setOnlyRoute(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>Rota visitada (tracejado)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={onlyInRange}
                  onChange={(e) => setOnlyInRange(e.target.checked)}
                  className="accent-sky-400"
                />
                <span>No alcance do salto</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showFactionAreas}
                  onChange={(e) => setShowFactionAreas(e.target.checked)}
                  className="accent-purple-400"
                />
                <span>Áreas de facção</span>
              </label>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFactionFilter('all');
                  setLifeFormFilter('all');
                  setRegionFilter('all');
                  setConflictFilter('all');
                  setTechFilter('all');
                  setOnlyMission(false);
                  setOnlyRoute(false);
                  setOnlyInRange(false);
                  setShowFactionAreas(true);
                }}
                className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Missões no canto inferior esquerdo */}
      <div className="fixed bottom-4 left-4 z-40 w-[220px]">
        <MissionCornerHud
          campaign={campaign}
          minimized={!missionsHudOpen}
          onToggleMinimize={() => setMissionsHudOpen((v) => !v)}
          onOpenMission={(mission) => {
            const target = getSystemSummaryById(mission.targetSystemId);
            if (target) {
              soundEngine.playClick();
              setSelectedSystem(target);
            }
          }}
        />
      </div>

      {/* Bottom Legend */}
      <div className="fixed bottom-4 left-[248px] right-4 z-40 max-w-[760px] bg-[#090e1a]/90 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-yellow-400 inline-block" /> Sistema Prime (Sede)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400 inline-block" /> Sistema Atual</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-slate-200 inline-block" /> Selecionado</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 inline-block" /> Missão Ativa</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#e7d3a1] inline-block" /> Selvagem (anel externo)</span>
        <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-cyan-400" /> {KNOWN_GALAXY_SYSTEMS.length} sistemas · +{KNOWN_GALAXY_SYSTEMS.filter((s) => s.id.startsWith('sys_wild_')).length} selvagens</span>
      </div>
    </div>
  );
};
