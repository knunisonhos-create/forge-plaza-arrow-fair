import React, { useMemo, useState } from 'react';
import { Rocket, Play, RotateCcw, Shield, Compass, Sparkles } from 'lucide-react';
import { FACTIONS, LIFE_FORMS, SPECIES } from '../data/lifeforms';
import { CreatureCard } from './CreatureCard';
import { getSystemSummaryById } from '../data/universe';
import type { LifeFormId, PlayerCampaignState } from '../types/game';

interface StartScreenProps {
  existingSave: PlayerCampaignState | null;
  onContinueSave: () => void;
  onStartNewGame: (speciesId: string, factionId: string, playerName: string) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  existingSave,
  onContinueSave,
  onStartNewGame,
}) => {
  const [playerName, setPlayerName] = useState('Comandante Lyra');
  const [selectedLifeForm, setSelectedLifeForm] = useState<LifeFormId>('humanoide');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('solarianos');
  const [selectedFactionId, setSelectedFactionId] = useState<string>('fac_solarianos_1');

  const speciesInLifeForm = useMemo(
    () => SPECIES.filter((s) => s.lifeFormId === selectedLifeForm),
    [selectedLifeForm]
  );

  const selectedSpecies = useMemo(
    () => SPECIES.find((s) => s.id === selectedSpeciesId) ?? speciesInLifeForm[0],
    [selectedSpeciesId, speciesInLifeForm]
  );

  const factionsForSpecies = useMemo(
    () => FACTIONS.filter((f) => f.speciesId === selectedSpecies.id),
    [selectedSpecies]
  );

  const selectedFaction = useMemo(
    () => FACTIONS.find((f) => f.id === selectedFactionId) ?? factionsForSpecies[0],
    [selectedFactionId, factionsForSpecies]
  );

  const handleLifeFormChange = (lfId: LifeFormId) => {
    setSelectedLifeForm(lfId);
    const firstSp = SPECIES.find((s) => s.lifeFormId === lfId);
    if (firstSp) {
      setSelectedSpeciesId(firstSp.id);
      const firstFac = FACTIONS.find((f) => f.speciesId === firstSp.id);
      if (firstFac) setSelectedFactionId(firstFac.id);
    }
  };

  const handleSpeciesChange = (spId: string) => {
    setSelectedSpeciesId(spId);
    const firstFac = FACTIONS.find((f) => f.speciesId === spId);
    if (firstFac) setSelectedFactionId(firstFac.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050811] text-slate-100 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-xs font-medium text-cyan-400 tracking-wide">
              Exploração Espacial Procedural 3D · 42 Setores · 7 Formas de Vida
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mt-1">
              Horizonte Estelar
            </h1>
          </div>

          {existingSave && (
            <button
              type="button"
              onClick={onContinueSave}
              className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Play className="w-4 h-4" />
              Continuar Campanha ({existingSave.playerName} · {existingSave.credits.toLocaleString('pt-BR')} cr)
            </button>
          )}
        </div>

        <div className="start-grid grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column: Life Form & Species Selection */}
          <div className="start-main space-y-5 rounded-xl border border-slate-800 bg-[#090e1a] p-5 lg:col-span-7">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Nome do Explorador
              </label>
              <input
                type="text"
                maxLength={32}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-2">
                1. Forma de Vida (7 Biologias)
              </h2>
              <div className="start-forms grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LIFE_FORMS.map((lf) => (
                  <button
                    key={lf.id}
                    type="button"
                    onClick={() => handleLifeFormChange(lf.id)}
                    className={`px-3 py-2 rounded-lg text-left text-xs border transition-colors cursor-pointer ${
                      selectedLifeForm === lf.id
                        ? 'bg-slate-800 border-cyan-400 text-white font-semibold'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: lf.color }} />
                    {lf.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {LIFE_FORMS.find((l) => l.id === selectedLifeForm)?.biology} Nicho:{' '}
                {LIFE_FORMS.find((l) => l.id === selectedLifeForm)?.nicheSummary}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-2">
                2. Espécie Inteligente (21 Espécies)
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {speciesInLifeForm.map((sp) => {
                  const active = sp.id === selectedSpecies.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handleSpeciesChange(sp.id)}
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer flex flex-col gap-2.5 min-h-[8.5rem] ${
                        active
                          ? 'bg-slate-800/90 border-cyan-400 text-white'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreatureCard
                          cardId={`species_${sp.id}`}
                          kind="species"
                          name={sp.name}
                          lifeFormId={sp.lifeFormId}
                          description={sp.description}
                          sizeClass="w-16 h-16"
                          allowAiGeneration={false}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{sp.name}</div>
                          <div className="text-xs text-slate-400 capitalize">{sp.temperament}</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">{sp.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-2">
                3. Facção de Origem (42 Setores Galácticos)
              </h2>
              <div className="start-factions grid grid-cols-1 sm:grid-cols-2 gap-3">
                {factionsForSpecies.map((fac) => {
                  const active = fac.id === selectedFaction.id;
                  return (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => setSelectedFactionId(fac.id)}
                      className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer space-y-1.5 ${
                        active
                          ? 'bg-slate-800/90 border-cyan-400 text-white'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fac.color }} />
                          {fac.name}
                        </span>
                        <span className="text-[11px] text-cyan-300 font-medium">{fac.axis}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{fac.economyFocus}</p>
                      <p className="text-[11px] text-slate-500">Costumes: {fac.customs}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Origin Summary & Launch */}
          <div className="start-side lg:col-span-5 bg-[#090e1a] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-4">
              <CreatureCard
                cardId={`species_${selectedSpecies.id}`}
                kind="species"
                name={selectedSpecies.name}
                lifeFormId={selectedSpecies.lifeFormId}
                description={selectedSpecies.description}
                sizeClass="w-28 h-28"
                allowAiGeneration={true}
              />
              <div className="space-y-1">
                <div className="text-xs text-cyan-400 font-medium">Dossiê da Origem</div>
                <h3 className="font-display text-xl font-bold text-white">{selectedSpecies.name}</h3>
                <div className="text-xs font-medium" style={{ color: selectedFaction.color }}>
                  {selectedFaction.name}
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Estilo tecnológico: <span className="text-slate-200 capitalize">{selectedFaction.techStyle}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs border-t border-slate-800 pt-3">
              <div className="flex items-start gap-2">
                <Compass className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400">Setor capital:</span>{' '}
                  <span className="text-slate-200">
                    {getSystemSummaryById(selectedFaction.capitalSystemId)?.name ?? 'Setor da facção'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400">Leis:</span>{' '}
                  <span className="text-slate-200">{selectedFaction.laws}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400">Traços da Espécie:</span>{' '}
                  <span className="text-slate-200">{selectedSpecies.traits.join(' · ')}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-slate-100">Nave Inicial: Balsa Estelar Civil</div>
              <div className="text-slate-400">
                Casco 165. Compartimento de 40 unidades, mais 35 do rebocador. Motor de salto de 16 anos-luz. Canhão laser civil. Broca mineral civil. Um posto ativo e uma reserva.
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartNewGame(selectedSpecies.id, selectedFaction.id, playerName)}
              className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Rocket className="w-4 h-4" />
              {existingSave ? 'Iniciar Nova Campanha (Sobrescrever)' : 'Iniciar Exploração'}
            </button>

            {existingSave && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" />
                Você tem uma campanha salva em andamento no botão verde acima.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
