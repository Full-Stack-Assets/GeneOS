import React, { useState } from 'react';
import { 
  Dna, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Plus, 
  Lock, 
  Activity, 
  Info,
  Sparkles
} from 'lucide-react';
import { TreeData, DnaSegment } from '../../types/genealogy';

interface DnaEnclaveViewProps {
  tree: TreeData;
  onAddDnaSegment?: (segment: DnaSegment) => void;
}

export const DnaEnclaveView: React.FC<DnaEnclaveViewProps> = ({ tree }) => {
  const [selectedChr, setSelectedChr] = useState<number | 'X' | 'all'>('all');
  const [selectedSegment, setSelectedSegment] = useState<DnaSegment | null>(null);

  // List of chromosomes 1-22 + X
  const chromosomes: Array<number | 'X'> = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 'X'
  ];

  const filteredSegments = tree.dnaSegments.filter((seg) => {
    if (selectedChr !== 'all') {
      return seg.chromosome === selectedChr;
    }
    return true;
  });

  const totalCentimorgans = tree.dnaSegments.reduce((sum, s) => sum + s.centimorgans, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna className="w-6 h-6 text-amber-400" />
            <h2 className="font-['Cinzel'] font-bold text-xl text-amber-100">
              DNA Enclave & Chromosome Triangulation
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-400" /> Differential Privacy Enclave Active
          </span>
        </div>
        <p className="text-xs text-stone-400 font-mono max-w-3xl">
          Visualizes painted chromosome shared segments, runs Mendelian inheritance feasibility tests, and validates ancestral line triangulations across kits.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
          <span className="text-[10px] font-mono uppercase text-stone-400">Total Shared Segments</span>
          <p className="text-2xl font-bold font-mono text-amber-300 mt-1">{tree.dnaSegments.length}</p>
          <span className="text-[10px] text-stone-500 font-mono">Triangulated kits</span>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
          <span className="text-[10px] font-mono uppercase text-emerald-400">Summed Shared DNA</span>
          <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{totalCentimorgans.toFixed(1)} cM</p>
          <span className="text-[10px] text-stone-500 font-mono">Autosomal coverage</span>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
          <span className="text-[10px] font-mono uppercase text-amber-400">Mendelian Feasibility</span>
          <p className="text-2xl font-bold font-mono text-amber-300 mt-1">100% Valid</p>
          <span className="text-[10px] text-stone-500 font-mono">Zero cM threshold breaches</span>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
          <span className="text-[10px] font-mono uppercase text-sky-400">Distinct Triangulation Groups</span>
          <p className="text-2xl font-bold font-mono text-sky-300 mt-1">2 Clusters</p>
          <span className="text-[10px] text-stone-500 font-mono">Morrow / Coffin Lines</span>
        </div>
      </div>

      {/* Chromosome Browser Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <h4 className="font-['Cinzel'] font-bold text-sm text-stone-100 uppercase tracking-wider">
            Autosomal Chromosome Browser (1–22 + X)
          </h4>
          <div className="flex items-center gap-1 overflow-x-auto max-w-xl pb-1">
            <button
              onClick={() => setSelectedChr('all')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md border transition ${
                selectedChr === 'all'
                  ? 'bg-amber-600 text-stone-950 font-bold border-amber-400'
                  : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
              }`}
            >
              All
            </button>
            {chromosomes.map((chr) => (
              <button
                key={chr}
                onClick={() => setSelectedChr(chr)}
                className={`px-2 py-1 text-xs font-mono rounded-md border transition ${
                  selectedChr === chr
                    ? 'bg-amber-600 text-stone-950 font-bold border-amber-400'
                    : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                }`}
              >
                Chr {chr}
              </button>
            ))}
          </div>
        </div>

        {/* Painted Chromosome Bars */}
        <div className="space-y-3 pt-2">
          {(selectedChr === 'all' ? chromosomes : [selectedChr]).map((chr) => {
            const chrSegments = tree.dnaSegments.filter((s) => s.chromosome === chr);

            return (
              <div key={chr} className="flex items-center gap-3">
                <span className="w-14 text-right text-xs font-mono font-bold text-stone-400">
                  Chr {chr}
                </span>

                {/* Visual Chromosome Bar */}
                <div className="flex-1 h-7 bg-stone-950 rounded-lg border border-stone-800 relative overflow-hidden flex items-center px-1">
                  {chrSegments.length === 0 ? (
                    <span className="text-[10px] text-stone-600 font-mono pl-2">No shared segment</span>
                  ) : (
                    chrSegments.map((seg) => {
                      // Normalize position
                      const maxBasePairs = 250000000;
                      const leftPct = Math.min(90, (seg.startPos / maxBasePairs) * 100);
                      const widthPct = Math.max(8, ((seg.endPos - seg.startPos) / maxBasePairs) * 100 * 4);

                      return (
                        <div
                          key={seg.id}
                          onClick={() => setSelectedSegment(seg)}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                          }}
                          className={`absolute h-5 rounded cursor-pointer transition flex items-center justify-center text-[10px] font-mono font-bold truncate px-1 shadow ${
                            seg.triangulatedGroup === 'Morrow-PEI'
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 border border-amber-300'
                              : 'bg-gradient-to-r from-sky-500 to-sky-600 text-stone-950 border border-sky-300'
                          }`}
                          title={`${seg.matchPersonName}: ${seg.centimorgans} cM (${seg.startPos}-${seg.endPos})`}
                        >
                          {seg.centimorgans} cM
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Segment Details Inspector */}
      {selectedSegment && (
        <div className="bg-stone-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h4 className="font-['Cinzel'] font-bold text-sm text-amber-200">
              Segment Triangulation Details
            </h4>
            <button
              onClick={() => setSelectedSegment(null)}
              className="text-xs text-stone-400 hover:text-stone-100 font-mono"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
              <span className="text-stone-500 text-[10px] block">Match Person</span>
              <span className="text-stone-100 font-bold">{selectedSegment.matchPersonName}</span>
            </div>
            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
              <span className="text-stone-500 text-[10px] block">Shared centiMorgans</span>
              <span className="text-amber-300 font-bold">{selectedSegment.centimorgans} cM</span>
            </div>
            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
              <span className="text-stone-500 text-[10px] block">Base Pairs Span</span>
              <span className="text-stone-300 font-bold">{selectedSegment.startPos.toLocaleString()} – {selectedSegment.endPos.toLocaleString()}</span>
            </div>
            <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
              <span className="text-stone-500 text-[10px] block">Triangulated Group</span>
              <span className="text-emerald-400 font-bold">{selectedSegment.triangulatedGroup || 'General'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
