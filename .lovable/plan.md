## What's happening

The reported symptom: focusing a proposal card (clicking it) and then clicking **Accept** leaves the card visible in the list, instead of removing it.

## Most likely root cause

In `src/lib/forma/store.ts`, `acceptProposal` does two `set()` calls back-to-back:

1. `forkIfBase()` calls `set({ scenarios, activeScenarioId: newForkId, ...mirror(...) })`. At this point the active scenario switches to the new fork. The fork's `proposals` array is a **shallow copy of base.proposals** (`[...base.proposals]`) — the proposal objects themselves are shared references with identical ids.
2. The following `set((state) => ({ ...updateActive(state, s => ({ proposals: s.proposals.filter(x => x.id !== id), ... })) }))` filters the proposal out of the fork.

This *should* work — and on inspection it does for a non-focused Accept. The fact that it only misbehaves when the card was focused first strongly suggests the bug is in the **focused-card click path**, not the store filter:

- The card's outer `<div onClick={() => focusProposal(isFocused ? null : proposal.id)}>` is still active when focused.
- The Accept button calls `stop(e); acceptProposal(...)`. `stop` is `e.stopPropagation()`, which prevents the *parent* `<div>`'s onClick from firing for that same event — that part is fine.
- BUT: `acceptProposal` runs `forkIfBase()` which calls `set` synchronously. That triggers a React state update. During the same event tick, if anything (e.g. a re-render that re-focuses, a stale closure capturing the pre-fork proposal id, or a focus-driven effect) re-adds the proposal id to `focusedProposalId`, the card stays mounted.

The smoking gun is that `updateActive` patches the fork's proposals, but the **base scenario still keeps the original proposal** (copied by reference). If anything causes the active scenario to revert to base between the fork and the filter (e.g. an extra click bubbling, or selection state side-effects), the user sees base's still-intact proposals — making it look like Accept did nothing.

## Plan

1. **Reproduce in the browser** with the dev preview: upload a CSV, generate proposals, focus the top one, click Accept. Open the React/zustand devtools and inspect `scenarios`, `activeScenarioId`, `proposals` after the click to confirm exactly which scenario's proposals are being rendered.

2. **Fix in `src/lib/forma/store.ts` only.** Two targeted changes:
   - In `acceptProposal`, **find the proposal `p` before `forkIfBase()`** (capture from base), and pass it through explicitly. This guarantees we never lose the proposal across the fork boundary and avoids the second `get()` call being sensitive to fork timing.
   - In `acceptProposal`, clear `focusedProposalId` and `selectedNodeId` unconditionally as part of the same `set` call (not the conditional `=== id ? null : ...`), so any stale focus from the pre-fork click can't leave the card looking like it's still there.

   Concretely the action becomes:
   ```ts
   acceptProposal: (id) => {
     const p = get().proposals.find((x) => x.id === id);
     if (!p) return;
     forkIfBase();
     set((state) => ({
       focusedProposalId: null,
       ...updateActive(state, (s) => {
         const result = applyOpsToScenario(s.positions, s.persons, s.assignments, p.ops);
         return {
           ...result,
           proposals: s.proposals.filter((x) => x.id !== id),
           changeLog: [
             { id: crypto.randomUUID(), ts: Date.now(), action: p.summary, initiator: p.source, status: "accepted" },
             ...s.changeLog,
           ],
         };
       }),
     }));
   },
   ```

   Same shape for `rejectProposal` (clear `focusedProposalId` unconditionally) so the focused-then-reject path can't desync either.

3. **Verify** in the preview: focus the top proposal, click Accept — card disappears, changelog gets an entry, a new scenario tab appears (auto-fork). Repeat with a non-focused Accept and with Reject.

## Files touched

- `src/lib/forma/store.ts` only (per the existing constraint that this behaviour lives in the store).

No UI or component files change.
