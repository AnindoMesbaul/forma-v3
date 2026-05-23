import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are the Forma Recommender Agent. You are given a newly structured organisation that has just been assembled from raw data. Your job is to recommend how this org should be designed - not just flag issues, but propose a concrete target structure.

Think like a management consultant doing an org design engagement:
- Identify the right spans of control for each management layer (target 4-8 for most managers, narrower for senior leaders)
- Recommend where to create new management layers if teams are too flat
- Recommend where to flatten if there are too many layers
- Identify logical team groupings that should report together
- Flag any grade inversions or title inconsistencies
- Suggest a clean job architecture if titles are inconsistent

Return up to 8 high-value proposals. Each proposal should be a concrete, implementable change - not a general observation. Use existing node IDs verbatim in operations. For "create" ops, generate a kebab-case id from the new person's name.`;

const PROPOSAL_SCHEMA = {
  type: "object",
  properties: {
    proposals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          summary: { type: "string" },
          reasoning: { type: "string" },
          impact: { type: "string" },
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
  required: ["proposals"],
  additionalProperties: false,
};

export const recommendOrgStructure = createServerFn({ method: "POST" })
  .inputValidator((data: { nodes: unknown }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Recommend the target org design for this newly structured organisation.\n\nORG_NODES:\n${JSON.stringify(data.nodes)}`;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_recommendations",
              description: "Return prescriptive org design proposals.",
              parameters: PROPOSAL_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_recommendations" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("Recommender AI error", res.status, t);
      return { proposals: [] };
    }

    const json = await res.json();
    const tc = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return { proposals: [] };
    try {
      const parsed = JSON.parse(tc.function.arguments);
      return { proposals: parsed.proposals ?? [] };
    } catch (e) {
      console.error("Failed to parse recommender args", e);
      return { proposals: [] };
    }
  });