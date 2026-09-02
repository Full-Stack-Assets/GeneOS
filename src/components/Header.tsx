import React from 'react';
import { 
  Network, 
  FileCode, 
  ShieldCheck, 
  Route, 
  Globe, 
  Dna, 
  Compass, 
  Bot, 
  Download, 
  UploadCloud, 
  Sparkles,
  Layers,
  Database
} from 'lucide-react';
import { TreeData } from '../types/genealogy';

export type ActiveTab = 
  | 'lineage-graph' 
  | 'claim-ledger' 
  | 'forensics-repair' 
  | 'proof-path' 
  | 'coverage-fabric' 
  | 'dna-enclave' 
  | 'ancestor-simulation' 
  | 'ai-copilot';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  tree: TreeData;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onLoadSample: () => void;
  onLoadAlbertsonTree?: () => void;
  defectsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  tree,
  onOpenUpload,
  onOpenExport,
  onLoadSample,
  onLoadAlbertsonTree,
  defectsCount,
}) => {
  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number | string }> = [
    { id: 'lineage-graph', label: 'LineageGraph', icon: Network, badge: tree.persons.length },
    { id: 'claim-ledger', label: 'Claim & Proof Ledger', icon: Layers, badge: tree.claims.length },
    { id: 'forensics-repair', label: 'Tree Forensics', icon: ShieldCheck, badge: defectsCount > 0 ? defectsCount : undefined },
    { id: 'proof-path', label: 'ProofPath Lab', icon: Route },
    { id: 'coverage-fabric', label: 'Source Coverage', icon: Globe },
    { id: 'dna-enclave', label: 'DNA Enclave', icon: Dna, badge: tree.dnaSegments.length },
    { id: 'ancestor-simulation', label: 'Ancestor Simulation', icon: Compass },
    { id: 'ai-copilot', label: 'Gemini Research AI', icon: Bot, badge: 'Frontier' },
  ];

  return (
    <header className="bg-stone-900 border-b border-stone-800 text-stone-200 select-none sticky top-0 z-40 shadow-xl">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-inner border border-amber-500/30">
            <Database className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] font-bold text-lg text-amber-200 tracking-wide">
                GENEALOGICAL INTELLIGENCE OS
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                W3C PROV-O & GPS
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono truncate max-w-md">
              Tree: <span className="text-stone-200 font-medium">{tree.name}</span> ({tree.persons.length} persons, {tree.claims.length} claims, {tree.evidence.length} sources)
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {onLoadAlbertsonTree && (
            <button
              onClick={onLoadAlbertsonTree}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-xs font-semibold text-stone-950 shadow-md transition"
              title="Populate Albertson Family Tree (Major Garrett Albertson, 19th Ohio Civil War, & All Lineages)"
            >
              <Sparkles className="w-3.5 h-3.5 text-stone-950 fill-stone-950" />
              Populate Albertson Tree
            </button>
          )}
          <button
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-xs font-medium text-amber-300 border border-stone-700 transition"
            title="Load PEI Morrow-Coffin Validation Case"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            Morrow Case
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-200 border border-stone-700 transition"
            title="Import GEDCOM 5.5 / 7.0 / GEDZIP"
          >
            <UploadCloud className="w-3.5 h-3.5 text-stone-400" />
            Ingest GEDCOM
          </button>
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-300 border border-stone-700 shadow transition"
            title="Export standard GEDCOM 7.0 or Research Bundle"
          >
            <Download className="w-3.5 h-3.5" />
            Export Bundle
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="bg-stone-950/80 border-t border-stone-800/80 backdrop-blur-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition relative ${
                  isActive
                    ? 'border-amber-500 text-amber-300 bg-stone-900/60'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      tab.id === 'forensics-repair' && typeof tab.badge === 'number' && tab.badge > 0
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isActive
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
