import { Handle, Position, type NodeProps } from "reactflow";
import { isSpanViolation } from "@/lib/forma/org";

export interface OrgNodeData {
  name: string;
  title: string;
  department: string;
  span: number;
  isAiTarget: boolean;
  isSelected: boolean;
  isFocused: boolean;
  isDimmed: boolean;
}

export function OrgNodeCard({ data }: NodeProps<OrgNodeData>) {
  const violation = isSpanViolation(data.span);
  const borderClass = data.isFocused
    ? "border-primary ring-2 ring-primary"
    : data.isAiTarget
      ? "border-primary"
      : data.isSelected
        ? "border-border-strong"
        : "border-border";

  return (
    <div
      className={`relative w-[240px] rounded-[6px] border bg-surface px-3.5 py-2.5 shadow-[var(--shadow-panel)] transition-opacity ${borderClass} ${
        data.isDimmed ? "opacity-40" : "opacity-100"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-border-strong" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-foreground">
            {data.name}
          </div>
          <div className="truncate text-[13px] text-muted-foreground">
            {data.title}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-[4px] bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {data.department || "—"}
        </span>
        {data.span > 0 && (
          <span
            className={`text-[12px] tabular-nums ${
              violation ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            ↳ {data.span}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border-strong" />
    </div>
  );
}
