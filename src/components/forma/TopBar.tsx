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
    <div className="flex items-center gap-2 text-white">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <span className="font-medium tracking-tight">FORMA</span>
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

  const navBtn =
    "min-h-8 rounded-[8px] border border-white/20 bg-transparent px-3 py-1.5 font-medium text-white hover:bg-sage-core";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-chalk bg-sage-deep px-4 text-white">
      <FormaLogo />

      <div className="flex items-center gap-5 text-[13px]">
        {hasOrg && (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="font-medium tabular-nums text-white">{stats.headcount}</span>
              <span className="text-white/70">headcount</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-medium tabular-nums text-white">{stats.layers}</span>
              <span className="text-white/70">layers</span>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setCostsOpen(true)}
              onMouseLeave={() => setCostsOpen(false)}
            >
              <button className={navBtn}>Costs</button>
              {costsOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-[8px] border border-chalk bg-canvas text-ink">
                  <div className="flex items-center justify-between border-b border-chalk bg-parchment px-3 py-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate">
                      Total
                    </span>
                    <span className="font-medium tabular-nums text-ink">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {sortedLayers.map(([layer, cost]) => (
                      <div
                        key={layer}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <span className="text-slate">Layer {layer}</span>
                        <span className="tabular-nums text-ink">
                          {formatCurrency(cost)}
                        </span>
                      </div>
                    ))}
                    {sortedLayers.length === 0 && (
                      <div className="px-3 py-2 text-slate">No salary data</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <button onClick={() => inputRef.current?.click()} className={navBtn}>
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
