import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_BASE = `You are Forma, an AI organisational design analyst working alongside a human in an interactive org chart canvas.

HARD RULES:

- You NEVER mutate the org directly. You ONLY return proposals that the human approves.

- Every proposal is a small, scoped change with structured operations.

- Use the supplied node IDs verbatim in operations. Never invent IDs that don't exist (except for "create" ops where you must generate a kebab-case id from the new person/position name).

- If a proposal was previously rejected (its op signature appears in rejectedSignatures), do NOT propose it again.

DATA MODEL:

Each node in ORG_NODES is a PositionView — a merged view of a structural position and the person assigned to it (if any). Fields:

- id / positionId: unique position identifier (use this in all ops)

- title: job title of the position

- department: team or department

- grade: seniority grade (e.g. L4, L7, Director)

- manager: id of the reporting position (null = root)

- span: number of direct reports (derived)

- depth: layer from root, 0-indexed (derived)

- status: "filled" | "vacant" | "proposed"

- isVacant: true if no person is currently assigned to this position

- headcountType: "FTE" | "contractor" | "part-time"

- fte: full-time equivalent (1.0 = full time, 0.5 = half time)

- personId: id of the assigned person (null if vacant)

- name: person's name if filled, "(Vacant)" if isVacant is true

- salary: person's actual salary (may differ from budgetedSalary)

- budgetedSalary: the approved budget for this position

- location: person's location

ANALYSIS CATEGORIES:

- Span of control (target 3–10 direct reports). Flag <3 (ghost / narrow) and >10 (overloaded).

- Excessive layers relative to team size.

- Single points of failure (critical roles with no backup, high depth).

- Title/grade inconsistencies, duplicate roles, grade inversions (manager at lower grade than report).

- Splittable wide teams along functional lines (use department/title hints).

- Vacancy risk: positions where isVacant is true, especially at senior levels or with large spans; positions with status "proposed" that may not yet be approved.

- Budget vs actual: where salary exceeds budgetedSalary, flag the overage. Where budgetedSalary is set but salary is absent, flag as untracked cost.

- FTE risk: positions where fte < 1.0 filling roles that typically require full-time capacity.

- Headcount mix: unusual concentrations of contractors or part-time roles in critical functions.

Return at most 6 proposals per call. Each must be specific, justified, and high-signal. Skip vague suggestions.`;

const PROPOSAL_SCHEMA = {
  type: "object",
  properties: {
    ack: { type: "string", description: "Short conversational acknowledgement (one sentence)." },
    clarifyingQuestion: {
      type: "string",
      description: "If the user instruction is ambiguous, one clarifying question. Empty string otherwise.",
    },
    risk: {
      type: "string",
      description: "If the request carries significant structural risk, describe it. Empty string otherwise.",
    },
    proposals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          summary: { type: "string", description: "One-line action summary." },
          reasoning: { type: "string", description: "2-3 sentence plain-English explanation." },
          impact: { type: "string", description: "Concrete impact, e.g. 'Span: 14 → 7 · Layers unchanged'." },
          affectedNodeIds: { type: "array", items: { type: "string" } },
          ops: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["reparent", "create", "delete", "update"] },
                nodeId: { type: "string" },
                newManagerId: { type: ["string", "null"] },
                node: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    manager: { type: ["string", "null"] },
                    title: { type: "string" },
                    department: { type: "string" },
                    grade: { type: "string" },
                  },
                  required: ["id", "name", "manager", "title", "department"],
                  additionalProperties: false,
                },
                patch: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    title: { type: "string" },
                    department: { type: "string" },
                    grade: { type: "string" },
                    manager: { type: ["string", "null"] },
                  },
                  additionalProperties: false,
                },
              },
              required: ["type"],
              additionalProperties: false,
            },
          },
        },
        required: ["summary", "reasoning", "impact", "affectedNodeIds", "ops"],
        additionalProperties: false,
      },
    },
  },
  required: ["ack", "clarifyingQuestion", "risk", "proposals"],
  additionalProperties: false,
};

async function callAI(systemPrompt: string, userPrompt: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_analysis",
            description: "Return your analysis and proposals.",
            parameters: PROPOSAL_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_analysis" } },
    }),
  });

  if (res.status === 429) {
    return { ack: "", clarifyingQuestion: "", risk: "Rate limit reached. Please wait a moment and try again.", proposals: [] };
  }
  if (res.status === 402) {
    return { ack: "", clarifyingQuestion: "", risk: "AI credits exhausted. Add funds in Settings → Workspace → Usage.", proposals: [] };
  }
  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway error", res.status, t);
    return { ack: "", clarifyingQuestion: "", risk: "AI request failed. Please try again.", proposals: [] };
  }

  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) return { ack: "", clarifyingQuestion: "", risk: "", proposals: [] };
  try {
    const parsed = JSON.parse(tc.function.arguments);
    return parsed;
  } catch (e) {
    console.error("Failed to parse AI tool args", e);
    return { ack: "", clarifyingQuestion: "", risk: "", proposals: [] };
  }
}

export const analyzeOrg = createServerFn({ method: "POST" })
  .inputValidator((data: { nodes: unknown; rejectedSignatures: string[] }) => data)
  .handler(async ({ data }) => {
    const userPrompt = `Analyse this organisation and return your highest-signal proposals.

ORG_NODES:
${JSON.stringify(data.nodes)}

REJECTED_SIGNATURES (do not re-propose these):
${JSON.stringify(data.rejectedSignatures)}`;
    return callAI(SYSTEM_BASE, userPrompt);
  });

export const chatInstruction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      nodes: unknown;
      rejectedSignatures: string[];
      history: { role: string; content: string }[];
      userMessage: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const history = data.history
      .slice(-6)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    const userPrompt = `User instruction: "${data.userMessage}"

Confirm your understanding in "ack". If ambiguous, set "clarifyingQuestion" and return no proposals. If risky, fill "risk". Otherwise return concrete proposals.

CONVERSATION_HISTORY:
${history}

ORG_NODES:
${JSON.stringify(data.nodes)}

REJECTED_SIGNATURES:
${JSON.stringify(data.rejectedSignatures)}`;
    return callAI(SYSTEM_BASE, userPrompt);
  });
