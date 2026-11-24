/** Altura de referência de uma janela de computador. No celular deitado, a interface
 * é desenhada nessa altura e reduzida por igual até caber na tela. */
export const DESKTOP_LAYOUT_HEIGHT = 800;

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const noHover = window.matchMedia?.('(hover: none)')?.matches ?? false;
  const ua = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return coarse || noHover || ua;
}

/** 1 no computador e no celular em pé. Menor que 1 só no celular deitado e baixo. */
export function mobileLandscapeScale(width: number, height: number): number {
  if (!isMobileDevice()) return 1;
  if (width <= height) return 1;
  if (height >= DESKTOP_LAYOUT_HEIGHT) return 1;
  return height / DESKTOP_LAYOUT_HEIGHT;
}

/** Mantém o desenho 3D nítido quando o palco CSS é maior que a tela visível. */
export function canvasPixelRatio(layoutWidth: number, layoutHeight: number): number {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(
    1,
    window.innerWidth / Math.max(1, layoutWidth),
    window.innerHeight / Math.max(1, layoutHeight)
  );
  return Math.max(0.5, Math.min(dpr, 2) * fit);
}
