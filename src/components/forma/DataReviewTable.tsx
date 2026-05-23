import { useState } from "react";
import { useForma } from "@/lib/forma/store";
import { recommendOrgStructure } from "@/lib/forma/recommender.functions";
import type { EmployeeRecord, OrgNode, Op, Proposal } from "@/lib/forma/types";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || crypto.randomUUID()
  );
}

function formatCurrency(n?: number): string {
  if (typeof n !== "number" || isNaN(n)) return "";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function normalizeProposals(raw: any[]): Proposal[] {
  return (raw ?? [])
    .filter((p) => p && p.summary && Array.isArray(p.ops) && p.ops.length > 0)
    .map((p) => ({
      id: crypto.randomUUID(),
      summary: p.summary,
      reasoning: p.reasoning ?? "",
      impact: p.impact ?? "",
      affectedNodeIds: p.affectedNodeIds ?? [],
      ops: p.ops as Op[],
      source: "ai" as const,
      status: "pending" as const,
    }));
}

interface CellProps {
  value: string;
  onSave: (v: string) => void;
  type?: "text" | "number";
  readOnly?: boolean;
  placeholder?: string;
}

function EditableCell({ value, onSave, type = "text", readOnly, placeholder = "—" }: CellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (readOnly) {
    return (
      <div className="px-2 py-1.5 text-[12px] text-slate truncate">{value || placeholder}</div>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onSave(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(draft);
            setEditing(false);
          } else if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-sage-core bg-white px-2 py-1 text-[13px] text-ink outline-none"
      />
    );
  }

  const isEmpty = !value;
  return (
    <div
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`cursor-text px-2 py-1.5 text-[13px] text-ink truncate ${
        isEmpty ? "rounded border border-dashed border-chalk text-muted-foreground" : ""
      }`}
    >
      {value || placeholder}
    </div>
  );
}

function ConfidenceBadge({ c }: { c: "high" | "medium" | "low" }) {
  const cls =
    c === "high"
      ? "bg-healthy-bg text-sage-deep"
      : c === "medium"
        ? "bg-amber-glow text-amber-accent"
        : "bg-violation-bg text-destructive";
  const label = c === "high" ? "High" : c === "medium" ? "Med" : "Low";
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>
  );
}

export function DataReviewTable() {
  const {
    employeeRecords,
    setEmployeeRecords,
    updateEmployeeRecord,
    loadCsv,
    setProposals,
  } = useForma();
  const [structuring, setStructuring] = useState(false);

  const addRow = () => {
    setEmployeeRecords([
      ...employeeRecords,
      {
        id: crypto.randomUUID(),
        name: "",
        title: "",
        seniority: "",
        compensation: undefined,
        manager: "",
        department: "",
        notes: "",
        source: "manual",
        confidence: "high",
      },
    ]);
  };

  const structureOrg = async () => {
    setStructuring(true);
    try {
      const slugByName = new Map<string, string>();
      const used = new Set<string>();
      for (const r of employeeRecords) {
        if (!r.name.trim()) continue;
        let base = slugify(r.name);
        let id = base;
        let n = 1;
        while (used.has(id)) id = `${base}-${++n}`;
        used.add(id);
        slugByName.set(r.name.trim().toLowerCase(), id);
      }
      const nodes: OrgNode[] = employeeRecords
        .filter((r) => r.name.trim())
        .map((r) => ({
          id: slugByName.get(r.name.trim().toLowerCase())!,
          name: r.name,
          manager: r.manager
            ? slugByName.get(r.manager.trim().toLowerCase()) ?? null
            : null,
          title: r.title || "",
          department: r.department || "",
          grade: r.seniority || undefined,
          salary: r.compensation,
        }));

      loadCsv("builder-output", nodes);

      try {
        const result = await recommendOrgStructure({ data: { nodes } });
        setProposals(normalizeProposals(result.proposals ?? []));
      } catch (e) {
        console.error("recommender failed", e);
      }
    } finally {
      setStructuring(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-sage-deep bg-sage-deep px-5 text-white">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 7v10l9 5 9-5V7l-9-5z"
              stroke="#B0DEC9"
              strokeWidth="1.8"
              strokeLinejoin="round"
              fill="rgba(176, 222, 201, 0.15)"
            />
            <path
              d="M12 2v20M3 7l9 5 9-5"
              stroke="#B0DEC9"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-display text-[18px] font-medium tracking-tight">FORMA</span>
        </div>
        <div className="font-display text-[14px] text-white/90">
          Review your org data — {employeeRecords.length} people found
        </div>
        <button
          disabled={structuring || employeeRecords.length === 0}
          onClick={structureOrg}
          className="rounded-[10px] border border-amber-accent bg-amber-accent px-[18px] py-[9px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {structuring ? "Structuring…" : "Structure →"}
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-[12px] border border-chalk bg-white shadow-[var(--shadow-card)]">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-chalk bg-canvas">
              <tr className="text-[11px] uppercase tracking-[0.05em] text-slate">
                <th className="w-[40px] px-2 py-2 font-medium">#</th>
                <th className="w-[180px] px-2 py-2 font-medium">Name</th>
                <th className="w-[200px] px-2 py-2 font-medium">Title</th>
                <th className="w-[100px] px-2 py-2 font-medium">Seniority</th>
                <th className="w-[120px] px-2 py-2 font-medium">Comp</th>
                <th className="w-[160px] px-2 py-2 font-medium">Manager</th>
                <th className="w-[140px] px-2 py-2 font-medium">Department</th>
                <th className="px-2 py-2 font-medium">Notes</th>
                <th className="w-[100px] px-2 py-2 font-medium">Source</th>
                <th className="w-[80px] px-2 py-2 font-medium">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {employeeRecords.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-chalk align-top ${
                    r.confidence === "low" ? "bg-amber-glow/30" : ""
                  }`}
                >
                  <td className="px-2 py-1 text-[12px] text-muted-foreground">{i + 1}</td>
                  <td className="px-1 py-1">
                    <EditableCell
                      value={r.name}
                      onSave={(v) => updateEmployeeRecord(r.id, { name: v })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell
                      value={r.title}
                      onSave={(v) => updateEmployeeRecord(r.id, { title: v })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell
                      value={r.seniority}
                      onSave={(v) => updateEmployeeRecord(r.id, { seniority: v })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell
                      type="number"
                      value={r.compensation !== undefined ? String(r.compensation) : ""}
                      onSave={(v) =>
                        updateEmployeeRecord(r.id, {
                          compensation: v === "" ? undefined : Number(v),
                        })
                      }
                      placeholder={formatCurrency(r.compensation) || "—"}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell
                      value={r.manager ?? ""}
                      onSave={(v) => updateEmployeeRecord(r.id, { manager: v })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell
                      value={r.department ?? ""}
                      onSave={(v) => updateEmployeeRecord(r.id, { department: v })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <EditableCell
                      value={r.notes}
                      onSave={(v) => updateEmployeeRecord(r.id, { notes: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-muted-foreground truncate">
                    {r.source}
                  </td>
                  <td className="px-2 py-1.5">
                    <ConfidenceBadge c={r.confidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-chalk px-3 py-2">
            <button
              onClick={addRow}
              className="text-[13px] font-medium text-sage-deep hover:underline"
            >
              + Add person
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}