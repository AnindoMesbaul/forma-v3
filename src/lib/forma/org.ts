import type { OrgNode, Op, Position, Person, Assignment, PositionView } from "./types";

export function buildPositionViews(
  positions: Position[],
  persons: Person[],
  assignments: Assignment[],
): PositionView[] {
  const personById = new Map(persons.map((p) => [p.id, p]));
  const assignByPosId = new Map(assignments.map((a) => [a.positionId, a]));
  const byId = new Map<string, PositionView>();
  for (const pos of positions) {
    const assign = assignByPosId.get(pos.id);
    const person = assign?.personId ? personById.get(assign.personId) : undefined;
    const isVacant = !person;
    byId.set(pos.id, {
      id: pos.id,
      positionId: pos.id,
      name: person?.name ?? "(Vacant)",
      title: pos.title,
      department: pos.department,
      grade: pos.grade,
      location: person?.location,
      salary: person?.actualSalary,
      budgetedSalary: pos.budgetedSalary,
      manager: pos.managerPositionId,
      headcountType: pos.headcountType,
      status: isVacant ? "vacant" : pos.status,
      isVacant,
      personId: assign?.personId ?? null,
      fte: assign?.fte ?? 1,
      span: 0,
      depth: 0,
    });
  }
  for (const v of byId.values()) {
    if (v.manager && byId.has(v.manager)) {
      const parent = byId.get(v.manager)!;
      parent.span = (parent.span ?? 0) + 1;
    }
  }
  const childrenIdx = new Map<string, string[]>();
  for (const v of byId.values()) {
    if (v.manager && byId.has(v.manager)) {
      const arr = childrenIdx.get(v.manager) ?? [];
      arr.push(v.id);
      childrenIdx.set(v.manager, arr);
    }
  }
  const roots = [...byId.values()].filter((v) => !v.manager || !byId.has(v.manager!));
  const queue: { id: string; d: number }[] = roots.map((r) => ({ id: r.id, d: 0 }));
  const seen = new Set<string>();
  while (queue.length) {
    const { id, d } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const v = byId.get(id)!;
    v.depth = d;
    for (const c of childrenIdx.get(id) ?? []) queue.push({ id: c, d: d + 1 });
  }
  return [...byId.values()];
}

export function applyOpsToScenario(
  positions: Position[],
  persons: Person[],
  assignments: Assignment[],
  ops: Op[],
): { positions: Position[]; persons: Person[]; assignments: Assignment[] } {
  let nextPos = positions.map((p) => ({ ...p }));
  let nextPer = persons.map((p) => ({ ...p }));
  let nextAss = assignments.map((a) => ({ ...a }));
  for (const op of ops) {
    // Rebuild the ID set each iteration so creates/deletes are reflected immediately.
    const ids = new Set(nextPos.map((p) => p.id));

    if (op.type === "reparent") {
      // Skip entirely if the node to move doesn't exist.
      if (!ids.has(op.nodeId)) continue;
      // Skip entirely if the target manager ID doesn't exist (null is always valid).
      if (op.newManagerId !== null && !ids.has(op.newManagerId)) continue;
      nextPos = nextPos.map((p) =>
        p.id === op.nodeId ? { ...p, managerPositionId: op.newManagerId } : p,
      );
    } else if (op.type === "update") {
      if (!ids.has(op.nodeId)) continue;
      const patch = op.patch ?? {};
      const posKeys: string[] = ["title", "department", "grade", "status", "headcountType", "budgetedSalary"];
      const perKeys: string[] = ["name", "location", "actualSalary", "notes"];
      if ("manager" in patch) {
        const newMgr = (patch as Record<string, unknown>).manager as string | null;
        // Only apply the manager change if the target actually exists.
        if (newMgr === null || ids.has(newMgr)) {
          nextPos = nextPos.map((p) =>
            p.id === op.nodeId ? { ...p, managerPositionId: newMgr } : p,
          );
        }
      }
      const posPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => posKeys.includes(k)));
      if (Object.keys(posPatch).length) {
        nextPos = nextPos.map((p) => (p.id === op.nodeId ? { ...p, ...posPatch } : p));
      }
      const perPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => perKeys.includes(k)));
      if (Object.keys(perPatch).length) {
        const assign = nextAss.find((a) => a.positionId === op.nodeId);
        if (assign?.personId) {
          nextPer = nextPer.map((p) => (p.id === assign.personId ? { ...p, ...perPatch } : p));
        }
      }
    } else if (op.type === "delete") {
      if (!ids.has(op.nodeId)) continue;
      const target = nextPos.find((p) => p.id === op.nodeId);
      const rawParent = target?.managerPositionId ?? null;
      // Only preserve the parent link if the parent itself still exists.
      const validParent = rawParent !== null && ids.has(rawParent) ? rawParent : null;
      nextPos = nextPos
        .filter((p) => p.id !== op.nodeId)
        .map((p) =>
          p.managerPositionId === op.nodeId ? { ...p, managerPositionId: validParent } : p,
        );
      nextAss = nextAss.filter((a) => a.positionId !== op.nodeId);
    } else if (op.type === "create") {
      const node = op.node;
      if (!nextPos.find((p) => p.id === node.id)) {
        // If the AI gave a manager ID that doesn't exist, place at root rather than floating.
        const resolvedManager =
          node.manager !== null && ids.has(node.manager) ? node.manager : null;
        nextPos.push({
          id: node.id,
          title: node.title,
          department: node.department,
          grade: node.grade,
          managerPositionId: resolvedManager,
          budgetedSalary: node.salary,
          headcountType: "FTE",
          status: node.name ? "filled" : "vacant",
        });
        if (node.name) {
          const personId = `person-${node.id}`;
          nextPer.push({ id: personId, name: node.name, location: node.location, actualSalary: node.salary });
          nextAss.push({ id: `assign-${node.id}`, positionId: node.id, personId, fte: 1 });
        } else {
          nextAss.push({ id: `assign-${node.id}`, positionId: node.id, personId: null, fte: 1 });
        }
      }
    }
  }
  return { positions: nextPos, persons: nextPer, assignments: nextAss };
}

export function migrateNodesToCollections(nodes: OrgNode[]): {
  positions: Position[];
  persons: Person[];
  assignments: Assignment[];
} {
  const positions: Position[] = nodes.map((n) => ({
    id: n.id,
    title: n.title,
    department: n.department,
    grade: n.grade,
    managerPositionId: n.manager,
    budgetedSalary: n.salary,
    headcountType: "FTE" as const,
    status: "filled" as const,
  }));
  const persons: Person[] = nodes.map((n) => ({
    id: `person-${n.id}`,
    name: n.name,
    location: n.location,
    actualSalary: n.salary,
  }));
  const assignments: Assignment[] = nodes.map((n) => ({
    id: `assign-${n.id}`,
    positionId: n.id,
    personId: `person-${n.id}`,
    fte: 1,
  }));
  return { positions, persons, assignments };
}

export function computeDerived(nodes: OrgNode[]): OrgNode[] {
  const byId = new Map(nodes.map((n) => [n.id, { ...n, span: 0, depth: 0 }]));
  // span
  for (const n of byId.values()) {
    if (n.manager && byId.has(n.manager)) {
      const p = byId.get(n.manager)!;
      p.span = (p.span ?? 0) + 1;
    }
  }
  // depth (BFS from roots)
  const roots = [...byId.values()].filter((n) => !n.manager || !byId.has(n.manager!));
  const queue: { id: string; d: number }[] = roots.map((r) => ({ id: r.id, d: 0 }));
  const seen = new Set<string>();
  const childrenIdx = new Map<string, string[]>();
  for (const n of byId.values()) {
    if (n.manager && byId.has(n.manager)) {
      const arr = childrenIdx.get(n.manager) ?? [];
      arr.push(n.id);
      childrenIdx.set(n.manager, arr);
    }
  }
  while (queue.length) {
    const { id, d } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = byId.get(id)!;
    n.depth = d;
    for (const c of childrenIdx.get(id) ?? []) queue.push({ id: c, d: d + 1 });
  }
  return [...byId.values()];
}

export function getChildren(nodes: OrgNode[], id: string): OrgNode[] {
  return nodes.filter((n) => n.manager === id);
}

export function isDescendant(
  nodes: OrgNode[],
  ancestorId: string,
  candidateId: string,
): boolean {
  if (ancestorId === candidateId) return true;
  const stack = [ancestorId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of nodes.filter((n) => n.manager === cur)) {
      if (c.id === candidateId) return true;
      stack.push(c.id);
    }
  }
  return false;
}

export function applyOps(nodes: OrgNode[], ops: Op[]): OrgNode[] {
  let next = nodes.map((n) => ({ ...n }));
  for (const op of ops) {
    if (op.type === "reparent") {
      next = next.map((n) =>
        n.id === op.nodeId ? { ...n, manager: op.newManagerId } : n,
      );
    } else if (op.type === "update") {
      next = next.map((n) =>
        n.id === op.nodeId ? { ...n, ...op.patch } : n,
      );
    } else if (op.type === "delete") {
      // reparent children to deleted node's manager
      const target = next.find((n) => n.id === op.nodeId);
      const newParent = target?.manager ?? null;
      next = next
        .filter((n) => n.id !== op.nodeId)
        .map((n) => (n.manager === op.nodeId ? { ...n, manager: newParent } : n));
    } else if (op.type === "create") {
      if (!next.find((n) => n.id === op.node.id)) next.push({ ...op.node });
    }
  }
  return computeDerived(next);
}

export interface OrgStats {
  headcount: number;
  layers: number;
  avgSpan: number;
  spanViolations: number;
}

export function computeStats(nodes: OrgNode[]): OrgStats {
  const headcount = nodes.length;
  const layers = nodes.reduce((m, n) => Math.max(m, (n.depth ?? 0) + 1), 0);
  const managers = nodes.filter((n) => (n.span ?? 0) > 0);
  const avgSpan = managers.length
    ? managers.reduce((s, n) => s + (n.span ?? 0), 0) / managers.length
    : 0;
  const spanViolations = managers.filter(
    (n) => (n.span ?? 0) < 3 || (n.span ?? 0) > 10,
  ).length;
  return { headcount, layers, avgSpan, spanViolations };
}

export function isSpanViolation(span?: number) {
  if (span === undefined || span === 0) return false;
  return span < 3 || span > 10;
}

export function opsSignature(ops: Op[]): string {
  return JSON.stringify(
    ops.map((o) => ({ ...o })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );
}
