import React, { useState } from 'react';
import { 
  Route, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  Dna, 
  User, 
  Search,
  ExternalLink,
  BrainCircuit,
  Compass
} from 'lucide-react';
import { TreeData, Person, ProofPathResult } from '../../types/genealogy';
import { solveProofPath } from '../../utils/proofpath';

interface ProofPathLabProps {
  tree: TreeData;
  initialSourceId?: string | null;
  onSelectPerson: (personId: string) => void;
  onTriggerFalsification: (person: Person) => void;
  onTriggerAiResearch: (prompt: string, context: any) => void;
}

export const ProofPathLab: React.FC<ProofPathLabProps> = ({
  tree,
  initialSourceId,
  onSelectPerson,
  onTriggerFalsification,
  onTriggerAiResearch,
}) => {
  const [sourceId, setSourceId] = useState<string>(
    initialSourceId || (tree.persons.length > 0 ? tree.persons[0].id : '')
  );
  const [targetId, setTargetId] = useState<string>(
    tree.persons.length > 3 ? tree.persons[3].id : (tree.persons[1]?.id || '')
  );

  const [allowedLayers, setAllowedLayers] = useState<Array<'accepted' | 'probable' | 'hypothetical' | 'social' | 'dna'>>([
    'accepted',
    'probable',
    'hypothetical',
    'dna',
  ]);

  const [pathResult, setPathResult] = useState<ProofPathResult | null>(() => {
    if (sourceId && targetId && sourceId !== targetId) {
      return solveProofPath(tree, sourceId, targetId, allowedLayers);
    }
    return null;
  });

  const handleSolve = () => {
    if (!sourceId || !targetId) return;
    const res = solveProofPath(tree, sourceId, targetId, allowedLayers);
    setPathResult(res);
  };

  const toggleLayer = (layer: 'accepted' | 'probable' | 'hypothetical' | 'social' | 'dna') => {
    const updated = allowedLayers.includes(layer)
      ? allowedLayers.filter((l) => l !== layer)
      : [...allowedLayers, layer];
    setAllowedLayers(updated);
  };

  const sourcePerson = tree.persons.find((p) => p.id === sourceId);
  const targetPerson = tree.persons.find((p) => p.id === targetId);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <Route className="w-6 h-6 text-amber-400" />
          <h2 className="font-['Cinzel'] font-bold text-xl text-amber-100">
            ProofPath Relationship & Multi-Layer Solver
          </h2>
        </div>
        <p className="text-xs text-stone-400 font-mono max-w-3xl">
          Computes shortest verified lineage, highest-evidence routes, and hybrid paths across biological parentage, FAN club co-presence, and DNA triangulation. Identifies the single weakest link for targeted falsification.
        </p>
      </div>

      {/* Solver Controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source Person */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-amber-400">
              Origin Ancestor / Proband (Person A)
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              {tree.persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.birthDate ? p.birthDate.substring(0, 4) : '????'})
                </option>
              ))}
            </select>
          </div>

          {/* Target Person */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-amber-400">
              Target Relative / Test Subject (Person B)
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              {tree.persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.birthDate ? p.birthDate.substring(0, 4) : '????'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Layer Checkboxes */}
        <div className="space-y-2">
          <label className="block text-[11px] font-mono uppercase text-stone-400">
            Active Multi-Layer Traversal Constraints
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'accepted', label: '🟢 Accepted Kinship (GPS Validated)' },
              { id: 'probable', label: '🟡 Probable Direct Links' },
              { id: 'hypothetical', label: '🔵 Working Hypotheses' },
              { id: 'social', label: '🟣 FAN Club / Social Co-presence' },
              { id: 'dna', label: '🔴 Shared DNA Segments' },
            ].map((layer) => {
              const active = allowedLayers.includes(layer.id as any);
              return (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                    active
                      ? 'bg-amber-950/40 text-amber-200 border-amber-500/60 shadow'
                      : 'bg-stone-950 text-stone-500 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {layer.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSolve}
          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Execute ProofPath Solver
        </button>
      </div>

      {/* Results Display */}
      {pathResult && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Summary Score Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-stone-400">Computed Route Kinship</span>
              <h3 className="font-['Cinzel'] font-bold text-lg text-amber-200">
                {pathResult.relationshipDescription}
              </h3>
              <p className="text-xs text-stone-400 font-mono">
                {pathResult.degreesOfSeparation} Degrees of Separation | {pathResult.edges.length} Chain Steps
              </p>
            </div>

            <div className="flex items-center gap-3 bg-stone-950 px-4 py-3 rounded-xl border border-stone-800">
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-stone-400">Route Reliability</span>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  {Math.round(pathResult.confidenceScore * 100)}% GPS
                </p>
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          {/* Step-by-Step Path Visualization */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="font-['Cinzel'] font-bold text-sm text-stone-100 uppercase tracking-wider">
              Lineage Chain Sequence
            </h4>

            <div className="space-y-3">
              {pathResult.path.map((person, idx) => {
                const isWeakest = pathResult.weakestLink?.person.id === person.id;
                const edge = pathResult.edges[idx];

                return (
                  <div key={person.id} className="space-y-3">
                    <div
                      onClick={() => onSelectPerson(person.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                        isWeakest
                          ? 'bg-rose-950/20 border-rose-500/50 shadow-rose-950/20'
                          : 'bg-stone-950 border-stone-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center font-mono font-bold text-xs text-amber-300">
                          {idx + 1}
                        </div>
                        <div>
                          <h5 className="font-['Cinzel'] font-bold text-sm text-stone-100">
                            {person.firstName} {person.lastName}
                          </h5>
                          <p className="text-xs text-stone-400 font-mono">
                            {person.birthDate || '????'} – {person.deathDate || '????'} {person.birthPlace ? `• ${person.birthPlace}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isWeakest && (
                          <div className="flex items-center gap-1 bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded text-[10px] font-mono border border-rose-500/40">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Vulnerable Proof Step</span>
                          </div>
                        )}
                        <span className="text-[11px] font-mono text-stone-400">
                          Confidence: {Math.round((person.confidenceScore || 0.8) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Edge between individuals */}
                    {edge && (
                      <div className="flex items-center gap-3 px-6 py-1 text-xs font-mono text-amber-400">
                        <div className="w-px h-6 bg-amber-500/40 ml-4" />
                        <span className="bg-stone-950 px-2 py-0.5 rounded border border-stone-800 text-[10px] uppercase text-stone-300">
                          {edge.relationshipType} ({edge.layer.toUpperCase()})
                        </span>
                        {edge.evidenceCount > 0 && (
                          <span className="text-[10px] text-stone-500">
                            {edge.evidenceCount} corroborating sources
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weakest Link Falsification Card */}
          {pathResult.weakestLink && (
            <div className="bg-rose-950/20 border border-rose-500/40 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <h4 className="font-['Cinzel'] font-bold text-sm text-rose-200">
                    Weakest Link Identified: {pathResult.weakestLink.person.firstName} {pathResult.weakestLink.person.lastName}
                  </h4>
                </div>
                <button
                  onClick={() => onTriggerFalsification(pathResult.weakestLink!.person)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-stone-950 font-bold text-xs shadow transition"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  Run Falsification Agent
                </button>
              </div>

              <p className="text-xs text-stone-300 font-mono bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                {pathResult.weakestLink.reason}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
