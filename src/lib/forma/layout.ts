import dagre from "dagre";
import type { OrgNode } from "./types";

const NODE_W = 220;
const NODE_H = 78;

export function layoutTree(nodes: OrgNode[]): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 28, ranksep: 64, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const n of nodes) {
    if (n.manager && nodes.find((m) => m.id === n.manager)) {
      g.setEdge(n.manager, n.id);
    }
  }
  dagre.layout(g);
  const out: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    const p = g.node(n.id);
    if (p) out[n.id] = { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 };
  }
  return out;
}

export const NODE_SIZE = { width: NODE_W, height: NODE_H };
