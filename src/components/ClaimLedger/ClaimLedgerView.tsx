import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Plus, 
  ExternalLink,
  Lock,
  GitPullRequest,
  Check,
  BrainCircuit
} from 'lucide-react';
import { TreeData, Claim, ClaimStatus, ClaimType, EvidenceItem } from '../../types/genealogy';

interface ClaimLedgerViewProps {
  tree: TreeData;
  onUpdateClaimStatus: (claimId: string, newStatus: ClaimStatus, rationale?: string) => void;
  onResolveConflict: (conflictId: string, preferredClaimId: string, resolutionNote: string) => void;
  onSelectEvidence: (evidence: EvidenceItem) => void;
  onSelectPerson: (personId: string) => void;
}

export const ClaimLedgerView: React.FC<ClaimLedgerViewProps> = ({
  tree,
  onUpdateClaimStatus,
  onResolveConflict,
  onSelectEvidence,
  onSelectPerson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Conflict resolution state
  const [resolvingConflict, setResolvingConflict] = useState<{
    claimA: Claim;
    claimB?: Claim;
    note: string;
  } | null>(null);

  const filteredClaims = tree.claims.filter((c) => {
    const person = tree.persons.find((p) => p.id === c.subjectId);
    const personName = person ? `${person.firstName} ${person.lastName}` : '';
    const matchSearch =
      `${c.claimType} ${c.status} ${c.rationale || ''} ${personName} ${JSON.stringify(c.value)}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (typeFilter !== 'all' && c.claimType !== typeFilter) return false;

    return true;
  });

  const establishedCount = tree.claims.filter((c) => c.status === 'ESTABLISHED').length;
  const conflictedCount = tree.claims.filter((c) => c.status === 'CONFLICTED').length;
  const hypothesisCount = tree.claims.filter((c) => c.status === 'HYPOTHESIS' || c.status === 'POSSIBLE').length;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-5">
      {/* Top Banner Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
          <span className="text-[11px] font-mono uppercase text-stone-400">Total Asserted Claims</span>
          <p className="text-2xl font-bold font-['Cinzel'] text-amber-300 mt-1">{tree.claims.length}</p>
          <span className="text-[10px] text-stone-500 font-mono">W3C PROV-O Version Controlled</span>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
          <span className="text-[11px] font-mono uppercase text-emerald-400">GPS Established (Proof Standard)</span>
          <p className="text-2xl font-bold font-['Cinzel'] text-emerald-300 mt-1">{establishedCount}</p>
          <span className="text-[10px] text-stone-500 font-mono">
            {Math.round((establishedCount / (tree.claims.length || 1)) * 100)}% of total claims
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
          <span className="text-[11px] font-mono uppercase text-rose-400">Conflicted / Contradicted</span>
          <p className="text-2xl font-bold font-['Cinzel'] text-rose-300 mt-1">{conflictedCount}</p>
          <span className="text-[10px] text-stone-500 font-mono">Requires Adjudication</span>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
          <span className="text-[11px] font-mono uppercase text-amber-400">Active Hypotheses</span>
          <p className="text-2xl font-bold font-['Cinzel'] text-amber-300 mt-1">{hypothesisCount}</p>
          <span className="text-[10px] text-stone-500 font-mono">Testing in Progress</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-stone-900 p-3.5 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Search claims, subject person, reasoning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="ESTABLISHED">ESTABLISHED (GPS)</option>
              <option value="PROBABLE">PROBABLE</option>
              <option value="HYPOTHESIS">HYPOTHESIS</option>
              <option value="CONFLICTED">CONFLICTED</option>
              <option value="REFUTED">REFUTED</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none"
            >
              <option value="all">All Claim Types</option>
              <option value="BIRTH">BIRTH</option>
              <option value="DEATH">DEATH</option>
              <option value="PARENT">PARENT</option>
              <option value="SPOUSE">SPOUSE</option>
              <option value="RESIDENCE">RESIDENCE</option>
              <option value="OCCUPATION">OCCUPATION</option>
              <option value="DNA_LINK">DNA_LINK</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims Ledger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Claims Table / List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredClaims.length === 0 ? (
            <div className="bg-stone-900 p-8 rounded-xl border border-stone-800 text-center text-stone-400">
              No claims match the active filters.
            </div>
          ) : (
            filteredClaims.map((claim) => {
              const person = tree.persons.find((p) => p.id === claim.subjectId);
              const isSelected = selectedClaim?.id === claim.id;

              return (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`p-4 rounded-xl border transition cursor-pointer shadow ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/50'
                      : 'bg-stone-900 hover:bg-stone-850 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-stone-950 font-mono text-[11px] font-bold text-amber-400 uppercase border border-stone-800">
                        {claim.claimType}
                      </span>
                      {person && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPerson(person.id);
                          }}
                          className="text-xs font-bold text-stone-100 hover:text-amber-300 font-['Cinzel'] transition"
                        >
                          {person.firstName} {person.lastName}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          claim.status === 'ESTABLISHED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : claim.status === 'CONFLICTED'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {claim.status} ({Math.round(claim.confidence * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* Claim Value Payload */}
                  <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-xs font-mono text-stone-300 mb-2">
                    {JSON.stringify(claim.value)}
                  </div>

                  {claim.rationale && (
                    <p className="text-xs text-stone-400 italic mb-2 line-clamp-2">
                      "{claim.rationale}"
                    </p>
                  )}

                  {/* Provenance & Citation Tag */}
                  <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-stone-500 pt-2 border-t border-stone-800/80">
                    <span>Provenance: {claim.provAgent || 'UniversalIngestionFoundry'}</span>
                    <span className="text-amber-400/90 font-medium">
                      {claim.evidenceIds.length} Linked Citations
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Claim Details & Adjudication Inspector */}
        <div className="space-y-4">
          {selectedClaim ? (
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-xl space-y-4 sticky top-28">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h4 className="font-['Cinzel'] font-bold text-sm text-amber-200">
                    Claim & Proof Adjudicator
                  </h4>
                  <p className="text-[11px] font-mono text-stone-400">{selectedClaim.id}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-stone-950 text-amber-400 font-mono text-xs font-bold border border-stone-800">
                  {selectedClaim.claimType}
                </span>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1.5 uppercase">
                  Adjudicated Status (GPS Rule)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateClaimStatus(selectedClaim.id, 'ESTABLISHED', 'GPS standard satisfied by primary sources')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      selectedClaim.status === 'ESTABLISHED'
                        ? 'bg-emerald-600 text-stone-950 font-bold border-emerald-400 shadow'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    Accept (ESTABLISHED)
                  </button>
                  <button
                    onClick={() => onUpdateClaimStatus(selectedClaim.id, 'HYPOTHESIS', 'Marked as working hypothesis under test')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      selectedClaim.status === 'HYPOTHESIS'
                        ? 'bg-amber-600 text-stone-950 font-bold border-amber-400 shadow'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    Hypothesis
                  </button>
                  <button
                    onClick={() => onUpdateClaimStatus(selectedClaim.id, 'CONFLICTED', 'Direct conflict with contemporaneous record')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      selectedClaim.status === 'CONFLICTED'
                        ? 'bg-rose-600 text-stone-950 font-bold border-rose-400 shadow'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    Flag Conflicted
                  </button>
                  <button
                    onClick={() => onUpdateClaimStatus(selectedClaim.id, 'REFUTED', 'Disproven by conclusive evidence')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      selectedClaim.status === 'REFUTED'
                        ? 'bg-stone-700 text-stone-200 border-stone-600 shadow'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    Refute
                  </button>
                </div>
              </div>

              {/* Linked Evidence Vault Cards */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-stone-400 uppercase">
                  Supporting Evidence ({selectedClaim.evidenceIds.length})
                </label>
                {selectedClaim.evidenceIds.length === 0 ? (
                  <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-amber-400/80 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>0 citations linked. Vulnerable to genealogical falsification.</span>
                  </div>
                ) : (
                  selectedClaim.evidenceIds.map((evId) => {
                    const ev = tree.evidence.find((e) => e.id === evId);
                    if (!ev) return null;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => onSelectEvidence(ev)}
                        className="p-3 bg-stone-950 hover:bg-stone-850 rounded-xl border border-stone-800 cursor-pointer transition space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <h6 className="text-xs font-bold text-stone-200 truncate">{ev.description}</h6>
                          <ExternalLink className="w-3 h-3 text-stone-500" />
                        </div>
                        <p className="text-[11px] text-stone-400 font-serif line-clamp-2">
                          "{ev.transcription || ev.citationText}"
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* PROV-O Metadata Box */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-[10px] font-mono text-stone-400 space-y-1">
                <p className="text-amber-400 font-bold uppercase">W3C PROV-O Provenance Record</p>
                <p>Activity: {selectedClaim.provActivity || 'N/A'}</p>
                <p>Agent: {selectedClaim.provAgent || 'UniversalIngestionFoundry'}</p>
                <p>Entity: {selectedClaim.provEntity || 'N/A'}</p>
                <p>Created: {selectedClaim.createdAt}</p>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl text-center text-stone-500 text-xs font-mono">
              Select a claim on the left to inspect citations, provenance, and perform GPS adjudication.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
