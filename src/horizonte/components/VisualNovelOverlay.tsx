import React from 'react';
import { ChevronRight, Cpu, Shield, Sparkles } from 'lucide-react';
import type { VisualNovelChoice, VisualNovelNode } from '../types/game';
import { SPECIES_BY_ID } from '../data/lifeforms';
import { CreatureCard } from './CreatureCard';
import { EquipmentSprite, HullSprite } from './SpriteArt';

interface VisualNovelOverlayProps {
  node: VisualNovelNode;
  onSelectChoice: (choice: VisualNovelChoice) => void;
}

const OPENING_STEPS = [
  '1. Raça',
  '2. Forma de Vida',
  '3. Raça (Nave & Arsenal)',
  '4. Facção',
];

export const VisualNovelOverlay: React.FC<VisualNovelOverlayProps> = ({ node, onSelectChoice }) => {
  const sp = SPECIES_BY_ID[node.speciesId];

  if (node.isOpening) {
    const currentStep = node.stepIndex ?? 1;
    const totalSteps = node.totalSteps ?? 4;
    const accent = node.accentColor ?? sp?.color ?? '#38bdf8';

    return (
      <div className="fixed inset-0 z-50 bg-[#050811]/98 flex items-center justify-center p-2.5 sm:p-5 md:p-7 overflow-y-auto pointer-events-auto">
        <div
          className="flex w-full max-w-[min(1360px,calc(var(--fit-w)*0.96))] min-h-[calc(var(--fit-h)*0.86)] max-h-[calc(var(--fit-h)*0.95)] flex-col justify-between gap-5 overflow-y-auto rounded-2xl border bg-[#090e1a] p-4 shadow-2xl sm:p-6 md:p-8"
          style={{ borderColor: `${accent}55` }}
        >
          {/* Top Progress Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-800/90">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-widest font-semibold font-mono-tabular" style={{ color: accent }}>
                Etapa {currentStep} de {totalSteps} · {node.stageTitle ?? 'Origem Galáctica'}
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                {node.stageFocusName ?? node.speakerName}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-mono-tabular">
              {OPENING_STEPS.map((label, idx) => {
                const stepNum = idx + 1;
                const isDone = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;
                return (
                  <React.Fragment key={label}>
                    {idx > 0 && <span className="text-slate-700 select-none">·</span>}
                    <span
                      className={
                        isCurrent
                          ? 'font-bold text-white underline underline-offset-4'
                          : isDone
                          ? 'text-emerald-400 font-medium'
                          : 'text-slate-500'
                      }
                      style={isCurrent ? { textDecorationColor: accent } : undefined}
                    >
                      {label}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Middle Narrative + Portrait */}
          <div className="flex flex-col md:flex-row gap-5 md:gap-7 items-center md:items-start py-1">
            <div className="flex md:flex-col items-center gap-3 shrink-0">
              <CreatureCard
                cardId={node.cardId}
                kind={node.cardKind}
                name={node.speakerName}
                lifeFormId={sp?.lifeFormId ?? 'humanoide'}
                description={node.speakerTitle}
                sizeClass="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36"
                allowAiGeneration={true}
              />
              <div className="md:text-center">
                <div className="text-sm font-bold text-white">{node.speakerName}</div>
                <div className="text-xs font-medium" style={{ color: accent }}>
                  {node.lifeFormName}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 text-center md:text-left">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {node.speakerTitle}
              </div>
              <p className="text-sm sm:text-base md:text-[17px] text-slate-100 leading-relaxed max-w-4xl">
                {node.text}
              </p>
              <div className="text-xs text-slate-400 pt-1">
                Escolha exatamente 1 benefício exclusivo abaixo. Todos os bônus, tecnologias, naves e habilidades permanecem ativos durante toda a sua campanha.
              </div>
            </div>
          </div>

          {/* Bottom 3 Exclusive Option Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 md:gap-4 items-stretch pt-2 border-t border-slate-800/90">
            {node.choices.map((choice) => {
              const hasBonus = Boolean(choice.effects.bonusModifiers);
              const hasAbility = Boolean(choice.effects.grantAbilityId);

              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onSelectChoice(choice)}
                  className="group text-left min-h-[168px] p-4 sm:p-5 rounded-xl bg-slate-900/90 hover:bg-slate-800/95 border border-slate-700/80 hover:border-cyan-400 transition-colors cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      {choice.previewHullId ? (
                        <HullSprite hullId={choice.previewHullId} size={46} />
                      ) : choice.previewEquipment ? (
                        <EquipmentSprite
                          category={choice.previewEquipment.category}
                          itemId={choice.previewEquipment.itemId}
                          size={46}
                        />
                      ) : (
                        <div
                          className="w-[46px] h-[46px] shrink-0 rounded-lg border border-slate-700/80 bg-slate-950 flex items-center justify-center"
                          style={{ borderColor: `${accent}66` }}
                        >
                          {hasAbility ? (
                            <Sparkles className="w-5 h-5" style={{ color: accent }} />
                          ) : hasBonus ? (
                            <Shield className="w-5 h-5" style={{ color: accent }} />
                          ) : (
                            <Cpu className="w-5 h-5" style={{ color: accent }} />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        {choice.categoryTag && (
                          <div
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: accent }}
                          >
                            {choice.categoryTag}
                          </div>
                        )}
                        <div className="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-cyan-200 transition-colors">
                          {choice.label}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
                      {choice.consequenceText}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/90 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-300 leading-snug">
                      {choice.hint ?? 'Benefício exclusivo de origem'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-cyan-300 shrink-0 group-hover:translate-x-0.5 transition-transform">
                      Escolher
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Standard compact mid-game dialogue bar (e.g. Level-2 first contact)
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6 pointer-events-auto">
      <div className="max-w-5xl mx-auto bg-[#070b15]/96 border border-cyan-500/40 rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex md:flex-col items-center gap-3 shrink-0">
          <CreatureCard
            cardId={node.cardId}
            kind={node.cardKind}
            name={node.speakerName}
            lifeFormId={sp?.lifeFormId ?? 'humanoide'}
            description={node.speakerTitle}
            sizeClass="w-24 h-24 md:w-32 md:h-32"
            allowAiGeneration={true}
          />
          <div className="md:text-center">
            <div className="text-xs font-bold text-white">{node.speakerName}</div>
            <div className="text-[11px] text-cyan-400">{node.lifeFormName}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">{node.speakerTitle}</div>
            <p className="text-sm md:text-[15px] text-slate-100 leading-relaxed">{node.text}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
            {node.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelectChoice(choice)}
                className="text-left p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 transition-colors cursor-pointer flex flex-col justify-between gap-1"
              >
                <span className="text-xs font-semibold text-white leading-snug">{choice.label}</span>
                {choice.hint && (
                  <span className="text-[11px] text-amber-300 font-medium">{choice.hint}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
