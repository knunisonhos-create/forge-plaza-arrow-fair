import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { canvasPixelRatio } from '../utils/mobileLandscape';

export interface HyperspaceWarpOverlayProps {
  targetSystemName: string;
  shipColor: string;
  factionColor?: string;
  factionName?: string;
}

export const HyperspaceWarpOverlay: React.FC<HyperspaceWarpOverlayProps> = ({
  targetSystemName,
  shipColor,
  factionColor = '#38bdf8',
  factionName,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020510');
    scene.fog = new THREE.FogExp2('#020510', 0.015);

    const camera = new THREE.PerspectiveCamera(68, w / Math.max(1, h), 0.1, 220);
    camera.position.set(0, 1.35, 9.5);
    camera.lookAt(0, 0, -25);

    const canvas = document.createElement('canvas');
    const glProbe = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const dbg = glProbe?.getExtension('WEBGL_debug_renderer_info');
    const glRendererStr = dbg ? String(glProbe?.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '') : '';
    const isSoftwareGl = /swiftshader|llvmpipe|software/i.test(glRendererStr);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : canvasPixelRatio(w, h));
    renderer.setSize(w, h);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting for ship silhouette inside warp tunnel
    scene.add(new THREE.AmbientLight('#7dd3fc', 1.1));
    const frontLight = new THREE.PointLight(factionColor || '#38bdf8', 4.5, 40);
    frontLight.position.set(0, 3, -6);
    scene.add(frontLight);
    const engineBackLight = new THREE.PointLight('#22d3ee', 3.5, 25);
    engineBackLight.position.set(0, 0.5, 6);
    scene.add(engineBackLight);

    // Player ship composite in tunnel center
    const shipGroup = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({
      color: shipColor || '#38bdf8',
      roughness: 0.35,
      metalness: 0.72,
      emissive: shipColor || '#38bdf8',
      emissiveIntensity: 0.16,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.35,
      metalness: 0.6,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.55,
      metalness: 0.65,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: '#67e8f9' });

    const bodyGeo = new THREE.ConeGeometry(0.55, 2.5, 8);
    bodyGeo.rotateX(-Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, hullMat);
    shipGroup.add(bodyMesh);

    const bridgeGeo = new THREE.BoxGeometry(0.42, 0.24, 0.85);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, trimMat);
    bridgeMesh.position.set(0, 0.22, 0.2);
    shipGroup.add(bridgeMesh);

    const wingGeo = new THREE.BoxGeometry(2.35, 0.08, 0.9);
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.position.set(0, -0.02, 0.45);
    shipGroup.add(wingMesh);

    const thrusterGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.55, 8);
    thrusterGeo.rotateX(Math.PI / 2);
    const thrusterL = new THREE.Mesh(thrusterGeo, glowMat);
    thrusterL.position.set(-0.36, -0.02, 1.35);
    const thrusterR = new THREE.Mesh(thrusterGeo, glowMat);
    thrusterR.position.set(0.36, -0.02, 1.35);
    shipGroup.add(thrusterL, thrusterR);

    shipGroup.position.set(0, -0.25, 2.2);
    scene.add(shipGroup);

    // Hyperspace Tunnel Rings
    const ringGeo = new THREE.TorusGeometry(6.8, 0.09, 6, 32);
    const ringMatA = new THREE.MeshBasicMaterial({
      color: factionColor || '#38bdf8',
      transparent: true,
      opacity: 0.58,
    });
    const ringMatB = new THREE.MeshBasicMaterial({
      color: '#a5f3fc',
      transparent: true,
      opacity: 0.42,
    });
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(ringGeo, i % 2 === 0 ? ringMatA : ringMatB);
      m.position.z = -i * 6.5;
      m.rotation.z = i * 0.25;
      scene.add(m);
      rings.push(m);
    }

    // Starlight / Warp Streaks
    const streakGeo = new THREE.BoxGeometry(0.06, 0.06, 8.5);
    const streakColors = ['#ffffff', '#38bdf8', '#c084fc', shipColor || '#22d3ee', '#fde047'];
    const streakMats = streakColors.map((c) => new THREE.MeshBasicMaterial({ color: c }));
    const streaks: Array<{ mesh: THREE.Mesh; speed: number }> = [];
    for (let i = 0; i < 95; i++) {
      const mat = streakMats[i % streakMats.length];
      const mesh = new THREE.Mesh(streakGeo, mat);
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 2.6 + ((i * 17) % 100) * 0.075;
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -((i * 13) % 145));
      scene.add(mesh);
      streaks.push({ mesh, speed: 65 + (i % 5) * 18 });
    }

    let disposed = false;
    let contextLost = false;
    let frameId = 0;
    const clock = new THREE.Clock();

    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const onResize = () => {
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || window.innerHeight;
      if (nw <= 0 || nh <= 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(isSoftwareGl ? 1 : canvasPixelRatio(nw, nh));
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.004, clock.getDelta()));
      const elapsed = clock.elapsedTime;

      // Dynamic tunnel velocity & slight FOV pull
      camera.fov = 68 + Math.min(18, elapsed * 10);
      camera.updateProjectionMatrix();

      shipGroup.rotation.z = Math.sin(elapsed * 5.2) * 0.16;
      shipGroup.rotation.x = Math.cos(elapsed * 4.1) * 0.05;
      shipGroup.position.y = -0.25 + Math.sin(elapsed * 6.5) * 0.09;
      thrusterL.scale.setScalar(0.95 + Math.sin(elapsed * 28) * 0.18);
      thrusterR.scale.setScalar(0.95 + Math.cos(elapsed * 28) * 0.18);

      for (const r of rings) {
        r.position.z += dt * 78;
        r.rotation.z += dt * 0.9;
        if (r.position.z > 14) {
          r.position.z -= 24 * 6.5;
        }
      }

      for (const s of streaks) {
        s.mesh.position.z += dt * s.speed;
        if (s.mesh.position.z > 12) {
          s.mesh.position.z -= 150;
        }
      }

      if (!contextLost) {
        renderer.render(scene, camera);
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      bodyGeo.dispose();
      bridgeGeo.dispose();
      wingGeo.dispose();
      thrusterGeo.dispose();
      ringGeo.dispose();
      streakGeo.dispose();
      hullMat.dispose();
      trimMat.dispose();
      wingMat.dispose();
      glowMat.dispose();
      ringMatA.dispose();
      ringMatB.dispose();
      streakMats.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [shipColor, factionColor]);

  return (
    <div className="fixed inset-0 z-50 bg-[#020510] overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Crisp Warp Navigation Banner */}
      <div className="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center px-4">
        <div
          className="w-full max-w-md rounded-2xl bg-[#070d1b]/92 border px-5 py-3.5 text-center shadow-2xl space-y-2"
          style={{ borderColor: `${factionColor}88` }}
        >
          <div className="text-[11px] uppercase tracking-widest text-cyan-300 font-semibold">
            Salto Hiperespacial em Curso
          </div>
          <div className="text-lg font-bold text-white tracking-tight truncate">
            Destino: <span style={{ color: factionColor }}>{targetSystemName}</span>
          </div>
          {factionName && (
            <div className="text-[11px] text-slate-300">
              Nave alinhada à <strong style={{ color: shipColor }}>{factionName}</strong>
            </div>
          )}
          <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: '100%',
                backgroundColor: factionColor || '#38bdf8',
                animation: 'warpFill 1.95s linear forwards',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes warpFill {
          from { transform: translateX(-100%); }
          to { transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
};
