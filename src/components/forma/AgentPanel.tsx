import { useForma } from "@/lib/forma/store";
import { ProposalCard } from "./ProposalCard";
import { ChangeLog } from "./ChangeLog";

export function AgentPanel() {
  const { proposals, aiThinking, chat, nodes } = useForma();

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          AI Agent
        </span>
        {aiThinking && (
          <span className="flex items-center gap-1 text-[11px] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Thinking
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* recent assistant chat reply */}
        {chat.length > 0 && (
          <div className="border-b border-border p-3">
            {chat.slice(-3).map((m) => (
              <div key={m.id} className="mb-1.5 last:mb-0">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {m.role === "user" ? "You" : "Forma"}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 p-3">
          {proposals.length === 0 && nodes.length > 0 && !aiThinking && (
            <p className="text-[12px] text-muted-foreground">
              No issues detected. Type a goal below to explore changes.
            </p>
          )}
          {proposals.length === 0 && aiThinking && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-[6px] border border-border bg-surface-2"
                />
              ))}
            </div>
          )}
          {proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} />
          ))}
        </div>
      </div>

      <ChangeLog />
    </aside>
  );
}
