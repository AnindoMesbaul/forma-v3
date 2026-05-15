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
    ? "border-ai ring-1 ring-ai"
    : data.isAiTarget
      ? "border-ai"
      : data.isSelected
        ? "border-sage-core"
        : "border-chalk";

  return (
    <div
      className={`relative w-[240px] rounded-[10px] border bg-white px-3.5 py-2.5 transition-opacity ${borderClass} ${
        data.isDimmed ? "opacity-40" : "opacity-100"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-chalk" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">
            {data.name}
          </div>
          <div className="truncate text-[11px] text-slate">
            {data.title}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-[6px] border border-chalk bg-parchment px-1.5 py-0.5 text-[11px] text-slate">
          {data.department || "—"}
        </span>
        {data.span > 0 && (
          <span
            className={`rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
              violation
                ? "bg-violation-bg text-violation"
                : "bg-amber-glow text-amber-accent"
            }`}
          >
            ↳ {data.span}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-chalk" />
    </div>
  );
}
