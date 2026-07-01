import type { DealAnalysis, ForecastResult } from "@constellation/core";
import { riskEngineVersion } from "@constellation/core";
import type { DealRecommendation } from "./recommendation-schema";

export type AuditRecord = {
  id: string;
  dealId: string;
  createdAt: string;
  riskEngineVersion: string;
  promptVersion: string;
  modelProvider: string;
  modelName: string;
  inputHash: string;
  riskScore: number;
  adjustedProbability: number;
  output: DealRecommendation;
};

export function buildDeterministicRecommendation(
  analysis: DealAnalysis,
  forecast: ForecastResult
): DealRecommendation {
  const topDrivers = analysis.riskDrivers.slice(0, 3);
  const isHighValue = analysis.deal.amount >= forecast.expectedRevenue * 0.18;
  const shouldEscalateToHuman = analysis.riskScore >= 75 && isHighValue;

  return {
    executiveSummary: `${analysis.deal.accountName} is a ${analysis.riskLevel} risk deal with ${(analysis.adjustedProbability * 100).toFixed(0)}% adjusted close probability and ${currency(analysis.expectedRevenue)} expected revenue.`,
    riskExplanation: topDrivers.length
      ? `The risk score is driven by ${topDrivers.map((driver) => driver.label.toLowerCase()).join(", ")}. These are deterministic model outputs, not invented CRM facts.`
      : "The deal is already closed, so the risk score is determined by the closed state.",
    nextBestActions: buildActions(analysis, shouldEscalateToHuman),
    missingInformation: analysis.missingData,
    confidence: analysis.missingData.length > 1 ? "low" : forecast.confidence,
    shouldEscalateToHuman
  };
}

export function createAuditRecord(analysis: DealAnalysis, output: DealRecommendation): AuditRecord {
  return {
    id: `audit-${analysis.deal.id}-${Math.abs(hash(JSON.stringify({ deal: analysis.deal, score: analysis.riskScore })))}`,
    dealId: analysis.deal.id,
    createdAt: new Date("2026-07-01T12:00:00.000Z").toISOString(),
    riskEngineVersion,
    promptVersion: "deal-recommendation-v0.1.0",
    modelProvider: "deterministic-fallback",
    modelName: "rules-from-engine-output",
    inputHash: String(Math.abs(hash(JSON.stringify(analysis)))),
    riskScore: analysis.riskScore,
    adjustedProbability: analysis.adjustedProbability,
    output
  };
}

function buildActions(analysis: DealAnalysis, shouldEscalateToHuman: boolean): DealRecommendation["nextBestActions"] {
  const actions: DealRecommendation["nextBestActions"] = [];
  if (analysis.missingData.includes("nextStep")) {
    actions.push({
      action: "Define a dated next step with the buyer",
      rationale: "Missing next step is one of the strongest operational risk signals.",
      urgency: "high"
    });
  }
  if (analysis.features.daysSinceLastActivity === null || analysis.features.daysSinceLastActivity > 14) {
    actions.push({
      action: "Create immediate buyer activity",
      rationale: "Inactivity is reducing the adjusted close probability.",
      urgency: "high"
    });
  }
  if (analysis.features.closePressure > 0.65) {
    actions.push({
      action: "Validate the close date against procurement reality",
      rationale: "The current close date is close enough to create forecast slippage risk.",
      urgency: "medium"
    });
  }
  if (shouldEscalateToHuman) {
    actions.push({
      action: "Escalate to sales leadership",
      rationale: "The deal combines high revenue impact with high forecast risk.",
      urgency: "high"
    });
  }
  return actions.slice(0, 4);
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value << 5) - value + input.charCodeAt(index);
    value |= 0;
  }
  return value;
}
