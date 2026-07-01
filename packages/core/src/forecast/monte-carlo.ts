import type { DealAnalysis, ForecastResult } from "../domain/deal";
import { DomainValidationError } from "../domain/primitives";
import { seededRandom } from "../math";
import { average, bucketize, standardDeviation } from "./distribution";
import {
  coefficientOfVariation,
  confidenceLevel,
  forecastConfidenceScore,
  missingDataRatio,
  revenueConcentration
} from "./forecast-confidence";
import { summarizePercentiles } from "./percentiles";

export function runMonteCarloForecast(
  analyses: readonly DealAnalysis[],
  targetRevenue: number,
  simulationCount = 10000,
  seed = 42
): ForecastResult {
  assertForecastInputs(targetRevenue, simulationCount);

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
  const standardDeviationValue = standardDeviation(revenues, expectedRevenue);
  const { p10, p25, p50, p75, p90 } = summarizePercentiles(sorted);
  const probabilityOfHittingTarget =
    revenues.filter((value) => value >= targetRevenue).length / simulationCount;

  const confidenceScore =
    analyses.length === 0
      ? 0
      : forecastConfidenceScore({
          concentration: revenueConcentration(analyses),
          missingDataRatio: missingDataRatio(analyses),
          coefficientOfVariation: coefficientOfVariation(standardDeviationValue, expectedRevenue)
        });

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
    standardDeviation: standardDeviationValue,
    confidenceScore,
    confidence: confidenceLevel(confidenceScore),
    distribution: bucketize(sorted, 18)
  };
}

function assertForecastInputs(targetRevenue: number, simulationCount: number): void {
  if (!Number.isFinite(targetRevenue) || targetRevenue < 0) {
    throw new DomainValidationError("targetRevenue must be a non-negative finite number");
  }

  if (!Number.isInteger(simulationCount) || simulationCount <= 0) {
    throw new DomainValidationError("simulationCount must be a positive integer");
  }
}
