import type { OrgNode, Op } from "./types";

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
  // subtreeCost via post-order DFS from roots
  const computeCost = (id: string): number => {
    const n = byId.get(id)!;
    let sum = n.salary ?? 0;
    for (const c of childrenIdx.get(id) ?? []) sum += computeCost(c);
    n.subtreeCost = sum;
    return sum;
  };
  for (const r of roots) computeCost(r.id);
  return [...byId.values()];
}

export function formatCost(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
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
