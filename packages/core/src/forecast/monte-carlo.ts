import type { DealAnalysis, ForecastResult } from "../domain/deal";
import { percentile, seededRandom } from "../math";

export function runMonteCarloForecast(
  analyses: DealAnalysis[],
  targetRevenue: number,
  simulationCount = 10000,
  seed = 42
): ForecastResult {
  const random = seededRandom(seed);
  const revenues: number[] = [];

  for (let simulation = 0; simulation < simulationCount; simulation += 1) {
    let revenue = 0;
    for (const analysis of analyses) {
      if (random() < analysis.adjustedProbability) {
        revenue += analysis.deal.amount;
      }
    }
    revenues.push(revenue);
  }

  const sorted = [...revenues].sort((a, b) => a - b);
  const expectedRevenue = average(revenues);
  const deterministicExpectedRevenue = analyses.reduce((sum, analysis) => sum + analysis.expectedRevenue, 0);
  const standardDeviation = Math.sqrt(average(revenues.map((value) => (value - expectedRevenue) ** 2)));
  const p10 = percentile(sorted, 0.1);
  const p25 = percentile(sorted, 0.25);
  const p50 = percentile(sorted, 0.5);
  const p75 = percentile(sorted, 0.75);
  const p90 = percentile(sorted, 0.9);
  const probabilityOfHittingTarget =
    revenues.filter((value) => value >= targetRevenue).length / Math.max(1, simulationCount);

  const concentration = revenueConcentration(analyses);
  const missingDataRatio =
    analyses.filter((analysis) => analysis.missingData.length > 0).length / Math.max(1, analyses.length);
  const coefficientOfVariation = standardDeviation / Math.max(1, expectedRevenue);
  const confidenceScore = Math.max(
    0,
    Math.min(1, 1 - 0.35 * concentration - 0.35 * missingDataRatio - 0.3 * coefficientOfVariation)
  );

  return {
    simulationCount,
    targetRevenue,
    expectedRevenue,
    deterministicExpectedRevenue,
    medianRevenue: p50,
    p10,
    p25,
    p50,
    p75,
    p90,
    probabilityOfHittingTarget,
    downsideGap: Math.max(0, targetRevenue - p10),
    upsidePotential: Math.max(0, p90 - targetRevenue),
    standardDeviation,
    confidenceScore,
    confidence: confidenceScore >= 0.75 ? "high" : confidenceScore >= 0.5 ? "medium" : "low",
    distribution: bucketize(sorted, 18)
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function revenueConcentration(analyses: DealAnalysis[]): number {
  const total = analyses.reduce((sum, analysis) => sum + analysis.deal.amount, 0);
  const max = Math.max(0, ...analyses.map((analysis) => analysis.deal.amount));
  return max / Math.max(1, total);
}

function bucketize(sortedValues: number[], bucketCount: number): ForecastResult["distribution"] {
  const min = sortedValues[0] ?? 0;
  const max = sortedValues[sortedValues.length - 1] ?? 0;
  const width = Math.max(1, (max - min) / bucketCount);
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    bucketStart: Math.round(min + width * index),
    bucketEnd: Math.round(min + width * (index + 1)),
    count: 0
  }));

  for (const value of sortedValues) {
    const bucketIndex = Math.min(bucketCount - 1, Math.floor((value - min) / width));
    const bucket = buckets[bucketIndex];
    if (bucket) bucket.count += 1;
  }

  return buckets;
}
