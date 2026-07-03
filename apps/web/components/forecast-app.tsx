"use client";

import { useMemo, useState } from "react";
import {
  analyzeDeals,
  brierScore,
  calibrationBuckets,
  importDealsFromCsv,
  runMonteCarloForecast,
  type Deal,
  type DealAnalysis,
  type ForecastResult,
  type RiskLevel
} from "@constellation/core";
import { getScenario, getScenarios, type ScenarioKey } from "@constellation/synthetic-data";
import { buildDeterministicRecommendation, createAuditRecord } from "@constellation/ai";

const scenarios = getScenarios();
const todayIso = "2026-07-01T12:00:00.000Z";

type DataSource =
  | { readonly kind: "none" }
  | { readonly kind: "demo"; readonly scenarioName: string }
  | { readonly kind: "csv"; readonly fileName: string; readonly dealCount: number };

type NavItemId = "forecast" | "deals" | "risk" | "audit";

const navItems: readonly {
  readonly id: NavItemId;
  readonly keyLabel: string;
  readonly label: string;
  readonly requiresData: boolean;
}[] = [
  { id: "forecast", keyLabel: "F2", label: "Forecast", requiresData: false },
  { id: "deals", keyLabel: "F3", label: "Deals", requiresData: true },
  { id: "risk", keyLabel: "F4", label: "Risk", requiresData: true },
  { id: "audit", keyLabel: "F5", label: "Audit", requiresData: true }
];

export function ForecastApp() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("inflated");
  const [csvDeals, setCsvDeals] = useState<Deal[] | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>({ kind: "none" });
  const [activeNav, setActiveNav] = useState<NavItemId>("forecast");
  const scenario = getScenario(scenarioKey);
  const [targetRevenue, setTargetRevenue] = useState(0);
  const deals = dataSource.kind === "demo" ? scenario.deals : csvDeals ?? [];
  const hasData = deals.length > 0;

  const analyses = useMemo(() => sortAnalyses(analyzeDeals(deals, todayIso)), [deals]);
  const forecast = useMemo(
    () => hasData ? runMonteCarloForecast(analyses, targetRevenue, 8000, scenarioKey.length * 97) : null,
    [analyses, hasData, scenarioKey.length, targetRevenue]
  );
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const selectedAnalysis = analyses.find((analysis) => analysis.deal.id === selectedDealId) ?? analyses[0] ?? null;
  const recommendation = useMemo(
    () => selectedAnalysis && forecast ? buildDeterministicRecommendation(selectedAnalysis, forecast) : null,
    [forecast, selectedAnalysis]
  );
  const auditRecord = useMemo(
    () => selectedAnalysis && recommendation ? createAuditRecord(selectedAnalysis, recommendation) : null,
    [recommendation, selectedAnalysis]
  );
  const score = brierScore(analyses);
  const buckets = calibrationBuckets(analyses);
  const isDemo = dataSource.kind === "demo";

  function navigateTo(section: NavItemId) {
    setActiveNav(section);
    const target = document.getElementById(`section-${section}`) ?? document.getElementById("workspace-top");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadScenario(key: ScenarioKey) {
    const next = getScenario(key);
    setScenarioKey(key);
    setTargetRevenue(next.targetRevenue);
    setCsvDeals(null);
    setDataSource({ kind: "demo", scenarioName: next.name });
    setSelectedDealId(null);
    setActiveNav("forecast");
  }

  async function importCsv(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const parsed = importDealsFromCsv(text, { todayIso });
    if (parsed.success && parsed.deals.length > 0) {
      setCsvDeals([...parsed.deals]);
      setTargetRevenue(Math.round(parsed.deals.reduce((sum, deal) => sum + deal.amount, 0) * 0.42));
      setDataSource({ kind: "csv", fileName: file.name, dealCount: parsed.deals.length });
      setSelectedDealId(null);
      setActiveNav("forecast");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">CNST</div>
        <div className="nav-help">&lt; HELP &gt;</div>
        <nav aria-label="Dashboard sections">
          {navItems.map((item) => {
            const disabled = item.requiresData && !hasData;
            return (
              <button
                aria-current={activeNav === item.id ? "page" : undefined}
                className={`nav-item ${activeNav === item.id ? "active" : ""}`}
                disabled={disabled}
                key={item.id}
                onClick={() => navigateTo(item.id)}
                title={disabled ? "Load pipeline data first" : `Go to ${item.label}`}
                type="button"
              >
                <span>{item.keyLabel}</span>
                <strong>{item.label}</strong>
              </button>
            );
          })}
        </nav>
        <div className="nav-status">
          <span>F12</span>
          <strong>System</strong>
        </div>
      </aside>

      <section className="workspace" id="workspace-top">
        <header className="terminal-header">
          <div className="terminal-brand">
            <strong>CONSTELLATION</strong>
            <span>REVF</span>
            <b>Revenue Forecasting System</b>
          </div>
          <div className="terminal-meta">
            <span>User: ANALYST01</span>
            <span>Env: LOCAL</span>
            <span>11:08:23</span>
          </div>
        </header>

        <section className="market-strip" aria-label="Terminal status feed">
          <span>PIPELINE FUTURES</span>
          <b>EXPECTED REV</b>
          <strong>{hasData && forecast ? currency(forecast.expectedRevenue) : "--"}</strong>
          <b>HIT TARGET</b>
          <strong className={forecast && forecast.probabilityOfHittingTarget >= 0.5 ? "up" : "down"}>
            {forecast ? percent(forecast.probabilityOfHittingTarget) : "--"}
          </strong>
          <b>HIGH RISK</b>
          <strong className="down">{hasData ? analyses.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length : "--"}</strong>
          <span>MSG: 0</span>
        </section>

        <header className="topbar">
          <div>
            <h1>Forecast Summary</h1>
            <p>Probabilistic revenue forecast for B2B sales pipelines.</p>
          </div>
          <div className="controls">
            <select
              aria-label="Demo scenario"
              value={scenarioKey}
              onChange={(event) => {
                const nextKey = event.target.value as ScenarioKey;
                setScenarioKey(nextKey);
                if (dataSource.kind === "demo") loadScenario(nextKey);
              }}
            >
              {scenarios.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
            <label className="target-input">
              Target
              <input
                disabled={!hasData}
                value={targetRevenue || ""}
                onChange={(event) => setTargetRevenue(Number(event.target.value))}
                type="number"
              />
            </label>
            <label className="file-button">
              Upload Real CSV
              <input accept=".csv" type="file" onChange={(event) => void importCsv(event.target.files?.[0] ?? null)} />
            </label>
            <button className="secondary-button" onClick={() => loadScenario(scenarioKey)}>Load Demo Dataset</button>
          </div>
        </header>

        <DataSourceBanner dataSource={dataSource} />

        {!forecast || !selectedAnalysis || !recommendation || !auditRecord ? (
          <EmptyState onImportCsv={importCsv} onLoadDemo={() => loadScenario(scenarioKey)} />
        ) : (
          <LoadedForecast
            analyses={analyses}
            auditRecord={auditRecord}
            buckets={buckets}
            forecast={forecast}
            isDemo={isDemo}
            recommendation={recommendation}
            score={score}
            selectedAnalysis={selectedAnalysis}
            setSelectedDealId={setSelectedDealId}
          />
        )}
      </section>
    </main>
  );
}

function LoadedForecast({
  analyses,
  auditRecord,
  buckets,
  forecast,
  isDemo,
  recommendation,
  score,
  selectedAnalysis,
  setSelectedDealId
}: {
  analyses: DealAnalysis[];
  auditRecord: ReturnType<typeof createAuditRecord>;
  buckets: ReturnType<typeof calibrationBuckets>;
  forecast: ForecastResult;
  isDemo: boolean;
  recommendation: ReturnType<typeof buildDeterministicRecommendation>;
  score: ReturnType<typeof brierScore>;
  selectedAnalysis: DealAnalysis;
  setSelectedDealId: (id: string) => void;
}) {
  return (
    <>
      {isDemo ? (
        <section className="demo-warning">
          <strong>Demo mode:</strong> these numbers are synthetic and must not be interpreted as a real forecast.
        </section>
      ) : null}

        <section className="grid kpis" id="section-forecast">
          <Kpi label="Total Pipeline" value={currency(sumBy(analyses, (item) => item.deal.amount))} />
          <Kpi label="Expected Revenue" value={currency(forecast.expectedRevenue)} tone="green" />
          <Kpi label="P10 / P50 / P90" value={`${currency(forecast.p10)} / ${currency(forecast.p50)} / ${currency(forecast.p90)}`} />
          <Kpi label="Hit Target" value={percent(forecast.probabilityOfHittingTarget)} tone={forecast.probabilityOfHittingTarget > 0.5 ? "green" : "amber"} />
          <Kpi label="High-Risk Deals" value={String(analyses.filter((item) => item.riskLevel === "high" || item.riskLevel === "critical").length)} tone="red" />
          <Kpi label="Forecast Confidence" value={forecast.confidence.toUpperCase()} tone={forecast.confidence === "high" ? "green" : "amber"} />
        </section>

        <section className="main-grid">
          <div className="left-stack">
            <section className="panel forecast-panel">
              <div className="panel-header">
                <div>
                  <h2>Monte Carlo Forecast</h2>
                  <p>{integer(forecast.simulationCount)} simulations. Downside gap {currency(forecast.downsideGap)}.</p>
                </div>
                <strong>{percent(forecast.probabilityOfHittingTarget)} to hit target</strong>
              </div>
              <DistributionChart forecast={forecast} />
            </section>

            <section className="chart-grid">
              <MiniChart title="Pipeline by Stage" rows={stageRows(analyses)} />
              <MiniChart title="Risk by Owner" rows={ownerRows(analyses)} danger />
              <MiniChart title="Calibration" rows={buckets.map((bucket) => ({
                label: `${Math.round(bucket.min * 100)}-${Math.round(bucket.max * 100)}%`,
                value: bucket.actualCloseRate,
                helper: `${bucket.count} deals`
              }))} />
            </section>

            <section className="panel table-panel" id="section-deals">
              <div className="panel-header">
                <div>
                  <h2>Critical Deals</h2>
                  <p>Sorted by risk, amount, then close date.</p>
                </div>
                <span>Brier score {score === null ? "n/a" : score.toFixed(3)}</span>
              </div>
              <DealsTable analyses={analyses} selectedId={selectedAnalysis.deal.id} onSelect={setSelectedDealId} />
            </section>
          </div>

          <DealDetail analysis={selectedAnalysis} forecast={forecast} auditRecord={auditRecord} recommendation={recommendation} isDemo={isDemo} />
        </section>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" | "red" }) {
  return (
    <article className={`kpi ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DataSourceBanner({ dataSource }: { dataSource: DataSource }) {
  if (dataSource.kind === "csv") {
    return (
      <section className="source-banner real">
        <strong>Data source: Uploaded CSV</strong>
        <span>{dataSource.fileName} · {dataSource.dealCount} deals loaded locally.</span>
      </section>
    );
  }

  if (dataSource.kind === "demo") {
    return (
      <section className="source-banner demo">
        <strong>Data source: Demo synthetic dataset</strong>
        <span>{dataSource.scenarioName}. This is a development fixture, not a real business forecast.</span>
      </section>
    );
  }

  return (
    <section className="source-banner empty">
      <strong>No pipeline data loaded</strong>
      <span>Upload a real CSV to generate a forecast. Demo data is available only as a secondary development fixture.</span>
    </section>
  );
}

function EmptyState({
  onImportCsv,
  onLoadDemo
}: {
  onImportCsv: (file: File | null) => Promise<void>;
  onLoadDemo: () => void;
}) {
  return (
    <section className="empty-state panel">
      <div>
        <span className="eyebrow">Real data required</span>
        <h2>Load a pipeline before generating a forecast</h2>
        <p>
          Constellation should not present fabricated numbers as product output. Upload a CRM export CSV to run the risk engine,
          Monte Carlo forecast, recommendation layer and audit trail against actual pipeline data.
        </p>
      </div>
      <div className="empty-actions">
        <label className="file-button primary-file-button">
          Upload Real CSV
          <input accept=".csv" type="file" onChange={(event) => void onImportCsv(event.target.files?.[0] ?? null)} />
        </label>
        <button className="secondary-button" onClick={onLoadDemo}>Load Demo Dataset</button>
      </div>
      <div className="empty-note">
        Demo mode is useful for testing UI and engine wiring only. It is not evidence of forecasting quality.
      </div>
    </section>
  );
}

function DistributionChart({ forecast }: { forecast: ForecastResult }) {
  const maxCount = Math.max(1, ...forecast.distribution.map((bucket) => bucket.count));
  return (
    <div className="distribution">
      {forecast.distribution.map((bucket) => (
        <div className="bar-wrap" key={`${bucket.bucketStart}-${bucket.bucketEnd}`}>
          <div className="bar" style={{ height: `${Math.max(4, (bucket.count / maxCount) * 100)}%` }} />
        </div>
      ))}
      <div className="axis">
        <span>{currency(forecast.distribution[0]?.bucketStart ?? 0)}</span>
        <span>Target {currency(forecast.targetRevenue)}</span>
        <span>{currency(forecast.distribution.at(-1)?.bucketEnd ?? 0)}</span>
      </div>
    </div>
  );
}

function MiniChart({ title, rows, danger }: { title: string; rows: Array<{ label: string; value: number; helper?: string }>; danger?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="panel mini-chart">
      <h2>{title}</h2>
      <div className="mini-rows">
        {rows.slice(0, 6).map((row) => (
          <div className="mini-row" key={row.label}>
            <span>{row.label}</span>
            <div className="mini-track">
              <div className={danger ? "mini-fill danger" : "mini-fill"} style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
            <b>{row.helper ?? compact(row.value)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function DealsTable({ analyses, selectedId, onSelect }: { analyses: DealAnalysis[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Owner</th>
            <th>Amount</th>
            <th>Stage</th>
            <th>CRM</th>
            <th>Adjusted</th>
            <th>Risk</th>
            <th>Top Driver</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map((analysis) => (
            <tr
              className={analysis.deal.id === selectedId ? "selected-row" : ""}
              key={analysis.deal.id}
              onClick={() => onSelect(analysis.deal.id)}
            >
              <td>{analysis.deal.accountName}</td>
              <td>{analysis.deal.ownerName}</td>
              <td>{currency(analysis.deal.amount)}</td>
              <td>{labelize(analysis.deal.stage)}</td>
              <td>{percent(analysis.deal.crmProbability)}</td>
              <td>{percent(analysis.adjustedProbability)}</td>
              <td><RiskBadge level={analysis.riskLevel} score={analysis.riskScore} /></td>
              <td>{analysis.riskDrivers[0]?.label ?? "Closed state"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DealDetail({
  analysis,
  forecast,
  auditRecord,
  recommendation,
  isDemo
}: {
  analysis: DealAnalysis;
  forecast: ForecastResult;
  auditRecord: ReturnType<typeof createAuditRecord>;
  recommendation: ReturnType<typeof buildDeterministicRecommendation>;
  isDemo: boolean;
}) {
  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <span>{analysis.deal.segment.replace("_", " ")}</span>
        <h2>{analysis.deal.accountName}</h2>
        <p>{currency(analysis.deal.amount)} deal owned by {analysis.deal.ownerName}</p>
      </div>

      <div className="risk-orbit">
        <div className="risk-orbit-content">
          <strong>{analysis.riskScore.toFixed(1)}</strong>
          <span>{analysis.riskLevel} risk</span>
        </div>
      </div>

      <div className="probability-strip">
        <div>
          <span>CRM</span>
          <b>{percent(analysis.deal.crmProbability)}</b>
        </div>
        <div>
          <span>Adjusted</span>
          <b>{percent(analysis.adjustedProbability)}</b>
        </div>
        <div>
          <span>Expected</span>
          <b>{currency(analysis.expectedRevenue)}</b>
        </div>
      </div>

      <section className="detail-section" id="section-risk">
        <h3>Risk Drivers</h3>
        {analysis.riskDrivers.slice(0, 5).map((driver) => (
          <div className="driver" key={driver.key}>
            <div>
              <strong>{driver.label}</strong>
              <span>{driver.explanation}</span>
            </div>
            <b>+{driver.contribution.toFixed(2)}</b>
          </div>
        ))}
      </section>

      <section className="detail-section recommendation">
        <h3>{isDemo ? "Demo Recommendation" : "AI Recommendation"}</h3>
        {isDemo ? (
          <small className="demo-copy">Generated from synthetic fixture data. Do not treat this as a real account recommendation.</small>
        ) : null}
        <p>{recommendation.executiveSummary}</p>
        {recommendation.nextBestActions.map((action) => (
          <div className="action" key={action.action}>
            <span>{action.urgency}</span>
            <strong>{action.action}</strong>
            <small>{action.rationale}</small>
          </div>
        ))}
      </section>

      <section className="detail-section audit" id="section-audit">
        <h3>Audit Trail</h3>
        <dl>
          <dt>Risk engine</dt>
          <dd>{auditRecord.riskEngineVersion}</dd>
          <dt>Prompt version</dt>
          <dd>{auditRecord.promptVersion}</dd>
          <dt>Provider</dt>
          <dd>{auditRecord.modelProvider}</dd>
          <dt>Input hash</dt>
          <dd>{auditRecord.inputHash}</dd>
          <dt>Forecast confidence</dt>
          <dd>{forecast.confidence}</dd>
        </dl>
      </section>
    </aside>
  );
}

function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  return <span className={`risk-badge ${level}`}>{score.toFixed(0)} {level}</span>;
}

function sortAnalyses(analyses: DealAnalysis[]): DealAnalysis[] {
  const rank: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...analyses].sort((a, b) =>
    rank[a.riskLevel] - rank[b.riskLevel] ||
    b.deal.amount - a.deal.amount ||
    Date.parse(a.deal.closeDate) - Date.parse(b.deal.closeDate)
  );
}

function stageRows(analyses: DealAnalysis[]) {
  const map = new Map<string, number>();
  for (const analysis of analyses) {
    map.set(labelize(analysis.deal.stage), (map.get(labelize(analysis.deal.stage)) ?? 0) + analysis.deal.amount);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

function ownerRows(analyses: DealAnalysis[]) {
  const map = new Map<string, { count: number; risk: number }>();
  for (const analysis of analyses) {
    const current = map.get(analysis.deal.ownerName) ?? { count: 0, risk: 0 };
    current.count += 1;
    current.risk += analysis.riskScore;
    map.set(analysis.deal.ownerName, current);
  }
  return [...map.entries()].map(([label, value]) => ({
    label,
    value: value.risk / value.count,
    helper: `${Math.round(value.risk / value.count)} avg`
  }));
}

function sumBy<T>(items: T[], getter: (item: T) => number): number {
  return items.reduce((sum, item) => sum + getter(item), 0);
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function integer(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function labelize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
