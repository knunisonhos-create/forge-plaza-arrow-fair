type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'portrait' | 'any' | 'natural') => Promise<void>;
  unlock?: () => void;
};

export function isDocumentFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  return Boolean(
    doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement
  );
}

function isTouchOrMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    window.matchMedia?.('(pointer: coarse)')?.matches ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

export function lockMobileLandscape(): void {
  if (typeof window === 'undefined' || !isTouchOrMobileDevice()) return;
  try {
    const ori = window.screen?.orientation as LockableOrientation | undefined;
    const res = ori?.lock?.('landscape');
    if (res && typeof res.catch === 'function') {
      res.catch(() => {});
    }
  } catch {
    // Ignorar caso o navegador não suporte trava de orientação
  }
}

export function enterGameFullscreen(lockLandscape = true): void {
  if (typeof document === 'undefined') return;
  const el = (document.documentElement || document.body) as FullscreenElement | null;
  if (!el) return;

  if (isDocumentFullscreen()) {
    if (lockLandscape) lockMobileLandscape();
    return;
  }

  try {
    const req =
      el.requestFullscreen?.bind(el) ||
      el.webkitRequestFullscreen?.bind(el) ||
      el.msRequestFullscreen?.bind(el);

    if (!req) return;

    let promise: Promise<void> | void;
    try {
      promise = req({ navigationUI: 'hide' });
    } catch {
      promise = req();
    }

    if (promise && typeof (promise as Promise<void>).then === 'function') {
      (promise as Promise<void>)
        .then(() => {
          if (lockLandscape) lockMobileLandscape();
        })
        .catch(() => {});
    } else if (lockLandscape) {
      lockMobileLandscape();
    }
  } catch {
    // Fallback silencioso caso o navegador ou iframe bloqueie Fullscreen API
  }
}

export function exitGameFullscreen(): void {
  if (typeof document === 'undefined') return;
  const doc = document as FullscreenDocument;
  try {
    if (isDocumentFullscreen()) {
      const exit =
        doc.exitFullscreen?.bind(doc) ||
        doc.webkitExitFullscreen?.bind(doc) ||
        doc.msExitFullscreen?.bind(doc);
      const res = exit?.();
      if (res && typeof (res as Promise<void>).catch === 'function') {
        (res as Promise<void>).catch(() => {});
      }
    }
    const ori = window.screen?.orientation as LockableOrientation | undefined;
    ori?.unlock?.();
  } catch {
    // Ignorar erros ao sair da tela cheia
  }
}
