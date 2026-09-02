import React, { useState } from 'react';
import { 
  Compass, 
  Sparkles, 
  Bot, 
  Image as ImageIcon, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  RefreshCw, 
  Layers,
  CheckCircle,
  Download
} from 'lucide-react';
import { TreeData, Person, EpistemicStatus } from '../../types/genealogy';

interface AncestorSimulationViewProps {
  tree: TreeData;
  preSelectedPerson?: Person | null;
}

export const AncestorSimulationView: React.FC<AncestorSimulationViewProps> = ({
  tree,
  preSelectedPerson,
}) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    preSelectedPerson?.id || (tree.persons[0]?.id || '')
  );
  const [simulationLevel, setSimulationLevel] = useState<0 | 1 | 2 | 3 | 4 | 5>(2);
  const [researchQuestion, setResearchQuestion] = useState(
    'Simulate a day in the life of this ancestor during the harvest season of 1845, reflecting their confirmed occupation, local geography, and weather conditions.'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [narrativeOutput, setNarrativeOutput] = useState<string | null>(null);
  const [epistemicReceipt, setEpistemicReceipt] = useState<any>(null);

  // Image Generation State
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imagePromptInput, setImagePromptInput] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);

  const selectedPerson = tree.persons.find((p) => p.id === selectedPersonId);

  const handleRunSimulation = async () => {
    if (!selectedPerson) return;
    setIsLoading(true);
    setNarrativeOutput(null);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch('/api/gemini/simulate-ancestor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person: selectedPerson,
          tree,
          constraintLevel: simulationLevel,
          userPrompt: researchQuestion,
        }),
      });
      const data = await res.json();
      setNarrativeOutput(data.simulation || data.simulationText);
      setEpistemicReceipt({
        constraintLevel: simulationLevel,
        personName: `${selectedPerson.firstName} ${selectedPerson.lastName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error(err);
      setNarrativeOutput('Failed to execute simulation via backend engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateHistoricalImage = async () => {
    if (!selectedPerson) return;
    setIsGeneratingImage(true);
    setImageError(null);

    const prompt =
      imagePromptInput ||
      `Authentic 19th-century historical portrait painting of ${selectedPerson.firstName} ${selectedPerson.lastName}, a ${selectedPerson.occupation || 'farmer'} born in ${selectedPerson.birthPlace || 'Prince Edward Island'}, circa 1840. Authentic archival daguerreotype aesthetic with period clothing and natural lighting.`;

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageSize,
        }),
      });
      const data = await res.json();
      if (data.imageUrl || data.image) {
        setGeneratedImageUrl(data.imageUrl || data.image);
      } else if (data.error) {
        setImageError(data.error);
      }
    } catch (err: any) {
      console.error(err);
      setImageError(err.message || 'Image generation network error.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const getLevelDescription = (level: number) => {
    switch (level) {
      case 0: return 'Level 0: Verbatim Archival Quotes Only (Strict literal transcription)';
      case 1: return 'Level 1: Strict Logical Derivations (Direct deductive facts)';
      case 2: return 'Level 2: Controlled Plausible Inferences (Bounded by contemporaneous local history)';
      case 3: return 'Level 3: Counterfactual Branching & Hypothesis Testing';
      case 4: return 'Level 4: Synthetic Biographical Narrative';
      case 5: return 'Level 5: Full Sensory & Psychological World Simulation';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="w-6 h-6 text-amber-400" />
          <h2 className="font-['Cinzel'] font-bold text-xl text-amber-100">
            Ancestor Simulation Studio & Possible-World Engine
          </h2>
        </div>
        <p className="text-xs text-stone-400 font-mono max-w-3xl">
          Constrained by strict epistemic guardrails (Level 0 through Level 5). Every simulated claim is classified as [DOCUMENTED], [DERIVED], [INFERRED], or [CONTEXTUAL] to prevent genealogical hallucinations.
        </p>
      </div>

      {/* Control Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-xl space-y-4">
          <h3 className="font-['Cinzel'] font-bold text-sm text-stone-100 uppercase tracking-wider">
            Simulation Parameters
          </h3>

          {/* Person Selector */}
          <div>
            <label className="block text-[11px] font-mono text-stone-400 uppercase mb-1">
              Select Ancestor Subject
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              {tree.persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.birthDate ? p.birthDate.substring(0, 4) : '????'})
                </option>
              ))}
            </select>
          </div>

          {/* Epistemic Constraint Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-stone-400 uppercase">
                Epistemic Guardrail Constraint
              </label>
              <span className="text-xs font-mono font-bold text-amber-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                Level {simulationLevel}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={simulationLevel}
              onChange={(e) => setSimulationLevel(parseInt(e.target.value, 10) as any)}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-amber-300/90 font-mono bg-stone-950 p-2 rounded-lg border border-stone-800">
              {getLevelDescription(simulationLevel)}
            </p>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[11px] font-mono text-stone-400 uppercase mb-1">
              Historical Query or Scenario
            </label>
            <textarea
              rows={4}
              value={researchQuestion}
              onChange={(e) => setResearchQuestion(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Constrained World...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Ancestor Simulation</span>
              </>
            )}
          </button>
        </div>

        {/* Output & Narrative Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-4 min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-400" />
                  <h4 className="font-['Cinzel'] font-bold text-base text-amber-200">
                    Epistemically Labeled Simulation Output
                  </h4>
                </div>
                {epistemicReceipt && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Level {epistemicReceipt.constraintLevel} Active
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                  <p className="text-xs font-mono text-stone-400">
                    Querying archival corpus & enforcing W3C PROV-O citation integrity...
                  </p>
                </div>
              ) : narrativeOutput ? (
                <div className="prose prose-invert max-w-none text-xs font-serif leading-relaxed text-stone-200 space-y-3 whitespace-pre-wrap">
                  {narrativeOutput}
                </div>
              ) : (
                <div className="py-20 text-center text-stone-500 text-xs font-mono">
                  Configure simulation parameters on the left and click "Run Ancestor Simulation" to generate historical world projections.
                </div>
              )}
            </div>

            {/* Epistemic Legend */}
            <div className="pt-4 border-t border-stone-800/80 flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span className="text-stone-500">Legend:</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">[DOCUMENTED]</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">[DERIVED]</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">[INFERRED]</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">[CONTEXTUAL]</span>
            </div>
          </div>

          {/* Historical Scene Visualizer (Gemini 3.1 Flash Image) */}
          <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-400" />
                <h4 className="font-['Cinzel'] font-bold text-sm text-stone-100">
                  Historical Visual Reconstruction (Gemini 3.1 Flash Image)
                </h4>
              </div>

              {/* Resolution Switcher: 1K / 2K / 4K */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs font-mono">
                {(['1K', '2K', '4K'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setImageSize(sz)}
                    className={`px-2.5 py-0.5 rounded transition ${
                      imageSize === sz ? 'bg-purple-600 text-purple-50 font-bold' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Optional visual prompt override (e.g. 1840s daguerreotype in shipyard)..."
                value={imagePromptInput}
                onChange={(e) => setImagePromptInput(e.target.value)}
                className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleGenerateHistoricalImage}
                disabled={isGeneratingImage}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-purple-50 font-bold text-xs shadow-lg transition flex items-center gap-1.5 shrink-0"
              >
                {isGeneratingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate {imageSize} Scene</span>
              </button>
            </div>

            {imageError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-2 text-xs font-mono text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{imageError}</span>
              </div>
            )}

            {generatedImageUrl && (
              <div className="mt-4 rounded-xl overflow-hidden border border-purple-500/40 bg-stone-950 text-center p-2">
                <img
                  src={generatedImageUrl}
                  alt="Reconstructed Ancestor Scene"
                  referrerPolicy="no-referrer"
                  className="w-full max-h-96 object-contain rounded-lg mx-auto"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
