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

export function ForecastApp() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("inflated");
  const [customDeals, setCustomDeals] = useState<Deal[] | null>(null);
  const scenario = getScenario(scenarioKey);
  const [targetRevenue, setTargetRevenue] = useState(scenario.targetRevenue);
  const deals = customDeals ?? scenario.deals;

  const analyses = useMemo(() => sortAnalyses(analyzeDeals(deals, todayIso)), [deals]);
  const forecast = useMemo(
    () => runMonteCarloForecast(analyses, targetRevenue, 8000, scenarioKey.length * 97),
    [analyses, scenarioKey.length, targetRevenue]
  );
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const selectedAnalysis = analyses.find((analysis) => analysis.deal.id === selectedDealId) ?? analyses[0]!;
  const recommendation = buildDeterministicRecommendation(selectedAnalysis, forecast);
  const auditRecord = createAuditRecord(selectedAnalysis, recommendation);
  const score = brierScore(analyses);
  const buckets = calibrationBuckets(analyses);

  function loadScenario(key: ScenarioKey) {
    const next = getScenario(key);
    setScenarioKey(key);
    setTargetRevenue(next.targetRevenue);
    setCustomDeals(null);
    setSelectedDealId(null);
  }

  async function importCsv(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const parsed = importDealsFromCsv(text, { todayIso });
    if (parsed.success && parsed.deals.length > 0) {
      setCustomDeals([...parsed.deals]);
      setTargetRevenue(Math.round(parsed.deals.reduce((sum, deal) => sum + deal.amount, 0) * 0.42));
      setSelectedDealId(null);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">C</div>
        <nav>
          <span className="nav-item active">Forecast</span>
          <span className="nav-item">Deals</span>
          <span className="nav-item">Risk</span>
          <span className="nav-item">Audit</span>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Constellation</h1>
            <p>Probabilistic revenue forecast for B2B sales pipelines.</p>
          </div>
          <div className="controls">
            <select value={scenarioKey} onChange={(event) => loadScenario(event.target.value as ScenarioKey)}>
              {scenarios.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
            <label className="target-input">
              Target
              <input
                value={targetRevenue}
                onChange={(event) => setTargetRevenue(Number(event.target.value))}
                type="number"
              />
            </label>
            <label className="file-button">
              Upload CSV
              <input accept=".csv" type="file" onChange={(event) => void importCsv(event.target.files?.[0] ?? null)} />
            </label>
            <button onClick={() => loadScenario(scenarioKey)}>Load Demo Dataset</button>
          </div>
        </header>

        <section className="grid kpis">
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
                  <p>{forecast.simulationCount.toLocaleString()} simulations. Downside gap {currency(forecast.downsideGap)}.</p>
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

            <section className="panel table-panel">
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

          <DealDetail analysis={selectedAnalysis} forecast={forecast} auditRecord={auditRecord} recommendation={recommendation} />
        </section>
      </section>
    </main>
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
  recommendation
}: {
  analysis: DealAnalysis;
  forecast: ForecastResult;
  auditRecord: ReturnType<typeof createAuditRecord>;
  recommendation: ReturnType<typeof buildDeterministicRecommendation>;
}) {
  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <span>{analysis.deal.segment.replace("_", " ")}</span>
        <h2>{analysis.deal.accountName}</h2>
        <p>{currency(analysis.deal.amount)} deal owned by {analysis.deal.ownerName}</p>
      </div>

      <div className="risk-orbit">
        <strong>{analysis.riskScore.toFixed(1)}</strong>
        <span>{analysis.riskLevel} risk</span>
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

      <section className="detail-section">
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
        <h3>AI Recommendation</h3>
        <p>{recommendation.executiveSummary}</p>
        {recommendation.nextBestActions.map((action) => (
          <div className="action" key={action.action}>
            <span>{action.urgency}</span>
            <strong>{action.action}</strong>
            <small>{action.rationale}</small>
          </div>
        ))}
      </section>

      <section className="detail-section audit">
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

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function labelize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
