import * as THREE from 'three';
import { PLANET_TYPES_BY_CODE } from '../data/planets';
import { SeededRNG } from '../utils/rng';

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getPlanetTexture(typeCode: string, seed: number, maxAnisotropy = 4): THREE.CanvasTexture {
  const key = `${typeCode}_${seed % 8}`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  const pt = PLANET_TYPES_BY_CODE[typeCode] ?? PLANET_TYPES_BY_CODE['TX01'];
  const [c1, c2, c3] = pt.palette;
  const rng = new SeededRNG(seed ^ typeCode.charCodeAt(2) * 131);

  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.5, c2);
  grad.addColorStop(1, c1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // TX-specific procedural patterns
  if (typeCode === 'TX12' || typeCode === 'TX15') {
    // Gas giant or plasma bands
    for (let y = 0; y < height; y += 6) {
      ctx.fillStyle = rng.chance(0.5) ? c3 : c1;
      ctx.globalAlpha = rng.range(0.18, 0.55);
      ctx.fillRect(0, y, width, rng.range(2, 7));
    }
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = c3;
    ctx.beginPath();
    ctx.ellipse(rng.range(40, 210), rng.range(35, 90), 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (typeCode === 'TX01' || typeCode === 'TX08' || typeCode === 'TX29') {
    // Craters / porous stone
    for (let i = 0; i < 45; i++) {
      const cx = rng.range(0, width);
      const cy = rng.range(0, height);
      const r = rng.range(2, 12);
      ctx.globalAlpha = rng.range(0.2, 0.55);
      ctx.fillStyle = rng.chance(0.5) ? c2 : c3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (typeCode === 'TX04') {
    // Lava veins on basalt
    ctx.strokeStyle = c2;
    ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      ctx.globalAlpha = rng.range(0.5, 0.9);
      ctx.beginPath();
      let px = rng.range(0, width);
      let py = rng.range(0, height);
      ctx.moveTo(px, py);
      for (let s = 0; s < 5; s++) {
        px += rng.range(-18, 18);
        py += rng.range(-12, 12);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (typeCode === 'TX10' || typeCode === 'TX11' || typeCode === 'TX18' || typeCode === 'TX22') {
    // Facets / crystals / geometric distortion
    for (let i = 0; i < 55; i++) {
      ctx.globalAlpha = rng.range(0.25, 0.65);
      ctx.fillStyle = rng.pick([c1, c2, c3]);
      const x = rng.range(0, width);
      const y = rng.range(0, height);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rng.range(8, 28), y + rng.range(-10, 12));
      ctx.lineTo(x + rng.range(-10, 18), y + rng.range(8, 26));
      ctx.closePath();
      ctx.fill();
    }
  } else if (typeCode === 'TX28' || typeCode === 'TX30' || typeCode === 'TX17') {
    // Intelligent / Artificial / Celestial city networks & circuits
    for (let i = 0; i < 38; i++) {
      ctx.globalAlpha = rng.range(0.3, 0.75);
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.ellipse(rng.range(0, width), rng.range(10, height - 10), rng.range(10, 30), rng.range(6, 18), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = c3;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 30; i++) {
      const x = rng.range(0, width);
      const y = rng.range(12, height - 12);
      ctx.strokeRect(x, y, rng.range(6, 22), rng.range(4, 14));
      ctx.fillStyle = c3;
      ctx.fillRect(x + 2, y + 2, 2, 2);
    }
  } else if (typeCode === 'TX13' || typeCode === 'TX26' || typeCode === 'TX27') {
    // Glowing spots / spores / bioluminescence
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = rng.range(0.3, 0.85);
      ctx.fillStyle = rng.chance(0.45) ? c3 : c2;
      ctx.beginPath();
      ctx.arc(rng.range(0, width), rng.range(0, height), rng.range(1.5, 6), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Continents, dunes, forests, swamps, oceans
    for (let i = 0; i < 42; i++) {
      ctx.globalAlpha = rng.range(0.28, 0.7);
      ctx.fillStyle = rng.chance(0.6) ? c3 : c2;
      ctx.beginPath();
      ctx.ellipse(
        rng.range(0, width),
        rng.range(8, height - 8),
        rng.range(8, 34),
        rng.range(5, 18),
        rng.range(0, Math.PI),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;

  textureCache.set(key, texture);
  return texture;
}

export interface DestroyedPlanetTextures {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

const destroyedTextureCache = new Map<string, DestroyedPlanetTextures>();

export function getDestroyedPlanetTexture(seed: number, maxAnisotropy = 4): DestroyedPlanetTextures {
  const key = `destroyed_${seed % 8}`;
  const existing = destroyedTextureCache.get(key);
  if (existing) return existing;

  const width = 512;
  const height = 256;
  const rng = new SeededRNG(seed ^ 0x9e3779b1);

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const eCtx = emissiveCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base charred basalt crust + neutral bump height
  aCtx.fillStyle = '#181416';
  aCtx.fillRect(0, 0, width, height);
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, width, height);
  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, width, height);

  // Shattered rock slabs & dark volcanic craters
  for (let i = 0; i < 95; i++) {
    const cx = rng.range(0, width);
    const cy = rng.range(0, height);
    const r = rng.range(6, 30);
    aCtx.fillStyle = rng.pick(['#241d20', '#2f2528', '#141013', '#3b2e30']);
    aCtx.globalAlpha = rng.range(0.45, 0.85);
    aCtx.beginPath();
    aCtx.moveTo(cx + rng.range(-r, r), cy + rng.range(-r * 0.6, r * 0.6));
    for (let v = 0; v < 5; v++) {
      const ang = (v / 5) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const rad = r * rng.range(0.6, 1.15);
      aCtx.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
    }
    aCtx.closePath();
    aCtx.fill();

    bCtx.fillStyle = rng.chance(0.5) ? '#c8c8c8' : '#585858';
    bCtx.globalAlpha = 0.55;
    bCtx.beginPath();
    bCtx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Deep molten lava fissure networks across crust
  const drawFissure = (startX: number, startY: number, steps: number, baseWidth: number) => {
    let px = startX;
    let py = startY;
    let angle = rng.range(0, Math.PI * 2);
    const pts: Array<[number, number]> = [[px, py]];
    for (let s = 0; s < steps; s++) {
      angle += rng.range(-0.85, 0.85);
      const len = rng.range(10, 26);
      px += Math.cos(angle) * len;
      py += Math.sin(angle) * len;
      pts.push([px, py]);
      if (rng.chance(0.28) && baseWidth > 2.2) {
        drawFissure(px, py, Math.max(3, Math.floor(steps * 0.5)), baseWidth * 0.55);
      }
    }

    const strokeAll = (ctx: CanvasRenderingContext2D, color: string, w: number, alpha: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
    };

    // Deep canyon trench on bump map
    strokeAll(bCtx, '#151515', baseWidth * 1.9, 0.9);
    // Outer red magma glow + bright orange + white-yellow molten core
    strokeAll(aCtx, '#991b1b', baseWidth * 1.8, 0.85);
    strokeAll(aCtx, '#ea580c', baseWidth * 1.15, 0.95);
    strokeAll(aCtx, '#fde047', Math.max(1.2, baseWidth * 0.48), 1);

    strokeAll(eCtx, '#b91c1c', baseWidth * 1.75, 0.9);
    strokeAll(eCtx, '#f97316', baseWidth * 1.1, 0.98);
    strokeAll(eCtx, '#fef08a', Math.max(1.2, baseWidth * 0.5), 1);
  };

  for (let f = 0; f < 34; f++) {
    drawFissure(rng.range(0, width), rng.range(12, height - 12), rng.int(5, 11), rng.range(2.6, 5.2));
  }

  // Exposed magma calderas
  for (let m = 0; m < 10; m++) {
    const mx = rng.range(24, width - 24);
    const my = rng.range(24, height - 24);
    const mr = rng.range(8, 22);
    const magGrad = aCtx.createRadialGradient(mx, my, 1, mx, my, mr);
    magGrad.addColorStop(0, '#fef08a');
    magGrad.addColorStop(0.45, '#f97316');
    magGrad.addColorStop(0.85, '#991b1b');
    magGrad.addColorStop(1, 'rgba(24,20,22,0)');

    aCtx.globalAlpha = 0.92;
    aCtx.fillStyle = magGrad;
    aCtx.beginPath();
    aCtx.arc(mx, my, mr, 0, Math.PI * 2);
    aCtx.fill();

    eCtx.globalAlpha = 0.96;
    eCtx.fillStyle = magGrad;
    eCtx.beginPath();
    eCtx.arc(mx, my, mr, 0, Math.PI * 2);
    eCtx.fill();

    bCtx.globalAlpha = 0.85;
    bCtx.fillStyle = '#1a1a1a';
    bCtx.beginPath();
    bCtx.arc(mx, my, mr * 0.75, 0, Math.PI * 2);
    bCtx.fill();
  }

  aCtx.globalAlpha = 1;
  eCtx.globalAlpha = 1;
  bCtx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = Math.min(8, maxAnisotropy);
  map.needsUpdate = true;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
  emissiveMap.anisotropy = Math.min(8, maxAnisotropy);
  emissiveMap.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  bumpMap.anisotropy = Math.min(8, maxAnisotropy);
  bumpMap.needsUpdate = true;

  const result = { map, emissiveMap, bumpMap };
  destroyedTextureCache.set(key, result);
  return result;
}

export function createRadialGlowTexture(colorHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.28, colorHex);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
