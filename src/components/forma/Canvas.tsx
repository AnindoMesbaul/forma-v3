import { useMemo, useCallback, useState, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeDragHandler,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { useForma } from "@/lib/forma/store";
import { layoutTree, NODE_SIZE } from "@/lib/forma/layout";
import { OrgNodeCard, type OrgNodeData } from "./OrgNodeCard";
import { isDescendant } from "@/lib/forma/org";

const nodeTypes = { org: OrgNodeCard };

function CanvasInner() {
  const { nodes, proposals, selectedNodeId, selectNode, reparent, focusedProposalId, focusProposal } = useForma();
  const { getNodes, fitView } = useReactFlow();
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [invalidDrop, setInvalidDrop] = useState(false);

  const aiTargetIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of proposals) for (const id of p.affectedNodeIds) s.add(id);
    return s;
  }, [proposals]);

  const focusedIds = useMemo(() => {
    const p = proposals.find((x) => x.id === focusedProposalId);
    return new Set(p?.affectedNodeIds ?? []);
  }, [proposals, focusedProposalId]);

  const positions = useMemo(() => layoutTree(nodes), [nodes]);

  useEffect(() => {
    if (focusedIds.size === 0) return;
    const ids = Array.from(focusedIds);
    const nodesToFocus = ids.map((id) => ({ id }));
    const t = setTimeout(() => {
      fitView({ nodes: nodesToFocus, padding: 0.4, duration: 600, maxZoom: 1.2 });
    }, 50);
    return () => clearTimeout(t);
  }, [focusedIds, fitView]);

  const rfNodes: Node<OrgNodeData>[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: "org",
        position: positions[n.id] ?? { x: 0, y: 0 },
        data: {
          name: n.name,
          title: n.title,
          department: n.department,
          span: n.span ?? 0,
          isAiTarget: aiTargetIds.has(n.id),
          isSelected: selectedNodeId === n.id,
          isFocused: focusedIds.has(n.id),
          isDimmed: focusedIds.size > 0 && !focusedIds.has(n.id),
          isVacant: n.isVacant,
          status: n.status,
        },
        draggable: true,
      })),
    [nodes, positions, aiTargetIds, selectedNodeId, focusedIds],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      nodes
        .filter((n) => n.manager)
        .map((n) => ({
          id: `${n.manager}->${n.id}`,
          source: n.manager!,
          target: n.id,
          type: "smoothstep",
          style: { stroke: invalidDrop && (n.id === draggingId || n.manager === draggingId) ? "var(--color-destructive)" : undefined },
        })),
    [nodes, invalidDrop, draggingId],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => selectNode(node.id),
    [selectNode],
  );

  const findTargetUnder = useCallback(
    (x: number, y: number, exclude: string): string | null => {
      const all = getNodes();
      for (const n of all) {
        if (n.id === exclude) continue;
        const px = n.position.x;
        const py = n.position.y;
        if (
          x >= px &&
          x <= px + NODE_SIZE.width &&
          y >= py &&
          y <= py + NODE_SIZE.height
        ) {
          return n.id;
        }
      }
      return null;
    },
    [getNodes],
  );

  const onNodeDragStart: NodeDragHandler = useCallback((_, node) => {
    setDraggingId(node.id);
  }, []);

  const onNodeDrag: NodeDragHandler = useCallback(
    (_, node) => {
      const tgt = findTargetUnder(
        node.position.x + NODE_SIZE.width / 2,
        node.position.y + NODE_SIZE.height / 2,
        node.id,
      );
      setHoverTargetId(tgt);
      if (tgt) {
        const wouldCycle = isDescendant(nodes, node.id, tgt);
        const target = nodes.find((n) => n.id === tgt);
        const overload = target && (target.span ?? 0) >= 15;
        setInvalidDrop(Boolean(wouldCycle || overload));
      } else {
        setInvalidDrop(false);
      }
    },
    [findTargetUnder, nodes],
  );

  const onNodeDragStop: NodeDragHandler = useCallback(
    (_, node) => {
      const tgt = hoverTargetId;
      setHoverTargetId(null);
      setDraggingId(null);
      const invalid = invalidDrop;
      setInvalidDrop(false);
      if (tgt && !invalid) {
        reparent(node.id, tgt);
      } else {
        // reset positions by triggering rerender
        useForma.setState((s) => ({ ...s }));
      }
    },
    [hoverTargetId, invalidDrop, reparent],
  );

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onPaneClick={() => { selectNode(null); focusProposal(null); }}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={1.5}
    >
      <Background color="var(--color-border)" gap={24} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export function Canvas() {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}

