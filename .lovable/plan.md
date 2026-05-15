## Goal

Make proposal cards clickable. When clicked, the canvas zooms into and highlights the affected nodes.

## Changes

**1. `src/lib/forma/store.ts`**
- Add `focusedProposalId: string | null` and `focusProposal(id: string | null)` action.
- Clear `focusedProposalId` automatically when proposals change or canvas pane is clicked.

**2. `src/components/forma/ProposalCard.tsx`**
- Wrap card body in a clickable region (button/div with `onClick`) that calls `focusProposal(proposal.id)`.
- Stop propagation on Accept/Reject/Modify buttons and the modify textarea so they don't re-trigger focus.
- Add a "focused" visual state (primary border + subtle ring) when `focusedProposalId === proposal.id`.
- Add hover affordance (cursor-pointer, hover bg).

**3. `src/components/forma/Canvas.tsx`**
- Read `focusedProposalId` and `proposals` from the store.
- When `focusedProposalId` changes, compute the set of affected node IDs from that proposal and call `reactFlowInstance.fitView({ nodes: [...], padding: 0.4, duration: 600 })` to smoothly zoom in.
- Pass a new `isFocused` flag to nodes whose IDs are in the focused proposal's `affectedNodeIds`, in addition to the existing `isAiTarget`.
- Clear focus on `onPaneClick`.

**4. `src/components/forma/OrgNodeCard.tsx`**
- Accept `isFocused` in `OrgNodeData`.
- When `isFocused`, render a stronger highlight: thicker primary border + ring/glow (using existing tokens, e.g. `ring-2 ring-primary`), overriding the default border.
- Non-focused nodes during a focus session get a slightly dimmed look (e.g. `opacity-60`) so the focused subset stands out. Only apply dimming when *some* proposal is focused.

## Behavior details

- Clicking a different proposal re-focuses and re-zooms.
- Clicking the focused proposal again (or clicking the canvas background) clears focus and restores full opacity. No auto fitView-out — user can use existing controls.
- Accept/Reject of the focused proposal clears focus.
- Affected nodes: use `proposal.affectedNodeIds` (already on the type and already used to mark `isAiTarget`).

## Out of scope

- No new data on proposals.
- No keyboard navigation between proposals.
- No animation beyond the built-in `fitView` duration.
