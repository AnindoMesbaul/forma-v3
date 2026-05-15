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

  let containerClass =
    "border-chalk bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-raised)]";
  if (violation) {
    containerClass =
      "border-violation bg-violation-bg shadow-[0_2px_8px_rgba(139,47,38,0.10)]";
  }
  if (data.isAiTarget || data.isFocused) {
    containerClass =
      "border-ai border-dashed bg-ai-bg shadow-[0_2px_8px_rgba(61,58,158,0.07)]";
  }
  if (data.isSelected) {
    containerClass =
      "border-sage-deep border-2 bg-white shadow-[0_0_0_4px_#E8F5EE,0_2px_8px_rgba(31,92,65,0.10)]";
  }

  return (
    <div
      className={`relative w-[240px] rounded-[12px] border px-4 py-3.5 transition-all ${containerClass} ${
        data.isDimmed ? "opacity-40" : "opacity-100"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-chalk" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium text-ink">
            {data.name}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-slate">
            {data.title}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="rounded-[6px] border border-chalk bg-canvas px-2 py-0.5 text-[11px] text-slate">
          {data.department || "—"}
        </span>
        {data.span > 0 && (
          <span
            className={`text-[12.5px] font-medium tabular-nums ${
              violation ? "text-violation" : "text-amber-accent"
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
