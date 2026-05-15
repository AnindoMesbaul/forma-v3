import { useState } from "react";
import { useForma } from "@/lib/forma/store";
import type { Proposal } from "@/lib/forma/types";
import { sendChat } from "./ai-runner";

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { acceptProposal, rejectProposal, focusProposal, focusedProposalId } = useForma();
  const [showModify, setShowModify] = useState(false);
  const [modifyText, setModifyText] = useState("");
  const isFocused = focusedProposalId === proposal.id;

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  return (
    <div
      onClick={() => focusProposal(isFocused ? null : proposal.id)}
      className={`cursor-pointer rounded-[6px] border bg-surface p-3 shadow-[var(--shadow-panel)] transition-colors hover:bg-surface-2 ${
        isFocused ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
    >
      <div className="flex items-start gap-2">
        {proposal.source === "ai" && (
          <span className="mt-px rounded-[4px] bg-primary/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-primary">
            AI
          </span>
        )}
        <div className="text-sm font-medium leading-snug text-foreground">
          {proposal.summary}
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {proposal.reasoning}
      </p>
      {proposal.impact && (
        <div className="mt-2 rounded-[4px] bg-surface-2 px-2 py-1 text-xs tabular-nums text-foreground">
          {proposal.impact}
        </div>
      )}

      {showModify ? (
        <div className="mt-2.5 flex flex-col gap-2" onClick={stop}>
          <textarea
            value={modifyText}
            onChange={(e) => setModifyText(e.target.value)}
            onClick={stop}
            placeholder="How should this proposal change?"
            className="resize-none rounded-[6px] border border-border bg-background p-2 text-sm outline-none focus:border-primary"
            rows={2}
          />
          <div className="flex gap-1.5">
            <button
              onClick={(e) => {
                stop(e);
                if (modifyText.trim()) {
                  rejectProposal(proposal.id);
                  sendChat(`Refine this proposal "${proposal.summary}": ${modifyText}`);
                }
                setShowModify(false);
                setModifyText("");
              }}
              className="min-h-8 rounded-[6px] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Send
            </button>
            <button
              onClick={(e) => { stop(e); setShowModify(false); }}
              className="min-h-8 rounded-[6px] border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-1.5">
          <button
            onClick={(e) => { stop(e); acceptProposal(proposal.id); }}
            className="min-h-8 rounded-[6px] bg-success px-3 py-1.5 text-sm font-medium text-success-foreground hover:opacity-90"
          >
            Accept
          </button>
          <button
            onClick={(e) => { stop(e); rejectProposal(proposal.id); }}
            className="min-h-8 rounded-[6px] bg-destructive/15 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/25"
          >
            Reject
          </button>
          <button
            onClick={(e) => { stop(e); setShowModify(true); }}
            className="min-h-8 rounded-[6px] border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-2"
          >
            Modify
          </button>
        </div>
      )}
    </div>
  );
}
