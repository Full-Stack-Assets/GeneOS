export type ClaimType =
  | 'BIRTH'
  | 'DEATH'
  | 'PARENT'
  | 'SPOUSE'
  | 'NAME'
  | 'RESIDENCE'
  | 'OCCUPATION'
  | 'PROPERTY'
  | 'MILITARY'
  | 'IMMIGRATION'
  | 'CENSUS'
  | 'PROBATE'
  | 'LAND'
  | 'TAX'
  | 'RELIGION'
  | 'CITIZENSHIP'
  | 'DNA_LINK'
  | 'RELATIONSHIP';

export type ClaimStatus =
  | 'ESTABLISHED'
  | 'PROBABLE'
  | 'HYPOTHESIS'
  | 'POSSIBLE'
  | 'CONFLICTED'
  | 'REFUTED'
  | 'UNRESOLVABLE';

export type AccessType =
  | 'OPEN'
  | 'PUBLIC_API'
  | 'METADATA_ONLY'
  | 'SUBSCRIPTION'
  | 'ARCHIVAL_REQUEST'
  | 'ON_SITE'
  | 'RESTRICTED'
  | 'CULTURALLY_CONTROLLED'
  | 'UNAVAILABLE'
  | 'DESTROYED';

export type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DefectType =
  | 'BIRTH_AFTER_DEATH'
  | 'CHILD_BEFORE_PARENT'
  | 'PARENT_TOO_YOUNG'
  | 'PARENT_TOO_OLD'
  | 'CIRCULAR_ANCESTRY'
  | 'ISOLATED_PERSON'
  | 'DUPLICATE_IDENTITY'
  | 'MISSING_EVIDENCE'
  | 'IMPOSSIBLE_TRAVEL'
  | 'INCOMPLETE_CITATION';

export interface Person {
  id: string;
  gedcomId?: string;
  firstName: string;
  lastName: string;
  prefix?: string;
  suffix?: string;
  gender: 'M' | 'F' | 'U' | 'X';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
  notes?: string;
  photoUrl?: string;
  tags?: string[];
  externalIds?: Record<string, string>;
  confidenceScore?: number; // 0 to 1.0
  lastModified?: string;
}

export interface Family {
  id: string;
  gedcomId?: string;
  husbandId?: string;
  wifeId?: string;
  childrenIds: string[];
  marriageDate?: string;
  marriagePlace?: string;
  divorceDate?: string;
  type: 'MARRIAGE' | 'PARTNERSHIP' | 'UNKNOWN';
  status: 'ESTABLISHED' | 'PROPOSED' | 'CONFLICTED';
}

export interface Claim {
  id: string;
  claimType: ClaimType;
  subjectId: string; // personId or familyId
  subjectType: 'Person' | 'Family' | 'Place' | 'Event';
  value: any; // structured value (e.g. { date: '1824-05-12', place: 'Belfast' })
  status: ClaimStatus;
  confidence: number; // 0.0 - 1.0
  note?: string;
  rationale?: string;
  // W3C PROV-O Provenance
  provActivity?: string; // e.g. "activity:transcription-run-482"
  provAgent?: string; // e.g. "agent:ResearchDirector", "user:nsalbertson"
  provEntity?: string; // e.g. "source:1850-census-microfilm-42"
  evidenceIds: string[];
  hypothesisId?: string;
  adjudicatedAt?: string;
  adjudicatorId?: string;
  supersededBy?: string;
  createdAt: string;
}

export interface EvidenceItem {
  id: string;
  filename: string;
  storageKey?: string;
  mimeType: string;
  size?: number;
  hash: string; // SHA-256 for cryptographic integrity
  description: string;
  repositoryName: string;
  page?: string;
  line?: string;
  transcription?: string;
  transcriptionConfidence?: number;
  language?: string;
  rights?: string;
  isPublic?: boolean;
  iiifUrl?: string;
  citationText: string;
  sourceDate?: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  status: 'PROPOSED' | 'TESTING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';
  evidenceScore: number;
  claimIds: string[];
  disproofCriteria?: string[];
  createdAt: string;
}

export interface ConflictSet {
  id: string;
  description: string;
  claimIds: string[];
  resolution?: 'RESOLVED' | 'UNRESOLVED' | 'DEFERRED';
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedById?: string;
}

export interface RepairImpact {
  id: string;
  description: string;
  severity: DefectSeverity;
  affectedEntityType: 'Person' | 'Family' | 'Claim' | 'Evidence';
  affectedEntityId: string;
  beforeValue?: any;
  afterValue?: any;
}

export interface RepairPatch {
  id: string;
  title: string;
  description: string;
  status: 'PROPOSED' | 'APPLIED' | 'ROLLED_BACK';
  defectType: DefectType;
  severity: DefectSeverity;
  beforeState: any;
  afterState: any;
  rationale: string;
  impacts: RepairImpact[];
  timestamp: string;
  appliedAt?: string;
  appliedById?: string;
  rolledBackAt?: string;
}

export interface TreeDefect {
  id: string;
  type: DefectType;
  severity: DefectSeverity;
  title: string;
  description: string;
  personIds: string[];
  familyIds?: string[];
  claimIds?: string[];
  suggestedFix: string;
  patchAvailable: boolean;
}

export type AccessStatus =
  | 'OPEN_WEB'
  | 'API_KEY_REQUIRED'
  | 'PAYWALLED'
  | 'RESTRICTED_ONSITE'
  | 'DESTROYED_LOST';

export type EpistemicStatus = 'DOCUMENTED' | 'DERIVED' | 'INFERRED' | 'CONTEXTUAL' | 'UNKNOWN';

export interface CoverageSource {
  id: string;
  name: string;
  jurisdiction: string;
  recordClass: string;
  temporalCoverage: string;
  accessStatus: AccessStatus;
  completenessScore: number;
  searchCapabilities: string[];
  apiEndpoint?: string;
  notes?: string;
}

export interface ProofPathEdge {
  relationshipType: string;
  layer: string;
  evidenceCount: number;
}

export interface ProofPathResult {
  relationshipDescription: string;
  degreesOfSeparation: number;
  confidenceScore: number;
  path: Person[];
  edges: ProofPathEdge[];
  weakestLink?: {
    person: Person;
    reason: string;
  };
}

export interface CoverageCollection {
  id: string;
  name: string;
  description?: string;
  jurisdiction: string;
  coverageStart: string;
  coverageEnd: string;
  url?: string;
  accessType: AccessType;
  accessNote?: string;
  cost?: number;
  costCurrency?: string;
  totalSurvivingVolumes?: string;
  lastVerified?: string;
}

export interface CoverageReceipt {
  id: string;
  collectionId: string;
  collectionName: string;
  query: string;
  queryParams?: any;
  searchedAt: string;
  resultsFound: number;
  completeness: number; // 0.0 - 1.0 (estimated coverage)
  note?: string;
  accessBarrier?: string;
}

export interface DnaSegment {
  id: string;
  personId: string;
  personName: string;
  matchPersonId: string;
  matchPersonName: string;
  chromosome: string; // '1' - '22', 'X'
  startPos: number; // in base pairs
  endPos: number;
  centimorgans: number;
  snps?: number;
  isIdentical: boolean;
  confidence: number;
  triangulatedGroup?: string;
}

export interface DnaConsent {
  id: string;
  personId: string;
  consentGiven: boolean;
  consentDate: string;
  consentScope: 'RESEARCH' | 'MATCHING' | 'SHARING' | 'PUBLICATION';
  note?: string;
}

export interface SimulationStatement {
  text: string;
  status: 'DOCUMENTED' | 'DERIVED' | 'INFERRED' | 'CONTEXTUAL' | 'UNKNOWN';
}

export interface SimulationRun {
  id: string;
  name: string;
  personId: string;
  personName: string;
  year: number;
  location: string;
  fidelityLevel: number; // 0-5
  fidelityName: string;
  narrative: string;
  statements: SimulationStatement[];
  timestamp: string;
  imageUrl?: string;
}

export interface ProofPathOption {
  layer: 'accepted' | 'probable' | 'hypothetical' | 'social' | 'dna';
  path: string[]; // Person IDs in path order
  edgeTypes: string[]; // 'parent-child', 'spouse', 'household', 'dna', 'associative'
  weight: number;
  confidence: number;
  evidenceCount: number;
  summary: string;
}

export interface ConnectionReport {
  startPerson: Person;
  targetPerson: Person;
  shortestAccepted: ProofPathOption | null;
  strongestEvidence: ProofPathOption | null;
  mostPlausible: ProofPathOption | null;
  alternatives: ProofPathOption[];
  missingBridgePeople: Person[];
  weakestClaim?: Claim;
  evidenceNeeded: string[];
  falsificationCriteria: string[];
}

export interface TreeData {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  persons: Person[];
  families: Family[];
  claims: Claim[];
  evidence: EvidenceItem[];
  hypotheses: Hypothesis[];
  conflicts: ConflictSet[];
  patches: RepairPatch[];
  coverageReceipts: CoverageReceipt[];
  dnaSegments: DnaSegment[];
  dnaConsents: DnaConsent[];
  simulations: SimulationRun[];
}
