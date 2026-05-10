import { useRef } from "react";
import { useForma } from "@/lib/forma/store";
import { parseOrgCsv } from "@/lib/forma/csv";
import { computeStats } from "@/lib/forma/org";
import { runAnalysis } from "./ai-runner";

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: "primary" | "destructive" }) {
  const cls =
    accent === "primary"
      ? "text-primary"
      : accent === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}

export function TopBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { fileName, nodes, proposals, loadCsv } = useForma();
  const stats = computeStats(nodes);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseOrgCsv(text);
    loadCsv(file.name, parsed);
    runAnalysis();
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="grid h-5 w-5 place-items-center rounded-[4px] bg-primary text-[10px] font-bold text-primary-foreground">
            F
          </div>
          <span className="font-semibold tracking-tight">Forma</span>
        </div>
        {fileName && (
          <span className="text-muted-foreground">· {fileName}</span>
        )}
      </div>

      <div className="flex items-center gap-5 text-[12px]">
        {nodes.length > 0 && (
          <>
            <Stat label="Headcount" value={stats.headcount} />
            <Stat label="Layers" value={stats.layers} />
            <Stat label="Avg span" value={stats.avgSpan.toFixed(1)} />
            <Stat
              label="Violations"
              value={stats.spanViolations}
              accent={stats.spanViolations ? "destructive" : undefined}
            />
            <Stat
              label="Proposals"
              value={proposals.length}
              accent={proposals.length ? "primary" : undefined}
            />
          </>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-[6px] border border-border-strong bg-surface-2 px-2.5 py-1 font-medium text-foreground hover:bg-secondary"
        >
          Upload CSV
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </header>
  );
}
