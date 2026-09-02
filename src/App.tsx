import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { LineageGraphCanvas } from './components/LineageGraph/LineageGraphCanvas';
import { PersonDrawer } from './components/LineageGraph/PersonDrawer';
import { AddPersonModal } from './components/LineageGraph/AddPersonModal';
import { GedcomUploadModal } from './components/Ingestion/GedcomUploadModal';
import { ExportModal } from './components/Ingestion/ExportModal';
import { ClaimLedgerView } from './components/ClaimLedger/ClaimLedgerView';
import { EvidenceVaultModal } from './components/ClaimLedger/EvidenceVaultModal';
import { ForensicsDashboard } from './components/Forensics/ForensicsDashboard';
import { ProofPathLab } from './components/ProofPath/ProofPathLab';
import { CoverageFabricView } from './components/Coverage/CoverageFabricView';
import { DnaEnclaveView } from './components/DnaEnclave/DnaEnclaveView';
import { AncestorSimulationView } from './components/Simulation/AncestorSimulationView';
import { GeminiResearchChat } from './components/AiCopilot/GeminiResearchChat';
import { TreeData, Person, Claim, ClaimStatus, EvidenceItem, Family } from './types/genealogy';
import { SEED_TREE_MORROW_COFFIN } from './data/seedData';
import { ALBERTSON_FAMILY_TREE } from './data/albertsonTree';
import { runTreeForensicsAudit } from './utils/forensics';

export default function App() {
  const [tree, setTree] = useState<TreeData>(ALBERTSON_FAMILY_TREE);
  const [activeTab, setActiveTab] = useState<ActiveTab>('lineage-graph');

  // Selected entities
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>('p_garrett_albertson_1735');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  // Cross-component triggers
  const [proofPathInitialId, setProofPathInitialId] = useState<string | null>(null);
  const [simulationSubject, setSimulationSubject] = useState<Person | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string | undefined>(undefined);
  const [aiContext, setAiContext] = useState<any>(null);

  const defects = runTreeForensicsAudit(tree);
  const selectedPerson = tree.persons.find((p) => p.id === selectedPersonId) || null;

  // Handler for adding a new person
  const handleSavePerson = (
    personData: Partial<Person>,
    parentIds?: string[],
    spouseId?: string
  ) => {
    const newPersonId = `p_usr_${Date.now()}`;
    const newPerson: Person = {
      id: newPersonId,
      firstName: personData.firstName || 'Unknown',
      lastName: personData.lastName || 'Unknown',
      gender: personData.gender || 'U',
      birthDate: personData.birthDate,
      birthPlace: personData.birthPlace,
      deathDate: personData.deathDate,
      deathPlace: personData.deathPlace,
      occupation: personData.occupation,
      notes: personData.notes,
      confidenceScore: personData.confidenceScore || 0.85,
      tags: personData.tags || ['USER_CREATED'],
    };

    const newClaims: Claim[] = [];

    // Vital event claims
    if (newPerson.birthDate) {
      newClaims.push({
        id: `cl_b_${newPersonId}`,
        subjectId: newPersonId,
        subjectType: 'Person',
        claimType: 'BIRTH',
        value: { date: newPerson.birthDate, place: newPerson.birthPlace },
        status: 'ESTABLISHED',
        confidence: 0.85,
        evidenceIds: [],
        provActivity: 'User manual assertion',
        provAgent: 'UserInterface',
        createdAt: new Date().toISOString(),
      });
    }

    const updatedFamilies = [...tree.families];

    // Link parents if provided
    if (parentIds && parentIds.length > 0) {
      const fatherId = parentIds.find((id) => tree.persons.find((p) => p.id === id)?.gender === 'M');
      const motherId = parentIds.find((id) => tree.persons.find((p) => p.id === id)?.gender === 'F');

      let existingFamily = updatedFamilies.find(
        (f) => f.husbandId === fatherId && f.wifeId === motherId
      );

      if (existingFamily) {
        existingFamily.childrenIds.push(newPersonId);
      } else {
        const newFam: Family = {
          id: `fam_${Date.now()}`,
          husbandId: fatherId,
          wifeId: motherId,
          childrenIds: [newPersonId],
          type: 'MARRIAGE',
          status: 'ESTABLISHED',
        };
        updatedFamilies.push(newFam);
      }
    }

    // Link spouse if provided
    if (spouseId) {
      const spouse = tree.persons.find((p) => p.id === spouseId);
      const isHusband = newPerson.gender === 'M';
      const newFam: Family = {
        id: `fam_sp_${Date.now()}`,
        husbandId: isHusband ? newPersonId : spouseId,
        wifeId: isHusband ? spouseId : newPersonId,
        childrenIds: [],
        type: 'MARRIAGE',
        status: 'ESTABLISHED',
      };
      updatedFamilies.push(newFam);
    }

    setTree({
      ...tree,
      persons: [...tree.persons, newPerson],
      families: updatedFamilies,
      claims: [...tree.claims, ...newClaims],
    });

    setSelectedPersonId(newPersonId);
  };

  // Handler for updating claim status
  const handleUpdateClaimStatus = (
    claimId: string,
    newStatus: ClaimStatus,
    rationale?: string
  ) => {
    setTree({
      ...tree,
      claims: tree.claims.map((c) =>
        c.id === claimId
          ? {
              ...c,
              status: newStatus,
              rationale: rationale || c.rationale,
              confidence: newStatus === 'ESTABLISHED' ? 0.95 : newStatus === 'REFUTED' ? 0.05 : 0.6,
            }
          : c
      ),
    });
  };

  // Cross-Navigation Actions
  const handleStartProofPathWith = (personId: string) => {
    setProofPathInitialId(personId);
    setActiveTab('proof-path');
  };

  const handleSimulatePerson = (person: Person) => {
    setSimulationSubject(person);
    setActiveTab('ancestor-simulation');
  };

  const handleFalsifyPerson = (person: Person) => {
    setAiPrompt(
      `Conduct an aggressive adversarial falsification audit on ${person.firstName} ${person.lastName} (b. ${person.birthDate || 'unknown'}). Identify all possible namesake conflations, chronological stress points, and unverified assumptions.`
    );
    setAiContext(person);
    setActiveTab('ai-copilot');
  };

  const handleAiResearch = (prompt: string, context: any) => {
    setAiPrompt(prompt);
    setAiContext(context);
    setActiveTab('ai-copilot');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-['Plus_Jakarta_Sans'] flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tree={tree}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onLoadAlbertsonTree={() => {
          setTree(ALBERTSON_FAMILY_TREE);
          setSelectedPersonId('p_garrett_albertson_1735');
        }}
        onLoadSample={() => {
          setTree(SEED_TREE_MORROW_COFFIN);
          setSelectedPersonId('p-morrow-john-1');
        }}
        defectsCount={defects.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'lineage-graph' && (
          <LineageGraphCanvas
            tree={tree}
            selectedPersonId={selectedPersonId}
            onSelectPerson={(id) => setSelectedPersonId(id)}
            onAddPerson={() => setIsAddPersonOpen(true)}
            onStartProofPathWith={handleStartProofPathWith}
            onSimulatePerson={handleSimulatePerson}
            onFalsifyPerson={handleFalsifyPerson}
          />
        )}

        {activeTab === 'claim-ledger' && (
          <ClaimLedgerView
            tree={tree}
            onUpdateClaimStatus={handleUpdateClaimStatus}
            onResolveConflict={(conflictId, preferredId, note) => {
              handleUpdateClaimStatus(preferredId, 'ESTABLISHED', note);
            }}
            onSelectEvidence={(ev) => setSelectedEvidence(ev)}
            onSelectPerson={(id) => {
              setSelectedPersonId(id);
              setActiveTab('lineage-graph');
            }}
          />
        )}

        {activeTab === 'forensics-repair' && (
          <ForensicsDashboard
            tree={tree}
            onUpdateTree={setTree}
            onSelectPerson={(id) => {
              setSelectedPersonId(id);
              setActiveTab('lineage-graph');
            }}
          />
        )}

        {activeTab === 'proof-path' && (
          <ProofPathLab
            tree={tree}
            initialSourceId={proofPathInitialId || selectedPersonId}
            onSelectPerson={(id) => {
              setSelectedPersonId(id);
              setActiveTab('lineage-graph');
            }}
            onTriggerFalsification={handleFalsifyPerson}
            onTriggerAiResearch={handleAiResearch}
          />
        )}

        {activeTab === 'coverage-fabric' && <CoverageFabricView />}

        {activeTab === 'dna-enclave' && <DnaEnclaveView tree={tree} />}

        {activeTab === 'ancestor-simulation' && (
          <AncestorSimulationView
            tree={tree}
            preSelectedPerson={simulationSubject || selectedPerson}
          />
        )}

        {activeTab === 'ai-copilot' && (
          <GeminiResearchChat
            tree={tree}
            initialPrompt={aiPrompt}
            initialContext={aiContext}
          />
        )}
      </main>

      {/* Side Inspector Drawer for Selected Person (active when on LineageGraph) */}
      {activeTab === 'lineage-graph' && selectedPersonId && (
        <PersonDrawer
          person={selectedPerson}
          tree={tree}
          onClose={() => setSelectedPersonId(null)}
          onSelectPerson={(id) => setSelectedPersonId(id)}
          onTriggerSimulation={handleSimulatePerson}
          onTriggerFalsification={handleFalsifyPerson}
          onTriggerAiResearch={handleAiResearch}
          onTriggerImageGen={handleSimulatePerson}
        />
      )}

      {/* Modals */}
      {isUploadOpen && (
        <GedcomUploadModal
          onClose={() => setIsUploadOpen(false)}
          onImportTree={(importedTree) => {
            setTree(importedTree);
            setSelectedPersonId(importedTree.persons[0]?.id || null);
          }}
        />
      )}

      {isExportOpen && (
        <ExportModal
          tree={tree}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {isAddPersonOpen && (
        <AddPersonModal
          tree={tree}
          onClose={() => setIsAddPersonOpen(false)}
          onSavePerson={handleSavePerson}
        />
      )}

      {selectedEvidence && (
        <EvidenceVaultModal
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  );
}
