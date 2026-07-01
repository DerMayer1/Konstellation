import type { DealAnalysis, ForecastResult } from "../domain/deal";

export const forecastConfidenceWeights = {
  concentration: 0.35,
  missingDataRatio: 0.35,
  coefficientOfVariation: 0.3
} as const;

export type ForecastConfidenceInputs = {
  readonly concentration: number;
  readonly missingDataRatio: number;
  readonly coefficientOfVariation: number;
};

export function revenueConcentration(analyses: readonly DealAnalysis[]): number {
  if (analyses.length === 0) return 1;
  const total = analyses.reduce((sum, analysis) => sum + analysis.deal.amount, 0);
  const max = Math.max(0, ...analyses.map((analysis) => analysis.deal.amount));
  return total <= 0 ? 1 : max / total;
}

export function missingDataRatio(analyses: readonly DealAnalysis[]): number {
  if (analyses.length === 0) return 1;
  return analyses.filter((analysis) => analysis.missingData.length > 0).length / analyses.length;
}

export function coefficientOfVariation(standardDeviation: number, expectedRevenue: number): number {
  if (expectedRevenue <= 0) return standardDeviation > 0 ? 1 : 0;
  return standardDeviation / expectedRevenue;
}

export function forecastConfidenceScore(inputs: ForecastConfidenceInputs): number {
  const raw =
    1 -
    forecastConfidenceWeights.concentration * inputs.concentration -
    forecastConfidenceWeights.missingDataRatio * inputs.missingDataRatio -
    forecastConfidenceWeights.coefficientOfVariation * inputs.coefficientOfVariation;
  return Math.max(0, Math.min(1, raw));
}

export function confidenceLevel(score: number): ForecastResult["confidence"] {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}
