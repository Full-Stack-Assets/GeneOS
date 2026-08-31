import { TreeData, Person, Family, Claim, TreeDefect, RepairPatch, RepairImpact } from '../types/genealogy';

export function runTreeForensicsAudit(tree: TreeData): TreeDefect[] {
  const defects: TreeDefect[] = [];
  const personMap = new Map<string, Person>(tree.persons.map((p) => [p.id, p]));

  // 1. Chronological & Biological Checks
  tree.persons.forEach((person) => {
    const birthYear = extractYear(person.birthDate);
    const deathYear = extractYear(person.deathDate);

    // Birth after death
    if (birthYear !== null && deathYear !== null && birthYear > deathYear) {
      defects.push({
        id: `def_bad_${person.id}`,
        type: 'BIRTH_AFTER_DEATH',
        severity: 'CRITICAL',
        title: `Impossible Chronology: Birth after Death for ${person.firstName} ${person.lastName}`,
        description: `Birth year ${birthYear} is recorded after death year ${deathYear}.`,
        personIds: [person.id],
        suggestedFix: `Invert or verify primary source dates for birth (${person.birthDate}) and death (${person.deathDate}).`,
        patchAvailable: true,
      });
    }

    // Lifespan anomaly
    if (birthYear !== null && deathYear !== null && deathYear - birthYear > 115) {
      defects.push({
        id: `def_life_${person.id}`,
        type: 'BIRTH_AFTER_DEATH',
        severity: 'MEDIUM',
        title: `Extreme Lifespan Anomaly (>115 yrs): ${person.firstName} ${person.lastName}`,
        description: `Calculated lifespan is ${deathYear - birthYear} years (${birthYear} - ${deathYear}). Likely namesakes merged.`,
        personIds: [person.id],
        suggestedFix: `Separate senior and junior namesake identities into two distinct person records.`,
        patchAvailable: true,
      });
    }
  });

  // 2. Parent-Child Chronology
  tree.families.forEach((fam) => {
    const father = fam.husbandId ? personMap.get(fam.husbandId) : null;
    const mother = fam.wifeId ? personMap.get(fam.wifeId) : null;

    const fatherBirth = father ? extractYear(father.birthDate) : null;
    const motherBirth = mother ? extractYear(mother.birthDate) : null;
    const fatherDeath = father ? extractYear(father.deathDate) : null;

    fam.childrenIds.forEach((childId) => {
      const child = personMap.get(childId);
      if (!child) return;
      const childBirth = extractYear(child.birthDate);
      if (childBirth === null) return;

      // Child before mother
      if (mother && motherBirth !== null && childBirth < motherBirth) {
        defects.push({
          id: `def_cbp_m_${fam.id}_${child.id}`,
          type: 'CHILD_BEFORE_PARENT',
          severity: 'CRITICAL',
          title: `Biological Impossibility: Child born before Mother`,
          description: `${child.firstName} born in ${childBirth}, but mother ${mother.firstName} was born later in ${motherBirth}.`,
          personIds: [child.id, mother.id],
          familyIds: [fam.id],
          suggestedFix: `Detach maternal relationship or correct birth date for mother ${mother.firstName}.`,
          patchAvailable: true,
        });
      }

      // Mother too young (< 13) or too old (> 55)
      if (mother && motherBirth !== null) {
        const ageAtChildBirth = childBirth - motherBirth;
        if (ageAtChildBirth > 0 && ageAtChildBirth < 13) {
          defects.push({
            id: `def_mty_${fam.id}_${child.id}`,
            type: 'PARENT_TOO_YOUNG',
            severity: 'HIGH',
            title: `Severe Anomaly: Mother aged ${ageAtChildBirth} at child birth`,
            description: `Mother ${mother.firstName} was only ${ageAtChildBirth} years old when ${child.firstName} was born.`,
            personIds: [child.id, mother.id],
            suggestedFix: `Verify baptism vs birth year for child or mother.`,
            patchAvailable: true,
          });
        }
        if (ageAtChildBirth > 55) {
          defects.push({
            id: `def_mto_${fam.id}_${child.id}`,
            type: 'PARENT_TOO_OLD',
            severity: 'HIGH',
            title: `Biological Anomaly: Mother aged ${ageAtChildBirth} at child birth`,
            description: `Mother ${mother.firstName} was ${ageAtChildBirth} years old when ${child.firstName} was born.`,
            personIds: [child.id, mother.id],
            suggestedFix: `Check if child is grandchild raised as sibling or child of second marriage.`,
            patchAvailable: true,
          });
        }
      }

      // Child born > 9 months after father death
      if (father && fatherDeath !== null && childBirth > fatherDeath + 1) {
        defects.push({
          id: `def_posthumous_${fam.id}_${child.id}`,
          type: 'CHILD_BEFORE_PARENT',
          severity: 'CRITICAL',
          title: `Posthumous Impossibility: Born >1 year after Father death`,
          description: `${child.firstName} born in ${childBirth}, but father ${father.firstName} died in ${fatherDeath}.`,
          personIds: [child.id, father.id],
          suggestedFix: `Re-evaluate paternity or father death date.`,
          patchAvailable: true,
        });
      }
    });
  });

  // 3. Isolated Persons
  const connectedPersonIds = new Set<string>();
  tree.families.forEach((fam) => {
    if (fam.husbandId) connectedPersonIds.add(fam.husbandId);
    if (fam.wifeId) connectedPersonIds.add(fam.wifeId);
    fam.childrenIds.forEach((c) => connectedPersonIds.add(c));
  });

  tree.persons.forEach((person) => {
    if (!connectedPersonIds.has(person.id)) {
      defects.push({
        id: `def_iso_${person.id}`,
        type: 'ISOLATED_PERSON',
        severity: 'LOW',
        title: `Disconnected Node: ${person.firstName} ${person.lastName}`,
        description: `Person has no parents, spouses, or children connected in the graph.`,
        personIds: [person.id],
        suggestedFix: `Attach to relevant family or associate via community FAN network.`,
        patchAvailable: true,
      });
    }
  });

  // 4. Missing Evidence on Established Claims
  tree.claims.forEach((claim) => {
    if (claim.status === 'ESTABLISHED' && claim.evidenceIds.length === 0) {
      defects.push({
        id: `def_noev_${claim.id}`,
        type: 'MISSING_EVIDENCE',
        severity: 'MEDIUM',
        title: `Uncorroborated Established Claim: ${claim.claimType}`,
        description: `Claim on ${claim.subjectType} (${claim.subjectId}) is marked ESTABLISHED but has 0 linked evidence artifacts.`,
        personIds: claim.subjectType === 'Person' ? [claim.subjectId] : [],
        claimIds: [claim.id],
        suggestedFix: `Downgrade status to HYPOTHESIS or link supporting primary archival document.`,
        patchAvailable: true,
      });
    }
  });

  // 5. Potential Duplicate Identities
  const nameMap = new Map<string, Person[]>();
  tree.persons.forEach((p) => {
    const key = `${p.firstName.toLowerCase().trim()}_${p.lastName.toLowerCase().trim()}`;
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(p);
  });

  nameMap.forEach((duplicates, nameKey) => {
    if (duplicates.length > 1) {
      const p1 = duplicates[0];
      const p2 = duplicates[1];
      const b1 = extractYear(p1.birthDate);
      const b2 = extractYear(p2.birthDate);

      if (b1 !== null && b2 !== null && Math.abs(b1 - b2) <= 3) {
        defects.push({
          id: `def_dup_${p1.id}_${p2.id}`,
          type: 'DUPLICATE_IDENTITY',
          severity: 'HIGH',
          title: `Potential Duplicate Namesakes: ${p1.firstName} ${p1.lastName}`,
          description: `Two persons with name "${p1.firstName} ${p1.lastName}" and similar birth dates (${p1.birthDate || b1} vs ${p2.birthDate || b2}).`,
          personIds: [p1.id, p2.id],
          suggestedFix: `Execute governed identity merge or confirm distinct identities through parish FAN analysis.`,
          patchAvailable: true,
        });
      }
    }
  });

  return defects;
}

export function generatePatchForDefect(tree: TreeData, defect: TreeDefect): RepairPatch {
  const impacts: RepairImpact[] = [];
  let beforeState: any = {};
  let afterState: any = {};
  let rationale = defect.suggestedFix;

  if (defect.type === 'BIRTH_AFTER_DEATH' && defect.personIds.length > 0) {
    const person = tree.persons.find((p) => p.id === defect.personIds[0]);
    if (person) {
      beforeState = { id: person.id, birthDate: person.birthDate, deathDate: person.deathDate };
      // Invert dates as hypothesis
      afterState = { id: person.id, birthDate: person.deathDate, deathDate: person.birthDate };
      rationale = `Swapped inverted vital dates for ${person.firstName} ${person.lastName} to restore chronological consistency.`;
      impacts.push({
        id: `imp_${Date.now()}_1`,
        description: `Corrected vital chronology for ${person.firstName} ${person.lastName}.`,
        severity: 'CRITICAL',
        affectedEntityType: 'Person',
        affectedEntityId: person.id,
        beforeValue: beforeState,
        afterValue: afterState,
      });
    }
  } else if (defect.type === 'MISSING_EVIDENCE' && defect.claimIds && defect.claimIds.length > 0) {
    const claim = tree.claims.find((c) => c.id === defect.claimIds![0]);
    if (claim) {
      beforeState = { id: claim.id, status: claim.status };
      afterState = { id: claim.id, status: 'HYPOTHESIS' };
      rationale = `Downgraded unverified claim ${claim.id} from ESTABLISHED to HYPOTHESIS in accordance with GPS rules.`;
      impacts.push({
        id: `imp_${Date.now()}_2`,
        description: `Downgraded claim status to prevent false conclusions.`,
        severity: 'MEDIUM',
        affectedEntityType: 'Claim',
        affectedEntityId: claim.id,
        beforeValue: beforeState,
        afterValue: afterState,
      });
    }
  } else if (defect.type === 'CHILD_BEFORE_PARENT' && defect.personIds.length >= 2) {
    const child = tree.persons.find((p) => p.id === defect.personIds[0]);
    const mother = tree.persons.find((p) => p.id === defect.personIds[1]);
    beforeState = { childId: child?.id, motherId: mother?.id, connected: true };
    afterState = { childId: child?.id, motherId: mother?.id, connected: false };
    rationale = `Detached biologically impossible mother-child edge pending correct baptism certificate discovery.`;
    impacts.push({
      id: `imp_${Date.now()}_3`,
      description: `Detached child ${child?.firstName} from impossible mother ${mother?.firstName}.`,
      severity: 'HIGH',
      affectedEntityType: 'Family',
      affectedEntityId: defect.familyIds?.[0] || 'fam_unknown',
      beforeValue: beforeState,
      afterValue: afterState,
    });
  } else {
    beforeState = { defectId: defect.id, resolved: false };
    afterState = { defectId: defect.id, resolved: true, note: 'Reviewed and resolved by user.' };
    impacts.push({
      id: `imp_${Date.now()}_gen`,
      description: `Resolved forensic defect "${defect.title}".`,
      severity: defect.severity,
      affectedEntityType: 'Person',
      affectedEntityId: defect.personIds[0] || 'tree',
      beforeValue: beforeState,
      afterValue: afterState,
    });
  }

  return {
    id: `patch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `Forensic Repair: ${defect.title}`,
    description: defect.description,
    status: 'PROPOSED',
    defectType: defect.type,
    severity: defect.severity,
    beforeState,
    afterState,
    rationale,
    impacts,
    timestamp: new Date().toISOString(),
  };
}

export function applyRepairPatch(tree: TreeData, patch: RepairPatch): TreeData {
  const updatedTree: TreeData = JSON.parse(JSON.stringify(tree));

  // Apply state modifications based on patch before/after
  if (patch.defectType === 'BIRTH_AFTER_DEATH' && patch.afterState.id) {
    const p = updatedTree.persons.find((item) => item.id === patch.afterState.id);
    if (p) {
      p.birthDate = patch.afterState.birthDate;
      p.deathDate = patch.afterState.deathDate;
      p.lastModified = new Date().toISOString();
    }
  } else if (patch.defectType === 'MISSING_EVIDENCE' && patch.afterState.id) {
    const c = updatedTree.claims.find((item) => item.id === patch.afterState.id);
    if (c) {
      c.status = patch.afterState.status;
      c.rationale = patch.rationale;
    }
  }

  // Update patch status in ledger
  const existingPatch = updatedTree.patches.find((p) => p.id === patch.id);
  if (existingPatch) {
    existingPatch.status = 'APPLIED';
    existingPatch.appliedAt = new Date().toISOString();
  } else {
    updatedTree.patches.push({
      ...patch,
      status: 'APPLIED',
      appliedAt: new Date().toISOString(),
    });
  }

  return updatedTree;
}

export function rollbackRepairPatch(tree: TreeData, patchId: string): TreeData {
  const updatedTree: TreeData = JSON.parse(JSON.stringify(tree));
  const patch = updatedTree.patches.find((p) => p.id === patchId);
  if (!patch) return tree;

  // Restore before state
  if (patch.defectType === 'BIRTH_AFTER_DEATH' && patch.beforeState.id) {
    const p = updatedTree.persons.find((item) => item.id === patch.beforeState.id);
    if (p) {
      p.birthDate = patch.beforeState.birthDate;
      p.deathDate = patch.beforeState.deathDate;
      p.lastModified = new Date().toISOString();
    }
  } else if (patch.defectType === 'MISSING_EVIDENCE' && patch.beforeState.id) {
    const c = updatedTree.claims.find((item) => item.id === patch.beforeState.id);
    if (c) {
      c.status = patch.beforeState.status;
    }
  }

  patch.status = 'ROLLED_BACK';
  patch.rolledBackAt = new Date().toISOString();

  return updatedTree;
}

function extractYear(dateStr?: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? parseInt(match[1], 10) : null;
}
