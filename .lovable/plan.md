# Forma — AI Org Design Canvas

A Linear-styled React app for uploading an org CSV, visualising it as an interactive tree, and collaborating with an AI agent that proposes structural changes the user approves.

## Stack

- TanStack Start (existing template) + Tailwind v4
- React Flow for the canvas (better drag/drop + pan/zoom than D3 for this use case)
- PapaParse for CSV
- Lovable Cloud + Lovable AI Gateway (`google/gemini-3-flash-preview` default, structured output via tool calling) — proposals returned as JSON, conversational text streamed
- Zustand for org/proposal state (lightweight, fits the canvas-heavy interactions)

## Design system

Override `src/styles.css` tokens to Linear-inspired palette:
- bg `#0A0A0A`, surface `#111111`, border `#1F1F1F`
- foreground `#EDEDED`, muted `#6B6B6B`
- primary (accent) `#5E6AD2`, destructive `#E5484D`, success `#30A46C`
- radius `6px`, base font 13px, Inter via Google Fonts, 120ms transitions
- No gradients/shadows/blur

## Layout

Single route `/` with fixed three-column + top/bottom bars:

```text
┌─ TopBar: logo · filename · Upload · stats row ────────────┐
├─ AgentPanel(320) ─┬─ Canvas ─┬─ NodeDetail(280, optional)─┤
│                   │          │                            │
└─ ChatBar (full width, fixed bottom) ───────────────────────┘
```

NodeDetail slides in only when a node is selected.

## Data model & store

```ts
interface OrgNode {
  id; name; manager: string|null; title; department;
  grade?; location?; salary?; span?; depth?;
}
interface Proposal {
  id; summary; reasoning; impact;
  ops: Op[];               // structured edits the AI proposes
  affectedNodeIds: string[];
  status: 'pending'|'accepted'|'rejected';
}
type Op =
  | { type:'reparent'; nodeId; newManagerId }
  | { type:'create'; node: OrgNode }
  | { type:'delete'; nodeId }
  | { type:'update'; nodeId; patch: Partial<OrgNode> };
```

Store: `nodes`, `proposals`, `changeLog`, `rejectedSignatures` (so AI doesn't re-propose dismissed ideas this session), `selectedNodeId`.

Derived: `span`, `depth`, layer count, span violations (<3 or >10) — recomputed on every mutation.

## Components

- `TopBar` — logo, filename, Upload button, live stats (headcount, layers, avg span, violations, pending proposals)
- `EmptyDropZone` — dashed border, drop/click upload, sample CSV download (bundled string)
- `Canvas` — React Flow with custom `OrgNodeCard` (name, title, dept pill, span badge red if violation, AI border + badge when in a pending proposal). Drag-to-reparent with red ghost line for circular/over-15 cases. Auto-layout via `dagre` top-down on every mutation; animate position changes.
- `AgentPanel`
  - ProposalQueue: cards with Accept/Reject/Modify (Modify expands an inline textarea)
  - ChangeLog: collapsible chronological list
  - Empty state copy when queue is clear
- `NodeDetail` — properties (inline editable on click → blur saves), computed span/depth, clickable direct reports list, "Ask AI about this node" button that prefills chat
- `ChatBar` — textarea, Enter send / Shift+Enter newline, typing indicator routed into AgentPanel

## AI integration

Two server functions (TanStack `createServerFn`, calling Lovable AI Gateway with `LOVABLE_API_KEY`):

1. `analyzeOrg({ nodes, rejectedSignatures })` — system prompt enumerates the proposal categories from the spec (span violations, ghost managers, single points of failure, title/grade inconsistencies, duplicate roles, split/flatten opportunities, salary concentration). Returns via tool-calling:
   ```json
   { "proposals": [{ "summary","reasoning","impact","ops":[...] }] }
   ```
2. `chatInstruction({ nodes, history, userMessage, rejectedSignatures })` — returns:
   ```json
   { "ack": "short conversational reply",
     "clarifyingQuestion": null | "string",
     "risk": null | "string",
     "proposals": [...] }
   ```
   Hard rule enforced in prompt + client: AI only proposes; client applies ops only on Accept.

Triggers:
- After CSV parse → `analyzeOrg`
- After each Accept → lightweight re-analysis on changed subtree
- On chat send → `chatInstruction`

## Interactions

- CSV upload: parse → render tree → fire analysis (target <2s perceived; show skeleton in proposal queue)
- Drag/drop reparent: optimistic update, recompute spans/depths, dagre relayout with React Flow position transition
- Accept proposal: apply `ops` to store, animate via React Flow node transitions, push to changeLog, re-analyze
- Reject: store a stable signature (sorted op JSON) in `rejectedSignatures`, send back to AI on next call
- Inline edit in NodeDetail: blur → store update → stats refresh

## Files to add

```text
src/routes/index.tsx                         # replaces placeholder
src/components/forma/TopBar.tsx
src/components/forma/EmptyDropZone.tsx
src/components/forma/Canvas.tsx
src/components/forma/OrgNodeCard.tsx
src/components/forma/AgentPanel.tsx
src/components/forma/ProposalCard.tsx
src/components/forma/ChangeLog.tsx
src/components/forma/NodeDetail.tsx
src/components/forma/ChatBar.tsx
src/lib/forma/store.ts                       # zustand
src/lib/forma/csv.ts                         # parse + sample
src/lib/forma/layout.ts                      # dagre layout
src/lib/forma/org.ts                         # span/depth/violations/ops apply
src/lib/forma/ai.functions.ts                # analyzeOrg, chatInstruction
src/styles.css                               # tokens overridden
```

## Out of scope (per spec)

Auth, persistence/scenarios, HRIS, sharing/export, mobile.

## Verification

After build: upload sample CSV, confirm tree renders, drag a node to reparent, accept a proposal and watch animation, send a chat instruction, edit a node inline.
