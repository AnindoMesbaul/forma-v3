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
      className={`cursor-pointer rounded-[6px] border bg-surface p-3 transition-colors hover:bg-surface-2 ${
        isFocused ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
    >
      <div className="flex items-start gap-2">
        {proposal.source === "ai" && (
          <span className="mt-px rounded-[4px] bg-primary/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
            AI
          </span>
        )}
        <div className="text-[13px] font-medium leading-snug text-foreground">
          {proposal.summary}
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        {proposal.reasoning}
      </p>
      {proposal.impact && (
        <div className="mt-2 rounded-[4px] bg-surface-2 px-2 py-1 text-[11px] tabular-nums text-foreground">
          {proposal.impact}
        </div>
      )}

      {showModify ? (
        <div className="mt-2.5 flex flex-col gap-2">
          <textarea
            value={modifyText}
            onChange={(e) => setModifyText(e.target.value)}
            placeholder="How should this proposal change?"
            className="resize-none rounded-[6px] border border-border bg-background p-2 text-[12px] outline-none focus:border-primary"
            rows={2}
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                if (modifyText.trim()) {
                  rejectProposal(proposal.id);
                  sendChat(`Refine this proposal "${proposal.summary}": ${modifyText}`);
                }
                setShowModify(false);
                setModifyText("");
              }}
              className="rounded-[6px] bg-primary px-2 py-1 text-[12px] font-medium text-primary-foreground hover:opacity-90"
            >
              Send
            </button>
            <button
              onClick={() => setShowModify(false)}
              className="rounded-[6px] border border-border px-2 py-1 text-[12px] text-muted-foreground hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-1.5">
          <button
            onClick={() => acceptProposal(proposal.id)}
            className="rounded-[6px] bg-success px-2.5 py-1 text-[12px] font-medium text-success-foreground hover:opacity-90"
          >
            Accept
          </button>
          <button
            onClick={() => rejectProposal(proposal.id)}
            className="rounded-[6px] bg-destructive/15 px-2.5 py-1 text-[12px] font-medium text-destructive hover:bg-destructive/25"
          >
            Reject
          </button>
          <button
            onClick={() => setShowModify(true)}
            className="rounded-[6px] border border-border px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-surface-2"
          >
            Modify
          </button>
        </div>
      )}
    </div>
  );
}
