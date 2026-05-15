## Goal

Show each node's **cumulative cost** — the sum of its own salary plus all descendants' salaries — on the org node card and in the node detail panel.

## Changes

**1. `src/lib/forma/types.ts`**
- Add `subtreeCost?: number` to `OrgNode` (computed, like `span` and `depth`).

**2. `src/lib/forma/org.ts`**
- In `computeDerived`, after building the children index, do a post-order traversal from roots to compute `subtreeCost = (salary ?? 0) + sum(children.subtreeCost)` for each node.
- Add a small `formatCost(n: number)` helper (e.g. `$1.2M`, `$340K`, `$0`) — used by UI.

**3. `src/components/forma/OrgNodeCard.tsx`**
- Add `subtreeCost: number` to `OrgNodeData`.
- Render the cumulative cost in the card footer row, alongside the existing department chip and span. Format compactly (`$1.2M`).
- Tooltip/aria-label clarifies "Total cost of this team (incl. reports)".

**4. `src/components/forma/Canvas.tsx`**
- Pass `subtreeCost: n.subtreeCost ?? 0` into the node data mapping.

**5. `src/components/forma/NodeDetail.tsx`**
- Add a read-only row "Team cost" showing `formatCost(node.subtreeCost)` right under the existing "Salary" row, so the user sees both individual salary and cumulative subtree cost.

## Behavior

- Updates automatically on every reparent / accept proposal / CSV reload, since `computeDerived` is already called by `applyOps` and `loadCsv`.
- Nodes without any salary data anywhere in the subtree show `$0` (or we can hide it if `subtreeCost === 0` to avoid noise — will hide).
- No changes to AI prompt, proposals, or layout dimensions.

## Out of scope

- No per-level aggregate panel or chart.
- No currency selector or locale formatting beyond compact USD.
- No editing of cost (still derived from `salary`).
