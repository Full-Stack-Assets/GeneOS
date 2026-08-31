import { TreeData, Person, Claim, ProofPathOption, ConnectionReport, ProofPathResult, ProofPathEdge } from '../types/genealogy';

interface GraphEdge {
  from: string;
  to: string;
  layer: 'accepted' | 'probable' | 'hypothetical' | 'social' | 'dna';
  edgeType: string;
  weight: number;
  confidence: number;
  claimId?: string;
  evidenceCount: number;
  description: string;
}

export function solveProofPath(
  tree: TreeData,
  personAId: string,
  personBId: string,
  allowedLayers: Array<'accepted' | 'probable' | 'hypothetical' | 'social' | 'dna'> = ['accepted', 'probable', 'hypothetical', 'dna']
): ProofPathResult | null {
  const personA = tree.persons.find((p) => p.id === personAId);
  const personB = tree.persons.find((p) => p.id === personBId);

  if (!personA || !personB) return null;

  // Build multi-layer graph
  const edges: GraphEdge[] = [];
  const personMap = new Map<string, Person>(tree.persons.map((p) => [p.id, p]));

  // 1. Accepted & Probable Family Edges
  tree.families.forEach((fam) => {
    // Spouse connection
    if (fam.husbandId && fam.wifeId) {
      const spouseClaim = tree.claims.find((c) => c.subjectId === fam.id && c.claimType === 'SPOUSE');
      const isEstablished = fam.status === 'ESTABLISHED' || spouseClaim?.status === 'ESTABLISHED';
      const conf = spouseClaim?.confidence ?? (isEstablished ? 0.95 : 0.7);
      const evCount = spouseClaim?.evidenceIds.length ?? (isEstablished ? 1 : 0);

      edges.push({
        from: fam.husbandId,
        to: fam.wifeId,
        layer: isEstablished ? 'accepted' : 'probable',
        edgeType: 'spouse',
        weight: 1.0 - conf * 0.4,
        confidence: conf,
        claimId: spouseClaim?.id,
        evidenceCount: evCount,
        description: `Spouse in family ${fam.id}`,
      });
      edges.push({
        from: fam.wifeId,
        to: fam.husbandId,
        layer: isEstablished ? 'accepted' : 'probable',
        edgeType: 'spouse',
        weight: 1.0 - conf * 0.4,
        confidence: conf,
        claimId: spouseClaim?.id,
        evidenceCount: evCount,
        description: `Spouse in family ${fam.id}`,
      });
    }

    // Parent-Child connections
    fam.childrenIds.forEach((childId) => {
      if (fam.husbandId) {
        const pClaim = tree.claims.find((c) => c.subjectId === childId && c.claimType === 'PARENT');
        const isEst = fam.status === 'ESTABLISHED' || pClaim?.status === 'ESTABLISHED';
        const conf = pClaim?.confidence ?? (isEst ? 0.95 : 0.65);
        const evCount = pClaim?.evidenceIds.length ?? (isEst ? 1 : 0);

        edges.push({
          from: fam.husbandId,
          to: childId,
          layer: isEst ? 'accepted' : 'probable',
          edgeType: 'parent-child',
          weight: 1.0 - conf * 0.5,
          confidence: conf,
          claimId: pClaim?.id,
          evidenceCount: evCount,
          description: `Father`,
        });
        edges.push({
          from: childId,
          to: fam.husbandId,
          layer: isEst ? 'accepted' : 'probable',
          edgeType: 'child-parent',
          weight: 1.0 - conf * 0.5,
          confidence: conf,
          claimId: pClaim?.id,
          evidenceCount: evCount,
          description: `Son/Daughter`,
        });
      }

      if (fam.wifeId) {
        const pClaim = tree.claims.find((c) => c.subjectId === childId && c.claimType === 'PARENT');
        const isEst = fam.status === 'ESTABLISHED' || pClaim?.status === 'ESTABLISHED';
        const conf = pClaim?.confidence ?? (isEst ? 0.95 : 0.65);
        const evCount = pClaim?.evidenceIds.length ?? (isEst ? 1 : 0);

        edges.push({
          from: fam.wifeId,
          to: childId,
          layer: isEst ? 'accepted' : 'probable',
          edgeType: 'parent-child',
          weight: 1.0 - conf * 0.5,
          confidence: conf,
          claimId: pClaim?.id,
          evidenceCount: evCount,
          description: `Mother`,
        });
        edges.push({
          from: childId,
          to: fam.wifeId,
          layer: isEst ? 'accepted' : 'probable',
          edgeType: 'child-parent',
          weight: 1.0 - conf * 0.5,
          confidence: conf,
          claimId: pClaim?.id,
          evidenceCount: evCount,
          description: `Son/Daughter`,
        });
      }
    });
  });

  // 2. DNA Match Edges
  tree.dnaSegments.forEach((seg) => {
    if (personMap.has(seg.personId) && personMap.has(seg.matchPersonId)) {
      edges.push({
        from: seg.personId,
        to: seg.matchPersonId,
        layer: 'dna',
        edgeType: 'dna-match',
        weight: Math.max(0.2, 1.0 - (seg.centimorgans / 100)),
        confidence: seg.confidence,
        evidenceCount: 1,
        description: `DNA Match: ${seg.centimorgans} cM`,
      });
      edges.push({
        from: seg.matchPersonId,
        to: seg.personId,
        layer: 'dna',
        edgeType: 'dna-match',
        weight: Math.max(0.2, 1.0 - (seg.centimorgans / 100)),
        confidence: seg.confidence,
        evidenceCount: 1,
        description: `DNA Match: ${seg.centimorgans} cM`,
      });
    }
  });

  // Filter by allowed layers
  const filteredEdges = edges.filter((e) => allowedLayers.includes(e.layer));

  // Run shortest path
  const bestPath = runLayerDijkstra(filteredEdges, personAId, personBId, personMap);
  if (!bestPath || bestPath.path.length === 0) {
    return {
      relationshipDescription: 'No verified proof path discovered between individuals.',
      degreesOfSeparation: 0,
      confidenceScore: 0,
      path: [personA, personB],
      edges: [],
    };
  }

  const pathPersons = bestPath.path.map((id) => personMap.get(id)!).filter(Boolean);
  const pathEdges: ProofPathEdge[] = bestPath.edgeTypes.map((type, idx) => ({
    relationshipType: type,
    layer: bestPath.layer,
    evidenceCount: 1,
  }));

  // Identify weakest link along the path
  let weakestPerson: Person | undefined = undefined;
  let minConfidence = 1.0;

  pathPersons.forEach((p) => {
    const conf = p.confidenceScore ?? 0.85;
    if (conf < minConfidence) {
      minConfidence = conf;
      weakestPerson = p;
    }
  });

  let weakestLink = undefined;
  if (weakestPerson && minConfidence < 0.9) {
    weakestLink = {
      person: weakestPerson,
      reason: `Historical parentage relies on circumstantial land tenure or single parish entry. Requires adversarial verification against namesake records in neighboring townships.`,
    };
  }

  const degrees = Math.max(1, pathPersons.length - 1);
  let relationshipDesc = `${degrees} Degree Kinship Link`;
  if (degrees === 1) relationshipDesc = 'Direct Immediate Kin (Parent / Child / Spouse)';
  else if (degrees === 2) relationshipDesc = 'Grandparent / Grandchild or Sibling Connection';
  else if (degrees === 3) relationshipDesc = 'Great-Grandparent / First Cousin Lineage';
  else relationshipDesc = `${degrees}th-Degree Ancestral Lineage (Chain of ${pathPersons.length} Individuals)`;

  return {
    relationshipDescription: relationshipDesc,
    degreesOfSeparation: degrees,
    confidenceScore: bestPath.confidence,
    path: pathPersons,
    edges: pathEdges,
    weakestLink,
  };
}

function runLayerDijkstra(
  edgeList: GraphEdge[],
  startId: string,
  targetId: string,
  personMap: Map<string, Person>
): ProofPathOption | null {
  if (startId === targetId) return null;

  const adj = new Map<string, GraphEdge[]>();
  edgeList.forEach((edge) => {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from)!.push(edge);
  });

  const distances = new Map<string, number>();
  const previous = new Map<string, { node: string; edge: GraphEdge }>();
  const visited = new Set<string>();
  const unvisited = new Set<string>();

  personMap.forEach((_, id) => {
    distances.set(id, Infinity);
    unvisited.add(id);
  });

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach((node) => {
      const dist = distances.get(node) ?? Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        current = node;
      }
    });

    if (!current || minDistance === Infinity || current === targetId) {
      break;
    }

    unvisited.delete(current);
    visited.add(current);

    const neighbors = adj.get(current) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const alt = (distances.get(current) ?? 0) + edge.weight;
      if (alt < (distances.get(edge.to) ?? Infinity)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, { node: current, edge });
      }
    }
  }

  if (!previous.has(targetId) && distances.get(targetId) === Infinity) {
    return null;
  }

  const path: string[] = [];
  const edgeTypes: string[] = [];
  let totalWeight = 0;
  let totalConfidence = 0;
  let totalEvidence = 0;
  let curr: string | undefined = targetId;

  while (curr && curr !== startId) {
    path.unshift(curr);
    const step = previous.get(curr);
    if (!step) break;
    edgeTypes.unshift(step.edge.edgeType);
    totalWeight += step.edge.weight;
    totalConfidence += step.edge.confidence;
    totalEvidence += step.edge.evidenceCount;
    curr = step.node;
  }

  path.unshift(startId);

  const stepCount = path.length - 1;
  const avgConfidence = stepCount > 0 ? totalConfidence / stepCount : 1.0;

  const names = path.map((id) => personMap.get(id)?.firstName || id);
  const summary = names.join(' ➔ ');

  return {
    layer: edgeList[0]?.layer || 'accepted',
    path,
    edgeTypes,
    weight: totalWeight,
    confidence: avgConfidence,
    evidenceCount: totalEvidence,
    summary,
  };
}
