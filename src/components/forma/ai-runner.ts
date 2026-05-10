import { useForma } from "@/lib/forma/store";
import { analyzeOrg, chatInstruction } from "@/lib/forma/ai.functions";
import type { Op, Proposal } from "@/lib/forma/types";

interface RawProposal {
  summary: string;
  reasoning: string;
  impact: string;
  affectedNodeIds: string[];
  ops: Op[];
}

function normalizeProposals(raw: RawProposal[], source: "ai" | "user"): Proposal[] {
  return (raw ?? [])
    .filter((p) => p && p.summary && Array.isArray(p.ops) && p.ops.length > 0)
    .map((p) => ({
      id: crypto.randomUUID(),
      summary: p.summary,
      reasoning: p.reasoning ?? "",
      impact: p.impact ?? "",
      affectedNodeIds: p.affectedNodeIds ?? [],
      ops: p.ops,
      source,
      status: "pending" as const,
    }));
}

export async function runAnalysis() {
  const { nodes, rejectedSignatures, setThinking, setProposals } = useForma.getState();
  if (!nodes.length) return;
  setThinking(true);
  try {
    const result = await analyzeOrg({ data: { nodes, rejectedSignatures } });
    setProposals(normalizeProposals(result.proposals ?? [], "ai"));
  } catch (e) {
    console.error(e);
  } finally {
    setThinking(false);
  }
}

export async function sendChat(message: string) {
  const state = useForma.getState();
  const { nodes, rejectedSignatures, chat, addChat, setThinking, addProposals } = state;

  addChat({
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    ts: Date.now(),
  });
  setThinking(true);

  try {
    const history = chat.map((m) => ({ role: m.role, content: m.content }));
    const result = await chatInstruction({
      data: { nodes, rejectedSignatures, history, userMessage: message },
    });

    const parts: string[] = [];
    if (result.ack) parts.push(result.ack);
    if (result.clarifyingQuestion) parts.push(`Question: ${result.clarifyingQuestion}`);
    if (result.risk) parts.push(`⚠ ${result.risk}`);
    const reply = parts.join("\n\n") || "Done.";

    addChat({
      id: crypto.randomUUID(),
      role: "assistant",
      content: reply,
      ts: Date.now(),
    });

    if (result.proposals?.length) {
      addProposals(normalizeProposals(result.proposals, "user"));
    }
  } catch (e) {
    console.error(e);
    addChat({
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Something went wrong contacting the AI. Please try again.",
      ts: Date.now(),
    });
  } finally {
    setThinking(false);
  }
}
