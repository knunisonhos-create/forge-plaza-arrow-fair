import React, { useLayoutEffect, useState } from 'react';
import { DESKTOP_LAYOUT_HEIGHT, mobileLandscapeScale } from '../utils/mobileLandscape';

interface StageBox {
  width: number;
  height: number;
  scale: number;
}

function measureStage(): StageBox {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scale = mobileLandscapeScale(width, height);
  if (scale >= 0.999) {
    return { width, height, scale: 1 };
  }
  return {
    width: width / scale,
    height: DESKTOP_LAYOUT_HEIGHT,
    scale,
  };
}

/** No celular deitado, desenha a interface como numa janela de computador e reduz por igual. */
export const MobileLandscapeFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stage, setStage] = useState<StageBox | null>(null);

  useLayoutEffect(() => {
    const apply = () => setStage(measureStage());
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      vv?.removeEventListener('resize', apply);
    };
  }, []);

  const scaled = stage != null && stage.scale < 0.999;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#040710]">
      <div
        className="game-stage relative h-full w-full"
        style={
          scaled && stage
            ? {
                width: `${stage.width}px`,
                height: `${stage.height}px`,
                transform: `scale(${stage.scale})`,
                transformOrigin: 'top left',
                ['--fit-w' as string]: `${stage.width}px`,
                ['--fit-h' as string]: `${stage.height}px`,
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
};
