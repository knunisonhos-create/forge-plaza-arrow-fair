import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import type { LifeFormId } from '../types/game';
import { LIFE_FORMS_BY_ID } from '../data/lifeforms';
import { CreaturePortraitSvg, SpeciesPortraitSvg } from './SpeciesPortraits';

// Local in-memory + localStorage cache and concurrency queue (max 2 concurrent AI image calls)
const CLIENT_IMG_CACHE_PREFIX = 'he_card_ai_v1_';
const memoryImageCache = new Map<string, string>();
let activeRequests = 0;
const MAX_CONCURRENT = 2;
const requestQueue: Array<() => void> = [];

function enqueueImageTask<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeRequests++;
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeRequests--;
          const next = requestQueue.shift();
          if (next) next();
        });
    };
    if (activeRequests < MAX_CONCURRENT) {
      run();
    } else {
      requestQueue.push(run);
    }
  });
}

function readLocalCachedImage(cardId: string): string | null {
  if (memoryImageCache.has(cardId)) return memoryImageCache.get(cardId)!;
  try {
    const val = localStorage.getItem(CLIENT_IMG_CACHE_PREFIX + cardId);
    if (val) {
      memoryImageCache.set(cardId, val);
      return val;
    }
  } catch {
    // Ignore storage error
  }
  return null;
}

function writeLocalCachedImage(cardId: string, url: string) {
  memoryImageCache.set(cardId, url);
  try {
    localStorage.setItem(CLIENT_IMG_CACHE_PREFIX + cardId, url);
  } catch {
    // Ignore quota overflow
  }
}

interface CreatureCardProps {
  cardId: string;
  kind: 'species' | 'creature';
  name: string;
  lifeFormId: LifeFormId;
  description: string;
  sizeClass?: string;
  allowAiGeneration?: boolean;
}

export const CreatureCard: React.FC<CreatureCardProps> = ({
  cardId,
  kind,
  name,
  lifeFormId,
  description,
  sizeClass = 'w-24 h-24',
  allowAiGeneration = true,
}) => {
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(() => readLocalCachedImage(cardId));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check server persistent cache silently if not in local cache
  useEffect(() => {
    let cancelled = false;
    const local = readLocalCachedImage(cardId);
    if (local) {
      setAiImageUrl(local);
      return;
    }
    setAiImageUrl(null);
    setErrorMsg(null);

    fetch(`/api/card-image/${encodeURIComponent(cardId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { imageUrl?: string } | null) => {
        if (!cancelled && data?.imageUrl) {
          writeLocalCachedImage(cardId, data.imageUrl);
          setAiImageUrl(data.imageUrl);
        }
      })
      .catch(() => {
        // Ignore silent cache probe failure
      });

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const requestAiImage = async (regenerate: boolean) => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const lf = LIFE_FORMS_BY_ID[lifeFormId];
      const data = await enqueueImageTask(async () => {
        const res = await fetch('/api/card-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId,
            kind,
            name,
            lifeForm: lf?.name ?? lifeFormId,
            description,
            regenerate,
          }),
        });
        const json = (await res.json()) as { imageUrl?: string; error?: string };
        if (!res.ok || !json.imageUrl) {
          throw new Error(json.error || 'Falha ao gerar imagem.');
        }
        return json;
      });
      if (data.imageUrl) {
        writeLocalCachedImage(cardId, data.imageUrl);
        setAiImageUrl(data.imageUrl);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ou cota atingida.');
    } finally {
      setLoading(false);
    }
  };

  const speciesId = cardId.replace(/^species_/, '');

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border border-slate-700/70 bg-[#070b14] shrink-0 ${sizeClass}`}
    >
      {aiImageUrl ? (
        <img
          src={aiImageUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : kind === 'species' ? (
        <SpeciesPortraitSvg speciesId={speciesId} name={name} />
      ) : (
        <CreaturePortraitSvg cardId={cardId} lifeFormId={lifeFormId} name={name} />
      )}

      {loading && (
        <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center gap-1 text-[10px] text-cyan-300 font-medium">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Gerando...</span>
        </div>
      )}

      {allowAiGeneration && !loading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            requestAiImage(Boolean(aiImageUrl));
          }}
          title={aiImageUrl ? 'Regenerar Pixel Art com IA' : 'Gerar Pixel Art 320x320 com IA'}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-slate-900/90 hover:bg-cyan-600 text-slate-100 border border-slate-600/80 rounded p-1 cursor-pointer"
        >
          {aiImageUrl ? <RefreshCw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
        </button>
      )}

      {errorMsg && (
        <div className="absolute inset-x-0 bottom-0 bg-rose-950/95 border-t border-rose-500/50 p-1 text-[9px] leading-tight text-rose-100 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0 text-amber-300" />
            <span className="truncate">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              requestAiImage(Boolean(aiImageUrl));
            }}
            className="text-left underline text-amber-300 hover:text-amber-200 cursor-pointer"
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
};
