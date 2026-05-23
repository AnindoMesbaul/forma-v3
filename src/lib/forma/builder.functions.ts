import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are the Forma Builder Agent. Your job is to read raw data from multiple disparate files and extract a unified, clean list of employees.

Files may include HR exports, salary spreadsheets, org charts, board slides, headcount trackers, or any other document containing people data. They will be messy, inconsistent, and may overlap.

Your task:
1. Extract every unique individual across all files. Deduplicate by name.
2. For each person, determine: full name, job title, seniority level (standardise to a grade like L1-L9, or role tier like IC/Manager/Director/VP/C-Suite if no numeric grade is available), compensation (if present), their manager's name (if determinable), department (if present).
3. Capture any remaining qualitative information about the person in the "notes" field - things like location, recent changes, special context.
4. Set confidence to "high" if the data is clear and consistent across sources, "medium" if inferred or partially present, "low" if uncertain.
5. Set source to the filename where this person was primarily found.

Return ONLY the structured JSON. No commentary.`;

const SCHEMA = {
  type: "object",
  properties: {
    employees: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          seniority: { type: "string" },
          compensation: { type: ["number", "null"] },
          manager: { type: ["string", "null"] },
          department: { type: ["string", "null"] },
          notes: { type: "string" },
          source: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["name", "title", "seniority", "notes", "source", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["employees"],
  additionalProperties: false,
};

export const buildOrgFromFiles = createServerFn({ method: "POST" })
  .inputValidator((data: { files: { name: string; content: string }[] }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Extract a unified employee list from these files.\n\n${data.files
      .map(
        (f) =>
          `=== FILE: ${f.name} ===\n${f.content.slice(0, 30000)}`,
      )
      .join("\n\n")}`;

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
              name: "submit_employees",
              description: "Return the unified employee list.",
              parameters: SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_employees" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("Builder AI error", res.status, t);
      return { employees: [], error: res.status === 402 ? "AI credits exhausted." : res.status === 429 ? "Rate limited. Try again shortly." : "Builder request failed." };
    }

    const json = await res.json();
    const tc = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return { employees: [] };
    try {
      const parsed = JSON.parse(tc.function.arguments);
      return { employees: parsed.employees ?? [] };
    } catch (e) {
      console.error("Failed to parse builder args", e);
      return { employees: [] };
    }
  });