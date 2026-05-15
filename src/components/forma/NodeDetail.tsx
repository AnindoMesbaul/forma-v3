import { useState } from "react";
import { useForma } from "@/lib/forma/store";
import { getChildren } from "@/lib/forma/org";
import { formatCost } from "@/lib/forma/org";
import type { OrgNode } from "@/lib/forma/types";

function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (editing) {
    return (
      <div className="flex items-center justify-between gap-2 py-1">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            onSave(val);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setVal(value);
              setEditing(false);
            }
          }}
          className="w-32 rounded-[4px] border border-primary bg-background px-1.5 py-0.5 text-right text-[12px] outline-none"
        />
      </div>
    );
  }
  return (
    <button
      onClick={() => {
        setVal(value);
        setEditing(true);
      }}
      className="flex w-full items-center justify-between gap-2 py-1 text-left hover:bg-surface-2"
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-[12px] text-foreground">{value || "—"}</span>
    </button>
  );
}

export function NodeDetail({ node }: { node: OrgNode }) {
  const { nodes, updateNode, selectNode, setPrefill } = useForma();
  const reports = getChildren(nodes, node.id);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Node
        </span>
        <button
          onClick={() => selectNode(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <h2 className="text-[15px] font-semibold text-foreground">{node.name}</h2>
        <p className="text-[12px] text-muted-foreground">{node.title}</p>

        <div className="mt-3 flex flex-col divide-y divide-border border-y border-border">
          <EditableField
            label="Title"
            value={node.title}
            onSave={(v) => updateNode(node.id, { title: v })}
          />
          <EditableField
            label="Department"
            value={node.department}
            onSave={(v) => updateNode(node.id, { department: v })}
          />
          {node.grade !== undefined && (
            <EditableField
              label="Grade"
              value={node.grade ?? ""}
              onSave={(v) => updateNode(node.id, { grade: v })}
            />
          )}
          {node.location !== undefined && (
            <EditableField
              label="Location"
              value={node.location ?? ""}
              onSave={(v) => updateNode(node.id, { location: v })}
            />
          )}
          {node.salary !== undefined && (
            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Salary
              </span>
              <span className="text-[12px] tabular-nums text-foreground">
                ${node.salary.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Team cost
            </span>
            <span
              className="text-[12px] tabular-nums text-foreground"
              title="Total cost of this team (incl. reports)"
            >
              {formatCost(node.subtreeCost ?? 0)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Span
            </span>
            <span className="text-[12px] tabular-nums text-foreground">
              {node.span ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Depth
            </span>
            <span className="text-[12px] tabular-nums text-foreground">
              {node.depth ?? 0}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Direct reports · {reports.length}
          </div>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {reports.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => selectNode(r.id)}
                  className="flex w-full items-center justify-between rounded-[4px] px-1.5 py-1 text-left text-[12px] hover:bg-surface-2"
                >
                  <span className="truncate text-foreground">{r.name}</span>
                  <span className="text-muted-foreground">{r.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() =>
            setPrefill(`What do you think about ${node.name}'s position in the org?`)
          }
          className="mt-4 w-full rounded-[6px] border border-border-strong bg-surface-2 px-2 py-1.5 text-[12px] font-medium text-foreground hover:bg-secondary"
        >
          Ask AI about this node
        </button>
      </div>
    </aside>
  );
}
