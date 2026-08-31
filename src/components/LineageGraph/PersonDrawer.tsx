import React, { useState } from 'react';
import { 
  X, 
  User, 
  Calendar, 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  Layers, 
  FileText, 
  Dna, 
  Compass, 
  Bot, 
  Sparkles, 
  ArrowRight,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle,
  Hash,
  BrainCircuit
} from 'lucide-react';
import { TreeData, Person, Claim, EvidenceItem, DnaSegment } from '../../types/genealogy';

interface PersonDrawerProps {
  person: Person | null;
  tree: TreeData;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  onTriggerSimulation: (person: Person) => void;
  onTriggerFalsification: (person: Person, claim?: Claim) => void;
  onTriggerAiResearch: (prompt: string, context: any) => void;
  onTriggerImageGen: (person: Person) => void;
}

export const PersonDrawer: React.FC<PersonDrawerProps> = ({
  person,
  tree,
  onClose,
  onSelectPerson,
  onTriggerSimulation,
  onTriggerFalsification,
  onTriggerAiResearch,
  onTriggerImageGen,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'claims' | 'evidence' | 'dna'>('overview');

  if (!person) return null;

  // Find linked claims
  const personClaims = tree.claims.filter(
    (c) => c.subjectId === person.id || (c.value && (c.value.fatherId === person.id || c.value.motherId === person.id || c.value.husbandId === person.id || c.value.wifeId === person.id))
  );

  // Find linked families
  const asChildFamilies = tree.families.filter((f) => f.childrenIds.includes(person.id));
  const asParentFamilies = tree.families.filter((f) => f.husbandId === person.id || f.wifeId === person.id);

  // Parents
  const parents: Person[] = [];
  asChildFamilies.forEach((fam) => {
    if (fam.husbandId) {
      const p = tree.persons.find((x) => x.id === fam.husbandId);
      if (p) parents.push(p);
    }
    if (fam.wifeId) {
      const p = tree.persons.find((x) => x.id === fam.wifeId);
      if (p) parents.push(p);
    }
  });

  // Spouses & Children
  const spouses: Person[] = [];
  const children: Person[] = [];
  asParentFamilies.forEach((fam) => {
    const spouseId = fam.husbandId === person.id ? fam.wifeId : fam.husbandId;
    if (spouseId) {
      const sp = tree.persons.find((x) => x.id === spouseId);
      if (sp && !spouses.some((s) => s.id === sp.id)) spouses.push(sp);
    }
    fam.childrenIds.forEach((cId) => {
      const ch = tree.persons.find((x) => x.id === cId);
      if (ch && !children.some((c) => c.id === ch.id)) children.push(ch);
    });
  });

  // Evidence items referenced by claims
  const evidenceIds = new Set<string>();
  personClaims.forEach((c) => c.evidenceIds.forEach((id) => evidenceIds.add(id)));
  const linkedEvidence = tree.evidence.filter((e) => evidenceIds.has(e.id));

  // DNA Segments
  const linkedDna = tree.dnaSegments.filter((seg) => seg.personId === person.id || seg.matchPersonId === person.id);

  const confidencePct = Math.round((person.confidenceScore || 0.85) * 100);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-stone-900 border-l border-stone-800 shadow-2xl z-50 flex flex-col backdrop-blur-md animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600/30 to-stone-800 border border-amber-500/40 flex items-center justify-center font-['Cinzel'] font-bold text-amber-300 text-lg shadow-inner">
            {person.firstName.charAt(0)}
          </div>
          <div>
            <h3 className="font-['Cinzel'] font-bold text-lg text-amber-100">
              {person.firstName} {person.lastName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
              <span>{person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Unknown'}</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{confidencePct}% GPS Standard</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* AI Intelligence Actions Toolbar */}
      <div className="p-3 bg-stone-900/90 border-b border-stone-800 flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            onTriggerAiResearch(
              `Conduct an exhaustive proof review on ${person.firstName} ${person.lastName} born ${person.birthDate || 'unknown'} in ${person.birthPlace || 'unknown'}. Evaluate parentage claims and identify missing records.`,
              person
            )
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition shadow-sm"
        >
          <BrainCircuit className="w-3.5 h-3.5 text-amber-400" />
          High-Thinking Proof Review
        </button>

        <button
          onClick={() => onTriggerSimulation(person)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-950 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition shadow-sm"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          Simulate Life
        </button>

        <button
          onClick={() => onTriggerFalsification(person)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-950 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-medium transition shadow-sm"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          Falsify Claims
        </button>

        <button
          onClick={() => onTriggerImageGen(person)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-950 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 text-xs font-medium transition shadow-sm"
        >
          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
          Generate 4K Scene
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-stone-800 bg-stone-950/60 px-4 text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`py-2.5 px-3 border-b-2 transition ${
            activeSubTab === 'overview' ? 'border-amber-500 text-amber-300 font-semibold' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Overview & Family
        </button>
        <button
          onClick={() => setActiveSubTab('claims')}
          className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'claims' ? 'border-amber-500 text-amber-300 font-semibold' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <span>PROV-O Claims</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300">
            {personClaims.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('evidence')}
          className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'evidence' ? 'border-amber-500 text-amber-300 font-semibold' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <span>Evidence Vault</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300">
            {linkedEvidence.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('dna')}
          className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
            activeSubTab === 'dna' ? 'border-amber-500 text-amber-300 font-semibold' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <span>DNA Segments</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300">
            {linkedDna.length}
          </span>
        </button>
      </div>

      {/* Drawer Body Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeSubTab === 'overview' && (
          <div className="space-y-4">
            {/* Vital Events Box */}
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2.5">
              <h4 className="font-['Cinzel'] font-bold text-xs uppercase text-amber-400 tracking-wider">
                Vital Chronology
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-stone-500 flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="w-3 h-3" /> Birth
                  </span>
                  <p className="text-stone-200 font-medium">{person.birthDate || 'Unknown date'}</p>
                  <p className="text-stone-400 text-[11px] truncate">📍 {person.birthPlace || 'Location unrecorded'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-stone-500 flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="w-3 h-3" /> Death
                  </span>
                  <p className="text-stone-200 font-medium">{person.deathDate || 'Unknown date'}</p>
                  <p className="text-stone-400 text-[11px] truncate">📍 {person.deathPlace || 'Location unrecorded'}</p>
                </div>
              </div>

              {person.occupation && (
                <div className="pt-2 border-t border-stone-800/80 flex items-center gap-2 text-xs">
                  <Briefcase className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-stone-400">Occupation:</span>
                  <span className="text-stone-200 font-medium">{person.occupation}</span>
                </div>
              )}

              {person.notes && (
                <div className="pt-2 border-t border-stone-800/80 text-xs text-stone-400 bg-stone-900/60 p-2.5 rounded-lg font-mono">
                  {person.notes}
                </div>
              )}
            </div>

            {/* Family Kinship Network */}
            <div className="space-y-3">
              <h4 className="font-['Cinzel'] font-bold text-xs uppercase text-amber-400 tracking-wider">
                Kinship Connections
              </h4>

              {/* Parents */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[11px] font-mono uppercase text-stone-500 block mb-2">
                  Parents ({parents.length})
                </span>
                {parents.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">No parent connections currently recorded (Terminal Line).</p>
                ) : (
                  <div className="space-y-1.5">
                    {parents.map((parent) => (
                      <div
                        key={parent.id}
                        onClick={() => onSelectPerson(parent.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-stone-900 hover:bg-stone-850 border border-stone-800 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs text-stone-200 group-hover:text-amber-300 font-medium">
                            {parent.firstName} {parent.lastName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">
                          {parent.birthDate ? parent.birthDate.substring(0, 4) : '????'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spouses */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[11px] font-mono uppercase text-stone-500 block mb-2">
                  Spouses & Unions ({spouses.length})
                </span>
                {spouses.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">No spouse recorded.</p>
                ) : (
                  <div className="space-y-1.5">
                    {spouses.map((spouse) => (
                      <div
                        key={spouse.id}
                        onClick={() => onSelectPerson(spouse.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-stone-900 hover:bg-stone-850 border border-stone-800 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-xs text-stone-200 group-hover:text-rose-300 font-medium">
                            {spouse.firstName} {spouse.lastName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">
                          {spouse.birthDate ? spouse.birthDate.substring(0, 4) : '????'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Children */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-[11px] font-mono uppercase text-stone-500 block mb-2">
                  Children ({children.length})
                </span>
                {children.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">No children recorded.</p>
                ) : (
                  <div className="space-y-1.5">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        onClick={() => onSelectPerson(child.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-stone-900 hover:bg-stone-850 border border-stone-800 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-xs text-stone-200 group-hover:text-sky-300 font-medium">
                            {child.firstName} {child.lastName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">
                          {child.birthDate ? child.birthDate.substring(0, 4) : '????'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Claims Tab */}
        {activeSubTab === 'claims' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400 font-mono">
                W3C PROV-O Asserted Claims ({personClaims.length})
              </span>
            </div>

            {personClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    {claim.claimType} CLAIM
                  </span>
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

                <div className="text-xs text-stone-300 font-mono bg-stone-900/80 p-2 rounded">
                  {JSON.stringify(claim.value)}
                </div>

                {claim.rationale && (
                  <p className="text-xs text-stone-400 italic">
                    "{claim.rationale}"
                  </p>
                )}

                {/* Provenance Footer */}
                <div className="pt-2 border-t border-stone-800 text-[10px] font-mono text-stone-500 flex flex-wrap items-center justify-between gap-2">
                  <span>Agent: {claim.provAgent || 'UniversalIngestionFoundry'}</span>
                  <span>{claim.evidenceIds.length} Linked Sources</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Evidence Tab */}
        {activeSubTab === 'evidence' && (
          <div className="space-y-3">
            <span className="text-xs text-stone-400 font-mono">
              Archival Evidence & Source Citations ({linkedEvidence.length})
            </span>

            {linkedEvidence.length === 0 ? (
              <div className="bg-stone-950 p-6 rounded-xl border border-stone-800 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto opacity-75" />
                <p className="text-xs text-stone-300 font-medium">No Primary Sources Attached</p>
                <p className="text-[11px] text-stone-500">
                  This person’s claims currently rely on unverified secondary assumptions. Use the AI Research Copilot to search surviving parish registers.
                </p>
              </div>
            ) : (
              linkedEvidence.map((ev) => (
                <div key={ev.id} className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-stone-200 truncate">{ev.description}</h5>
                    <span className="text-[10px] font-mono text-stone-500">{ev.sourceDate}</span>
                  </div>

                  <p className="text-xs text-amber-200/90 font-serif bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                    "{ev.transcription || ev.citationText}"
                  </p>

                  <div className="space-y-1 text-[11px] text-stone-400 font-mono">
                    <p>Repository: <span className="text-stone-300">{ev.repositoryName}</span></p>
                    <p className="truncate">Hash: <span className="text-stone-500">{ev.hash}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* DNA Tab */}
        {activeSubTab === 'dna' && (
          <div className="space-y-3">
            <span className="text-xs text-stone-400 font-mono">
              Genetic Segment Matches & Triangulation ({linkedDna.length})
            </span>

            {linkedDna.length === 0 ? (
              <div className="bg-stone-950 p-6 rounded-xl border border-stone-800 text-center space-y-2">
                <Dna className="w-8 h-8 text-stone-600 mx-auto" />
                <p className="text-xs text-stone-300">No DNA Segments Loaded</p>
                <p className="text-[11px] text-stone-500">
                  Upload DNA segment data in the DNA Enclave to enable Mendelian feasibility and chromosome triangulation.
                </p>
              </div>
            ) : (
              linkedDna.map((seg) => (
                <div key={seg.id} className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">
                      Match: {seg.matchPersonName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {seg.centimorgans} cM
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-400 font-mono grid grid-cols-2 gap-2">
                    <p>Chromosome: <span className="text-stone-200">{seg.chromosome}</span></p>
                    <p>SNPs: <span className="text-stone-200">{seg.snps || 'N/A'}</span></p>
                    <p className="col-span-2">Cluster: <span className="text-emerald-400">{seg.triangulatedGroup || 'General'}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
