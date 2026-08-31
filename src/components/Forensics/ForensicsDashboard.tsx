import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Wrench, 
  ArrowRight, 
  Layers, 
  Check, 
  Clock, 
  GitBranch, 
  Sparkles, 
  History,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TreeData, TreeDefect, RepairPatch } from '../../types/genealogy';
import { runTreeForensicsAudit, generatePatchForDefect, applyRepairPatch, rollbackRepairPatch } from '../../utils/forensics';

interface ForensicsDashboardProps {
  tree: TreeData;
  onUpdateTree: (updatedTree: TreeData) => void;
  onSelectPerson: (personId: string) => void;
}

export const ForensicsDashboard: React.FC<ForensicsDashboardProps> = ({
  tree,
  onUpdateTree,
  onSelectPerson,
}) => {
  const [activeTab, setActiveTab] = useState<'defects' | 'patches'>('defects');
  const [selectedDefect, setSelectedDefect] = useState<TreeDefect | null>(null);
  const [generatedPatch, setGeneratedPatch] = useState<RepairPatch | null>(null);

  const defects = runTreeForensicsAudit(tree);

  const criticalDefects = defects.filter((d) => d.severity === 'CRITICAL');
  const highDefects = defects.filter((d) => d.severity === 'HIGH');
  const otherDefects = defects.filter((d) => d.severity === 'MEDIUM' || d.severity === 'LOW');

  const handleGeneratePatch = (defect: TreeDefect) => {
    setSelectedDefect(defect);
    const patch = generatePatchForDefect(tree, defect);
    setGeneratedPatch(patch);
  };

  const handleApplyPatch = (patch: RepairPatch) => {
    const updated = applyRepairPatch(tree, patch);
    onUpdateTree(updated);
    setGeneratedPatch(null);
    setSelectedDefect(null);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#10b981', '#6366f1'],
    });
  };

  const handleRollback = (patchId: string) => {
    const updated = rollbackRepairPatch(tree, patchId);
    onUpdateTree(updated);
  };

  // Tree Health Calculation
  const totalClaims = tree.claims.length || 1;
  const establishedClaims = tree.claims.filter((c) => c.status === 'ESTABLISHED').length;
  const healthScore = Math.max(
    10,
    Math.round(
      ((establishedClaims / totalClaims) * 60) +
      Math.max(0, 40 - (criticalDefects.length * 15 + highDefects.length * 8))
    )
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Top Banner & Health Score */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h2 className="font-['Cinzel'] font-bold text-xl text-amber-100">
              Tree Forensics & Reversible Repair Factory
            </h2>
          </div>
          <p className="text-xs text-stone-400 font-mono max-w-2xl">
            Detects chronological impossibilities, duplicate namesakes, uncorroborated assertions, and circular links. Generates non-destructive, reversible change patches with downstream impact receipts.
          </p>
        </div>

        {/* Big Health Score Gauge */}
        <div className="flex items-center gap-4 bg-stone-950 px-6 py-4 rounded-xl border border-stone-800">
          <div className="text-center">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">Tree Health Score</span>
            <span
              className={`text-4xl font-bold font-['Cinzel'] ${
                healthScore > 80 ? 'text-emerald-400' : healthScore > 50 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {healthScore}
              <span className="text-lg text-stone-500 font-normal">/100</span>
            </span>
          </div>

          <div className="h-10 w-px bg-stone-800" />

          <div className="text-xs space-y-1 font-mono">
            <p className="text-rose-400">{criticalDefects.length} Critical Violations</p>
            <p className="text-amber-400">{highDefects.length} High Anomalies</p>
            <p className="text-emerald-400">{tree.patches.filter((p) => p.status === 'APPLIED').length} Reversible Patches Active</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 space-x-4">
        <button
          onClick={() => setActiveTab('defects')}
          className={`py-3 px-4 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'defects'
              ? 'border-amber-500 text-amber-300 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Detected Forensic Defects ({defects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('patches')}
          className={`py-3 px-4 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'patches'
              ? 'border-amber-500 text-amber-300 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <History className="w-4 h-4 text-amber-400" />
          <span>Reversible Patches Ledger ({tree.patches.length})</span>
        </button>
      </div>

      {/* Tab 1: Defects & Live Fixer */}
      {activeTab === 'defects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Defects List */}
          <div className="lg:col-span-2 space-y-3">
            {defects.length === 0 ? (
              <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-['Cinzel'] font-bold text-base text-stone-100">
                  Zero Forensic Violations Found
                </h4>
                <p className="text-xs text-stone-400 font-mono">
                  All active tree nodes pass chronological, structural, and evidentiary consistency tests.
                </p>
              </div>
            ) : (
              defects.map((defect) => {
                const isSelected = selectedDefect?.id === defect.id;
                return (
                  <div
                    key={defect.id}
                    className={`p-4 rounded-xl border transition shadow-lg space-y-3 ${
                      defect.severity === 'CRITICAL'
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                        : defect.severity === 'HIGH'
                        ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                        : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            defect.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : defect.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          {defect.severity}
                        </span>
                        <span className="text-[11px] font-mono text-stone-400 uppercase">
                          {defect.type}
                        </span>
                      </div>

                      <button
                        onClick={() => handleGeneratePatch(defect)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow transition"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Generate Patch
                      </button>
                    </div>

                    <h4 className="font-['Cinzel'] font-bold text-sm text-stone-100">
                      {defect.title}
                    </h4>

                    <p className="text-xs text-stone-300 font-mono bg-stone-950/80 p-2.5 rounded-lg border border-stone-800/80">
                      {defect.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400 pt-2 border-t border-stone-800/80">
                      <span className="italic text-[11px]">Fix: {defect.suggestedFix}</span>
                      {defect.personIds.length > 0 && (
                        <div className="flex items-center gap-1">
                          {defect.personIds.map((pId) => {
                            const p = tree.persons.find((x) => x.id === pId);
                            if (!p) return null;
                            return (
                              <button
                                key={p.id}
                                onClick={() => onSelectPerson(p.id)}
                                className="text-[10px] font-mono text-amber-400 hover:underline bg-stone-950 px-2 py-0.5 rounded border border-stone-800"
                              >
                                {p.firstName} {p.lastName}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Generated Patch Preview Drawer / Box */}
          <div className="space-y-4">
            {generatedPatch ? (
              <div className="bg-stone-900 border border-amber-500/50 p-5 rounded-2xl shadow-2xl space-y-4 sticky top-28 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <h4 className="font-['Cinzel'] font-bold text-sm text-amber-200">
                      Reversible Repair Patch
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    PROPOSED
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <h5 className="font-bold text-stone-100">{generatedPatch.title}</h5>
                  <p className="text-stone-300 font-mono">{generatedPatch.rationale}</p>
                </div>

                {/* State Diff Box */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase text-stone-400 block">
                    Before vs. After State Diff
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-stone-950 p-2.5 rounded-lg border border-rose-500/30">
                      <span className="text-rose-400 font-bold block mb-1">Before (Defective)</span>
                      <pre className="text-stone-400 whitespace-pre-wrap">
                        {JSON.stringify(generatedPatch.beforeState, null, 2)}
                      </pre>
                    </div>
                    <div className="bg-stone-950 p-2.5 rounded-lg border border-emerald-500/30">
                      <span className="text-emerald-400 font-bold block mb-1">After (Repaired)</span>
                      <pre className="text-stone-300 whitespace-pre-wrap">
                        {JSON.stringify(generatedPatch.afterState, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Blast Radius / Impact */}
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-stone-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-amber-400" /> Downstream Impact Analysis
                  </span>
                  {generatedPatch.impacts.map((imp, idx) => (
                    <p key={idx} className="text-xs text-stone-300 font-mono">
                      • {imp.description}
                    </p>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                  <button
                    onClick={() => setGeneratedPatch(null)}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-300"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => handleApplyPatch(generatedPatch)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs shadow-lg transition"
                  >
                    <Check className="w-4 h-4" />
                    Apply Reversible Patch
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl text-center text-stone-500 text-xs font-mono">
                Select "Generate Patch" on any detected defect to review the state diff and execute a reversible repair.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Reversible Patches Ledger */}
      {activeTab === 'patches' && (
        <div className="space-y-4">
          {tree.patches.length === 0 ? (
            <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl text-center text-stone-400 font-mono text-xs">
              No repair patches recorded yet in this tree ledger.
            </div>
          ) : (
            tree.patches.map((patch) => (
              <div
                key={patch.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        patch.status === 'APPLIED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      {patch.status}
                    </span>
                    <h4 className="font-['Cinzel'] font-bold text-sm text-stone-100">{patch.title}</h4>
                  </div>

                  {patch.status === 'APPLIED' && (
                    <button
                      onClick={() => handleRollback(patch.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-mono border border-stone-700 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Rollback (Undo Patch)
                    </button>
                  )}
                </div>

                <p className="text-xs text-stone-300 font-mono">{patch.rationale}</p>

                <div className="text-[10px] font-mono text-stone-500 flex items-center justify-between pt-2 border-t border-stone-800">
                  <span>Applied: {patch.appliedAt || patch.timestamp}</span>
                  <span>Impacts: {patch.impacts.length} nodes updated</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
