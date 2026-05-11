import { useState } from "react";
import { useForma } from "@/lib/forma/store";
import { ProposalCard } from "./ProposalCard";
import { ChangeLog } from "./ChangeLog";

type Tab = "proposals" | "chat";

export function AgentPanel() {
  const { proposals, aiThinking, chat, nodes } = useForma();
  const [tab, setTab] = useState<Tab>("proposals");

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-border bg-surface">
      {aiThinking && (
        <div className="flex h-9 shrink-0 items-center justify-end border-b border-border px-3">
          <span className="flex items-center gap-1 text-[11px] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Thinking
          </span>
        </div>
      )}

      <div className="flex shrink-0 border-b border-border">
        <TabButton active={tab === "proposals"} onClick={() => setTab("proposals")}>
          Proposals
          {proposals.length > 0 && (
            <span className="ml-1.5 rounded-[4px] bg-surface-2 px-1 py-px text-[10px] tabular-nums text-muted-foreground">
              {proposals.length}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
          Chat
          {chat.length > 0 && (
            <span className="ml-1.5 rounded-[4px] bg-surface-2 px-1 py-px text-[10px] tabular-nums text-muted-foreground">
              {chat.length}
            </span>
          )}
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "proposals" && (
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
        )}

        {tab === "chat" && <ChatTab />}
      </div>

      <ChangeLog />
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 border-b-2 px-3 py-2 text-[12px] font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ChatTab() {
  const { chat, proposals } = useForma();
  const proposalsBySource = proposals.filter((p) => p.source === "user");

  if (chat.length === 0) {
    return (
      <div className="p-3">
        <p className="text-[12px] text-muted-foreground">
          No conversation yet. Use the chat bar below to ask the AI agent anything.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {chat.map((m) => (
        <div key={m.id} className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {m.role === "user" ? "You" : "Forma"}
          </span>
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
            {m.content}
          </p>
        </div>
      ))}
      {proposalsBySource.length > 0 && (
        <div className="mt-2 border-t border-border pt-3">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Proposals from chat
          </span>
          <div className="flex flex-col gap-2">
            {proposalsBySource.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
