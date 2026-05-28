import { useState } from "react";
import { useForma } from "@/lib/forma/store";
import type { PositionView } from "@/lib/forma/types";

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
      <div className="flex items-center justify-between gap-2 py-1.5">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
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
          className="w-36 rounded-[4px] border border-primary bg-background px-2 py-1 text-right text-sm outline-none"
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
      className="flex w-full items-center justify-between gap-2 py-1.5 text-left hover:bg-surface-2"
    >
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-sm text-foreground">{value || "—"}</span>
    </button>
  );
}

export function NodeDetail({ node }: { node: PositionView }) {
  const { nodes, updateNode, selectNode, setPrefill } = useForma();
  const reports = nodes.filter((n) => n.manager === node.id);

  return (
    <aside className="flex h-full w-[304px] shrink-0 flex-col border-l border-chalk bg-canvas">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-chalk px-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate">
          Node
        </span>
        <button
          onClick={() => selectNode(null)}
          className="text-base text-slate hover:text-ink"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <h2 className="font-display text-[20px] font-light leading-tight text-ink">{node.name}</h2>
        <p className="text-sm text-slate">{node.title}</p>
        {node.isVacant && (
          <span className="mt-1 inline-block rounded-[4px] bg-chalk px-2 py-px text-[11px] font-medium uppercase tracking-wide text-slate">
            Vacant
          </span>
        )}
        {node.status === "proposed" && (
          <span className="mt-1 inline-block rounded-[4px] bg-borderline-bg px-2 py-px text-[11px] font-medium uppercase tracking-wide text-borderline">
            Proposed
          </span>
        )}

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
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Type</span>
            <span className="text-sm text-foreground">{node.headcountType}</span>
          </div>
          {node.fte !== 1 && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">FTE</span>
              <span className="text-sm tabular-nums text-foreground">{node.fte}</span>
            </div>
          )}
          {node.salary !== undefined && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Actual salary
              </span>
              <span className="text-sm tabular-nums text-foreground">
                ${node.salary.toLocaleString()}
              </span>
            </div>
          )}
          {node.budgetedSalary !== undefined && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Budgeted salary
              </span>
              <span
                className={`text-sm tabular-nums ${
                  node.salary !== undefined && node.salary > node.budgetedSalary
                    ? "text-violation"
                    : "text-foreground"
                }`}
              >
                ${node.budgetedSalary.toLocaleString()}
                {node.salary !== undefined && node.salary > node.budgetedSalary && (
                  <span className="ml-1 text-[11px]">
                    +${(node.salary - node.budgetedSalary).toLocaleString()} over
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Span</span>
            <span className="text-sm tabular-nums text-foreground">{node.span ?? 0}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Depth</span>
            <span className="text-sm tabular-nums text-foreground">{node.depth ?? 0}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Direct reports · {reports.length}
          </div>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {reports.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => selectNode(r.id)}
                  className="flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-sm hover:bg-surface-2"
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
          className="mt-4 min-h-9 w-full rounded-[6px] border border-border-strong bg-surface-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
        >
          Ask AI about this node
        </button>
      </div>
    </aside>
  );
}
