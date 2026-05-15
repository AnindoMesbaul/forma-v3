import { useRef, useState } from "react";
import { useForma } from "@/lib/forma/store";
import { parseOrgCsv } from "@/lib/forma/csv";
import { computeStats } from "@/lib/forma/org";
import { runAnalysis } from "./ai-runner";

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function FormaLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2L3 7v10l9 5 9-5V7l-9-5z"
          stroke="hsl(var(--primary))"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="hsl(var(--primary) / 0.12)"
        />
        <path
          d="M12 2v20M3 7l9 5 9-5"
          stroke="hsl(var(--primary))"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-semibold tracking-tight">FORMA</span>
    </div>
  );
}

export function TopBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { nodes, loadCsv } = useForma();
  const [costsOpen, setCostsOpen] = useState(false);
  const stats = computeStats(nodes);
  const hasOrg = nodes.length > 0;

  const totalCost = nodes.reduce((s, n) => s + (n.salary ?? 0), 0);
  const layerCosts = new Map<number, number>();
  for (const n of nodes) {
    const layer = (n.depth ?? 0) + 1;
    layerCosts.set(layer, (layerCosts.get(layer) ?? 0) + (n.salary ?? 0));
  }
  const sortedLayers = [...layerCosts.entries()].sort((a, b) => a[0] - b[0]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseOrgCsv(text);
    loadCsv(file.name, parsed);
    runAnalysis();
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <FormaLogo />

      <div className="flex items-center gap-5 text-[12px]">
        {hasOrg && (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="font-medium tabular-nums text-foreground">{stats.headcount}</span>
              <span className="text-muted-foreground">headcount</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-medium tabular-nums text-foreground">{stats.layers}</span>
              <span className="text-muted-foreground">layers</span>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setCostsOpen(true)}
              onMouseLeave={() => setCostsOpen(false)}
            >
              <button className="rounded-[6px] border border-border-strong bg-surface-2 px-2.5 py-1 font-medium text-foreground hover:bg-secondary">
                Costs
              </button>
              {costsOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-[6px] border border-border bg-surface shadow-lg">
                  <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {sortedLayers.map(([layer, cost]) => (
                      <div
                        key={layer}
                        className="flex items-center justify-between px-3 py-1.5"
                      >
                        <span className="text-muted-foreground">Layer {layer}</span>
                        <span className="tabular-nums text-foreground">
                          {formatCurrency(cost)}
                        </span>
                      </div>
                    ))}
                    {sortedLayers.length === 0 && (
                      <div className="px-3 py-1.5 text-muted-foreground">No salary data</div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
