import { useForma } from "@/lib/forma/store";
import { computeStats } from "@/lib/forma/org";
import type { OrgNode } from "@/lib/forma/types";

interface ScenarioMetrics {
  headcount: number;
  layers: number;
  avgSpan: number;
  spanViolations: number;
  underSpanning: number;
  healthySpan: number;
  overSpanning: number;
  managerCount: number;
  managerDensity: number;
  totalCost: number;
  changedNodes: number;
}

function computeScenarioMetrics(
  nodes: OrgNode[],
  baseNodes: OrgNode[],
  isBase: boolean,
): ScenarioMetrics {
  const stats = computeStats(nodes);
  const managers = nodes.filter((n) => (n.span ?? 0) > 0);
  const underSpanning = managers.filter((n) => (n.span ?? 0) < 3).length;
  const overSpanning = managers.filter((n) => (n.span ?? 0) > 10).length;
  const healthySpan = managers.length - underSpanning - overSpanning;
  const totalCost = nodes.reduce((s, n) => s + (n.salary ?? 0), 0);
  const managerDensity = nodes.length
    ? (managers.length / nodes.length) * 100
    : 0;

  let changedNodes = 0;
  if (!isBase) {
    const baseById = new Map(baseNodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      const b = baseById.get(n.id);
      if (!b) {
        changedNodes++;
        continue;
      }
      if (
        b.manager !== n.manager ||
        b.title !== n.title ||
        b.department !== n.department
      ) {
        changedNodes++;
      }
    }
  }

  return {
    headcount: stats.headcount,
    layers: stats.layers,
    avgSpan: stats.avgSpan,
    spanViolations: stats.spanViolations,
    underSpanning,
    healthySpan,
    overSpanning,
    managerCount: managers.length,
    managerDensity,
    totalCost,
    changedNodes,
  };
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function formatDeltaCurrency(n: number): string {
  const sign = n > 0 ? "+" : "−";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

type DeltaTone = "good" | "bad" | "neutral";

function DeltaBadge({ text, tone }: { text: string; tone: DeltaTone }) {
  const cls =
    tone === "good"
      ? "text-healthy bg-healthy-bg"
      : tone === "bad"
        ? "text-violation bg-violation-bg"
        : "text-muted-foreground bg-transparent";
  return (
    <span
      className={`ml-2 inline-block rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${cls}`}
    >
      {text}
    </span>
  );
}

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

function avgSpanTone(base: number, val: number): DeltaTone {
  const inRange = (x: number) => x >= 5 && x <= 8;
  if (val === base) return "neutral";
  if (inRange(val) && !inRange(base)) return "good";
  if (!inRange(val) && inRange(base)) return "bad";
  if (inRange(val) && inRange(base)) return "neutral";
  // both out of range: closer to [5,8] is good
  const dist = (x: number) => (x < 5 ? 5 - x : x > 8 ? x - 8 : 0);
  return dist(val) < dist(base) ? "good" : "bad";
}

function densityTone(base: number, val: number): DeltaTone {
  const inRange = (x: number) => x >= 15 && x <= 22;
  if (val === base) return "neutral";
  if (inRange(val) && !inRange(base)) return "good";
  if (!inRange(val) && inRange(base)) return "bad";
  if (inRange(val) && inRange(base)) return "neutral";
  const dist = (x: number) => (x < 15 ? 15 - x : x > 22 ? x - 22 : 0);
  return dist(val) < dist(base) ? "good" : "bad";
}

function SpanBar({ m }: { m: ScenarioMetrics }) {
  if (m.managerCount === 0) return <Dash />;
  const u = (m.underSpanning / m.managerCount) * 100;
  const h = (m.healthySpan / m.managerCount) * 100;
  const o = (m.overSpanning / m.managerCount) * 100;
  return (
    <div className="mx-auto flex h-2 w-[120px] overflow-hidden rounded-full bg-chalk/40">
      <div style={{ width: `${u}%` }} className="bg-violation" />
      <div style={{ width: `${h}%` }} className="bg-healthy" />
      <div style={{ width: `${o}%` }} className="bg-amber-500" />
    </div>
  );
}

export function ScenarioCompare() {
  const { scenarios } = useForma();
  if (scenarios.length < 2) return null;
  const base = scenarios[0];
  const baseMetrics = computeScenarioMetrics(base.nodes, base.nodes, true);
  const all = scenarios.map((s, i) => ({
    scenario: s,
    metrics: computeScenarioMetrics(s.nodes, base.nodes, i === 0),
    isBase: i === 0,
  }));

  const renderCount = (val: number, baseVal: number, isBase: boolean, invertGood = false) => {
    if (isBase) return <span>{val}</span>;
    const delta = val - baseVal;
    let tone: DeltaTone = "neutral";
    if (delta !== 0 && invertGood !== undefined) {
      if (invertGood) tone = delta < 0 ? "good" : "bad";
    }
    return (
      <>
        <span>{val}</span>
        {delta === 0 ? (
          <DeltaBadge text="—" tone="neutral" />
        ) : (
          <DeltaBadge text={delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`} tone={tone} />
        )}
      </>
    );
  };

  return (
    <div className="h-full w-full overflow-auto bg-canvas p-8">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="mb-4 text-[18px] font-semibold text-ink">
          Scenario comparison
        </h2>
        <div className="overflow-hidden rounded-[12px] border border-chalk bg-white shadow-[var(--shadow-card)]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-[200px] bg-sage-deep px-4 py-3 text-left text-[12px] font-medium uppercase tracking-[0.04em] text-white/80">
                  Metric
                </th>
                {all.map(({ scenario, isBase }) => (
                  <th
                    key={scenario.id}
                    className={`px-4 py-3 text-center text-[13px] font-semibold text-white ${
                      isBase ? "bg-sage-core" : "bg-sage-deep"
                    }`}
                  >
                    <div className="truncate">{scenario.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Headcount">
                {all.map(({ scenario, metrics, isBase }) => (
                  <Cell key={scenario.id}>
                    {isBase ? (
                      metrics.headcount
                    ) : (
                      <>
                        <span>{metrics.headcount}</span>
                        {metrics.headcount - baseMetrics.headcount === 0 ? (
                          <DeltaBadge text="—" tone="neutral" />
                        ) : (
                          <DeltaBadge
                            text={
                              metrics.headcount - baseMetrics.headcount > 0
                                ? `+${metrics.headcount - baseMetrics.headcount}`
                                : `−${Math.abs(metrics.headcount - baseMetrics.headcount)}`
                            }
                            tone="neutral"
                          />
                        )}
                      </>
                    )}
                  </Cell>
                ))}
              </Row>
              <Row label="Layers">
                {all.map(({ scenario, metrics, isBase }) => (
                  <Cell key={scenario.id}>
                    {renderCount(metrics.layers, baseMetrics.layers, isBase, true)}
                  </Cell>
                ))}
              </Row>
              <Row label="Avg span">
                {all.map(({ scenario, metrics, isBase }) => {
                  const val = metrics.avgSpan;
                  const delta = val - baseMetrics.avgSpan;
                  return (
                    <Cell key={scenario.id}>
                      <span>{val.toFixed(1)}</span>
                      {!isBase &&
                        (Math.abs(delta) < 0.05 ? (
                          <DeltaBadge text="—" tone="neutral" />
                        ) : (
                          <DeltaBadge
                            text={`${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`}
                            tone={avgSpanTone(baseMetrics.avgSpan, val)}
                          />
                        ))}
                    </Cell>
                  );
                })}
              </Row>
              <Row label="Span violations">
                {all.map(({ scenario, metrics, isBase }) => {
                  const delta = metrics.spanViolations - baseMetrics.spanViolations;
                  return (
                    <Cell key={scenario.id}>
                      <span>{metrics.spanViolations}</span>
                      {!isBase &&
                        (delta === 0 ? (
                          <DeltaBadge text="—" tone="neutral" />
                        ) : (
                          <DeltaBadge
                            text={delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
                            tone={delta < 0 ? "good" : "bad"}
                          />
                        ))}
                    </Cell>
                  );
                })}
              </Row>
              <Row label="Manager density">
                {all.map(({ scenario, metrics, isBase }) => {
                  const val = metrics.managerDensity;
                  const delta = val - baseMetrics.managerDensity;
                  return (
                    <Cell key={scenario.id}>
                      <span>{val.toFixed(0)}%</span>
                      {!isBase &&
                        (Math.abs(delta) < 0.05 ? (
                          <DeltaBadge text="—" tone="neutral" />
                        ) : (
                          <DeltaBadge
                            text={`${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}%`}
                            tone={densityTone(baseMetrics.managerDensity, val)}
                          />
                        ))}
                    </Cell>
                  );
                })}
              </Row>
              <Row label="Total cost">
                {all.map(({ scenario, metrics, isBase }) => {
                  const delta = metrics.totalCost - baseMetrics.totalCost;
                  return (
                    <Cell key={scenario.id}>
                      <span>{formatCurrency(metrics.totalCost)}</span>
                      {!isBase &&
                        (delta === 0 ? (
                          <DeltaBadge text="—" tone="neutral" />
                        ) : (
                          <DeltaBadge
                            text={formatDeltaCurrency(delta)}
                            tone={delta < 0 ? "good" : "bad"}
                          />
                        ))}
                    </Cell>
                  );
                })}
              </Row>
              <Row label="Span distribution">
                {all.map(({ scenario, metrics }) => (
                  <Cell key={scenario.id}>
                    <SpanBar m={metrics} />
                  </Cell>
                ))}
              </Row>
              <Row label="Changed nodes">
                {all.map(({ scenario, metrics, isBase }) => (
                  <Cell key={scenario.id}>
                    {isBase ? <Dash /> : <span>{metrics.changedNodes}</span>}
                  </Cell>
                ))}
              </Row>
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-violation" /> Under (&lt; 3)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-healthy" /> Healthy (3–10)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-amber-500" /> Over (&gt; 10)
          </span>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Deltas compared to Base scenario. Span target: 3–10 direct reports. Manager density target: 15–22%.
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-chalk even:bg-canvas/50">
      <td className="px-4 py-3 text-[12px] font-medium uppercase tracking-[0.04em] text-slate">
        {label}
      </td>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-center text-[14px] tabular-nums text-ink">
      {children}
    </td>
  );
}