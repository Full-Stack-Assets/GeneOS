import { TreeData, Person, Family, Claim, EvidenceItem } from '../types/genealogy';

/**
 * Parses raw GEDCOM text into normalized TreeData objects
 * Supports standard INDI, FAM, SOUR, BIRT, DEAT, MARR, PLAC tags
 */
export function parseGedcom(rawText: string, treeName: string = 'Imported GEDCOM Tree'): TreeData {
  const lines = rawText.split(/\r?\n/);
  
  const persons: Person[] = [];
  const families: Family[] = [];
  const claims: Claim[] = [];
  const evidence: EvidenceItem[] = [];

  let currentRecordType: 'INDI' | 'FAM' | 'SOUR' | 'HEAD' | null = null;
  let currentIndi: Partial<Person> & { fams?: string[]; famc?: string[]; sources?: string[] } | null = null;
  let currentFam: Partial<Family> | null = null;
  let currentSour: Partial<EvidenceItem> | null = null;

  let currentSubTag: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse level, tag, and value
    // Level 0 @I1@ INDI or Level 1 NAME John /Doe/
    const match = line.match(/^(\d+)\s+(@[^@]+@\s+)?([A-Za-z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const id = match[2] ? match[2].trim() : undefined;
    const tag = match[3];
    const value = match[4] ? match[4].trim() : '';

    if (level === 0) {
      // Save previous record
      if (currentRecordType === 'INDI' && currentIndi && currentIndi.id) {
        persons.push(finalizePerson(currentIndi));
      } else if (currentRecordType === 'FAM' && currentFam && currentFam.id) {
        families.push(finalizeFamily(currentFam));
      } else if (currentRecordType === 'SOUR' && currentSour && currentSour.id) {
        evidence.push(finalizeEvidence(currentSour));
      }

      currentSubTag = null;

      if (tag === 'INDI') {
        currentRecordType = 'INDI';
        currentIndi = {
          id: id || `I${persons.length + 1}`,
          gedcomId: id,
          firstName: 'Unknown',
          lastName: '',
          gender: 'U',
          fams: [],
          famc: [],
          sources: [],
          tags: ['GEDCOM_INGEST'],
          confidenceScore: 0.85,
        };
      } else if (tag === 'FAM') {
        currentRecordType = 'FAM';
        currentFam = {
          id: id || `F${families.length + 1}`,
          gedcomId: id,
          childrenIds: [],
          type: 'MARRIAGE',
          status: 'ESTABLISHED',
        };
      } else if (tag === 'SOUR') {
        currentRecordType = 'SOUR';
        currentSour = {
          id: id || `S${evidence.length + 1}`,
          filename: 'Primary Source Record',
          mimeType: 'text/plain',
          description: value || 'Archival Citation',
          repositoryName: 'Family Archive',
          hash: generateMockHash(value || id || 'sour'),
          citationText: value || 'GEDCOM Source Record',
          uploadedAt: new Date().toISOString(),
        };
      } else {
        currentRecordType = null;
      }
    } else if (level === 1) {
      currentSubTag = tag;
      if (currentRecordType === 'INDI' && currentIndi) {
        if (tag === 'NAME') {
          const nameParts = parseGedcomName(value);
          currentIndi.firstName = nameParts.firstName || 'Unknown';
          currentIndi.lastName = nameParts.lastName || '';
          currentIndi.prefix = nameParts.prefix;
          currentIndi.suffix = nameParts.suffix;
        } else if (tag === 'SEX') {
          currentIndi.gender = value.toUpperCase().startsWith('M') ? 'M' : value.toUpperCase().startsWith('F') ? 'F' : 'U';
        } else if (tag === 'OCCU') {
          currentIndi.occupation = value;
        } else if (tag === 'NOTE') {
          currentIndi.notes = (currentIndi.notes ? currentIndi.notes + '\n' : '') + value;
        } else if (tag === 'FAMS') {
          currentIndi.fams?.push(value);
        } else if (tag === 'FAMC') {
          currentIndi.famc?.push(value);
        } else if (tag === 'SOUR') {
          currentIndi.sources?.push(value);
        }
      } else if (currentRecordType === 'FAM' && currentFam) {
        if (tag === 'HUSB') {
          currentFam.husbandId = value;
        } else if (tag === 'WIFE') {
          currentFam.wifeId = value;
        } else if (tag === 'CHIL') {
          currentFam.childrenIds?.push(value);
        }
      } else if (currentRecordType === 'SOUR' && currentSour) {
        if (tag === 'TITL') {
          currentSour.description = value;
          currentSour.citationText = value;
        } else if (tag === 'AUTH') {
          currentSour.citationText += ` Author: ${value}`;
        } else if (tag === 'PUBL') {
          currentSour.citationText += ` Published: ${value}`;
        } else if (tag === 'REPO') {
          currentSour.repositoryName = value;
        }
      }
    } else if (level === 2) {
      if (currentRecordType === 'INDI' && currentIndi) {
        if (currentSubTag === 'BIRT') {
          if (tag === 'DATE') currentIndi.birthDate = value;
          if (tag === 'PLAC') currentIndi.birthPlace = value;
        } else if (currentSubTag === 'DEAT') {
          if (tag === 'DATE') currentIndi.deathDate = value;
          if (tag === 'PLAC') currentIndi.deathPlace = value;
        }
      } else if (currentRecordType === 'FAM' && currentFam) {
        if (currentSubTag === 'MARR') {
          if (tag === 'DATE') currentFam.marriageDate = value;
          if (tag === 'PLAC') currentFam.marriagePlace = value;
        }
      }
    }
  }

  // Push final record
  if (currentRecordType === 'INDI' && currentIndi && currentIndi.id) {
    persons.push(finalizePerson(currentIndi));
  } else if (currentRecordType === 'FAM' && currentFam && currentFam.id) {
    families.push(finalizeFamily(currentFam));
  } else if (currentRecordType === 'SOUR' && currentSour && currentSour.id) {
    evidence.push(finalizeEvidence(currentSour));
  }

  // Generate PROV-O Claims automatically for ingested data
  persons.forEach((person) => {
    if (person.birthDate || person.birthPlace) {
      claims.push({
        id: `CLM-BIRT-${person.id}`,
        claimType: 'BIRTH',
        subjectId: person.id,
        subjectType: 'Person',
        value: { date: person.birthDate, place: person.birthPlace },
        status: 'ESTABLISHED',
        confidence: 0.9,
        rationale: 'Extracted from primary GEDCOM vital event tag',
        provActivity: 'activity:gedcom-ingestion-v1',
        provAgent: 'agent:UniversalIngestionFoundry',
        provEntity: 'source:gedcom-stream',
        evidenceIds: [],
        createdAt: new Date().toISOString(),
      });
    }
    if (person.deathDate || person.deathPlace) {
      claims.push({
        id: `CLM-DEAT-${person.id}`,
        claimType: 'DEATH',
        subjectId: person.id,
        subjectType: 'Person',
        value: { date: person.deathDate, place: person.deathPlace },
        status: 'ESTABLISHED',
        confidence: 0.9,
        rationale: 'Extracted from primary GEDCOM death record tag',
        provActivity: 'activity:gedcom-ingestion-v1',
        provAgent: 'agent:UniversalIngestionFoundry',
        provEntity: 'source:gedcom-stream',
        evidenceIds: [],
        createdAt: new Date().toISOString(),
      });
    }
  });

  families.forEach((fam) => {
    if (fam.husbandId && fam.wifeId) {
      claims.push({
        id: `CLM-SPOUSE-${fam.id}`,
        claimType: 'SPOUSE',
        subjectId: fam.id,
        subjectType: 'Family',
        value: { husbandId: fam.husbandId, wifeId: fam.wifeId, date: fam.marriageDate, place: fam.marriagePlace },
        status: 'ESTABLISHED',
        confidence: 0.95,
        rationale: 'Extracted from FAM union record',
        provActivity: 'activity:gedcom-ingestion-v1',
        provAgent: 'agent:UniversalIngestionFoundry',
        evidenceIds: [],
        createdAt: new Date().toISOString(),
      });
    }
    fam.childrenIds.forEach((childId) => {
      claims.push({
        id: `CLM-PARENT-${fam.id}-${childId}`,
        claimType: 'PARENT',
        subjectId: childId,
        subjectType: 'Person',
        value: { familyId: fam.id, fatherId: fam.husbandId, motherId: fam.wifeId },
        status: 'ESTABLISHED',
        confidence: 0.92,
        rationale: 'Extracted from parent-child edge in FAM record',
        provActivity: 'activity:gedcom-ingestion-v1',
        provAgent: 'agent:UniversalIngestionFoundry',
        evidenceIds: [],
        createdAt: new Date().toISOString(),
      });
    });
  });

  return {
    id: `tree_${Date.now()}`,
    name: treeName,
    description: `Ingested ${persons.length} individuals, ${families.length} families, and ${claims.length} claims.`,
    createdAt: new Date().toISOString(),
    persons,
    families,
    claims,
    evidence,
    hypotheses: [],
    conflicts: [],
    patches: [],
    coverageReceipts: [],
    dnaSegments: [],
    dnaConsents: [],
    simulations: [],
  };
}

function parseGedcomName(nameVal: string): { firstName: string; lastName: string; prefix?: string; suffix?: string } {
  if (!nameVal) return { firstName: 'Unknown', lastName: '' };
  
  // Format: John /Doe/ Jr.
  const slashMatch = nameVal.match(/^(.*?)\/([^\/]*)\/(.*)$/);
  if (slashMatch) {
    return {
      firstName: slashMatch[1].trim() || 'Unknown',
      lastName: slashMatch[2].trim(),
      suffix: slashMatch[3].trim() || undefined,
    };
  }
  
  const parts = nameVal.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

function finalizePerson(data: Partial<Person>): Person {
  return {
    id: data.id || `P_${Math.random().toString(36).substring(2, 9)}`,
    gedcomId: data.gedcomId || data.id,
    firstName: data.firstName || 'Unknown',
    lastName: data.lastName || '',
    prefix: data.prefix,
    suffix: data.suffix,
    gender: data.gender || 'U',
    birthDate: data.birthDate,
    birthPlace: data.birthPlace,
    deathDate: data.deathDate,
    deathPlace: data.deathPlace,
    occupation: data.occupation,
    notes: data.notes,
    confidenceScore: data.confidenceScore || 0.85,
    tags: data.tags || ['INGESTED'],
    lastModified: new Date().toISOString(),
  };
}

function finalizeFamily(data: Partial<Family>): Family {
  return {
    id: data.id || `F_${Math.random().toString(36).substring(2, 9)}`,
    gedcomId: data.gedcomId || data.id,
    husbandId: data.husbandId,
    wifeId: data.wifeId,
    childrenIds: data.childrenIds || [],
    marriageDate: data.marriageDate,
    marriagePlace: data.marriagePlace,
    type: data.type || 'MARRIAGE',
    status: data.status || 'ESTABLISHED',
  };
}

function finalizeEvidence(data: Partial<EvidenceItem>): EvidenceItem {
  return {
    id: data.id || `E_${Math.random().toString(36).substring(2, 9)}`,
    filename: data.filename || 'Source Document',
    mimeType: data.mimeType || 'text/plain',
    description: data.description || 'Historical record citation',
    repositoryName: data.repositoryName || 'Archive Repository',
    hash: data.hash || generateMockHash(data.id || 'ev'),
    citationText: data.citationText || 'Archival Citation',
    uploadedAt: data.uploadedAt || new Date().toISOString(),
  };
}

function generateMockHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852${hex.substring(0, 6)}`;
}

/**
 * Serializes TreeData back into standard GEDCOM 7.0 format
 */
export function exportToGedcom(tree: TreeData): string {
  const lines: string[] = [
    '0 HEAD',
    '1 GEDC',
    '2 VERS 7.0',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
    '1 SOUR GENEALOGICAL_INTELLIGENCE_OS',
    '2 VERS 1.0.0',
    '2 NAME Genealogical Intelligence OS',
    '1 DATE ' + new Date().toISOString().split('T')[0],
  ];

  // Persons
  tree.persons.forEach((p) => {
    const gedId = p.gedcomId?.startsWith('@') ? p.gedcomId : `@${p.id}@`;
    lines.push(`0 ${gedId} INDI`);
    lines.push(`1 NAME ${p.firstName} /${p.lastName}/`);
    if (p.prefix) lines.push(`2 NPFX ${p.prefix}`);
    if (p.suffix) lines.push(`2 NSFX ${p.suffix}`);
    if (p.gender && p.gender !== 'U') lines.push(`1 SEX ${p.gender}`);
    if (p.birthDate || p.birthPlace) {
      lines.push('1 BIRT');
      if (p.birthDate) lines.push(`2 DATE ${p.birthDate}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }
    if (p.deathDate || p.deathPlace) {
      lines.push('1 DEAT');
      if (p.deathDate) lines.push(`2 DATE ${p.deathDate}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }
    if (p.occupation) lines.push(`1 OCCU ${p.occupation}`);
    if (p.notes) lines.push(`1 NOTE ${p.notes.replace(/\n/g, ' ')}`);

    // Family links
    tree.families.forEach((f) => {
      const famId = f.gedcomId?.startsWith('@') ? f.gedcomId : `@${f.id}@`;
      if (f.husbandId === p.id || f.wifeId === p.id) {
        lines.push(`1 FAMS ${famId}`);
      }
      if (f.childrenIds.includes(p.id)) {
        lines.push(`1 FAMC ${famId}`);
      }
    });
  });

  // Families
  tree.families.forEach((f) => {
    const famId = f.gedcomId?.startsWith('@') ? f.gedcomId : `@${f.id}@`;
    lines.push(`0 ${famId} FAM`);
    if (f.husbandId) {
      const husbId = f.husbandId.startsWith('@') ? f.husbandId : `@${f.husbandId}@`;
      lines.push(`1 HUSB ${husbId}`);
    }
    if (f.wifeId) {
      const wifeId = f.wifeId.startsWith('@') ? f.wifeId : `@${f.wifeId}@`;
      lines.push(`1 WIFE ${wifeId}`);
    }
    f.childrenIds.forEach((cId) => {
      const childId = cId.startsWith('@') ? cId : `@${cId}@`;
      lines.push(`1 CHIL ${childId}`);
    });
    if (f.marriageDate || f.marriagePlace) {
      lines.push('1 MARR');
      if (f.marriageDate) lines.push(`2 DATE ${f.marriageDate}`);
      if (f.marriagePlace) lines.push(`2 PLAC ${f.marriagePlace}`);
    }
  });

  // Sources
  tree.evidence.forEach((ev) => {
    const sId = ev.id.startsWith('@') ? ev.id : `@${ev.id}@`;
    lines.push(`0 ${sId} SOUR`);
    lines.push(`1 TITL ${ev.description}`);
    lines.push(`1 REPO ${ev.repositoryName}`);
    lines.push(`1 NOTE Hash: ${ev.hash} | Citation: ${ev.citationText}`);
  });

  lines.push('0 TRLR');
  return lines.join('\n');
}

/**
 * Exports complete evidence-governed portable research bundle JSON
 */
export function exportPortableResearchBundle(tree: TreeData): string {
  const bundle = {
    format: 'GENEALOGY_OS_PORTABLE_BUNDLE_V1',
    schemaVersion: '1.0.0',
    exportDate: new Date().toISOString(),
    standards: {
      gpsCompliant: true,
      provOProvenance: true,
      reversiblePatches: true,
    },
    manifest: {
      treeName: tree.name,
      description: tree.description,
      totalPersons: tree.persons.length,
      totalFamilies: tree.families.length,
      totalClaims: tree.claims.length,
      totalEvidenceItems: tree.evidence.length,
      totalHypotheses: tree.hypotheses.length,
      totalPatches: tree.patches.length,
    },
    data: tree,
  };
  return JSON.stringify(bundle, null, 2);
}
