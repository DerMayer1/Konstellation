import type { DealAnalysis } from "./domain/deal";

export function brierScore(analyses: readonly DealAnalysis[]): number | null {
  const labeled = analyses.filter((analysis) => analysis.deal.syntheticOutcome);
  if (labeled.length === 0) return null;
  const error = labeled.reduce((sum, analysis) => {
    const outcome = analysis.deal.syntheticOutcome === "won" ? 1 : 0;
    return sum + (analysis.adjustedProbability - outcome) ** 2;
  }, 0);
  return error / labeled.length;
}

export function calibrationBuckets(analyses: readonly DealAnalysis[], bucketSize = 0.2) {
  if (!Number.isFinite(bucketSize) || bucketSize <= 0 || bucketSize > 1) {
    throw new Error("bucketSize must be greater than 0 and less than or equal to 1");
  }

  const buckets = Array.from({ length: Math.ceil(1 / bucketSize) }, (_, index) => ({
    min: index * bucketSize,
    max: Math.min(1, (index + 1) * bucketSize),
    count: 0,
    averagePredicted: 0,
    actualCloseRate: 0
  }));

  for (const analysis of analyses) {
    if (!analysis.deal.syntheticOutcome) continue;
    const index = Math.min(buckets.length - 1, Math.floor(analysis.adjustedProbability / bucketSize));
    const bucket = buckets[index];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.averagePredicted += analysis.adjustedProbability;
    bucket.actualCloseRate += analysis.deal.syntheticOutcome === "won" ? 1 : 0;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    averagePredicted: bucket.count ? bucket.averagePredicted / bucket.count : 0,
    actualCloseRate: bucket.count ? bucket.actualCloseRate / bucket.count : 0
  }));
}

export function forecastError(predictedRevenue: number, actualRevenue: number): number {
  return Math.abs(predictedRevenue - actualRevenue);
}

export function meanAbsolutePercentageError(pairs: readonly { predicted: number; actual: number }[]): number | null {
  const valid = pairs.filter((pair) => pair.actual !== 0);
  if (valid.length === 0) return null;

  return (
    valid.reduce((sum, pair) => sum + Math.abs((pair.actual - pair.predicted) / pair.actual), 0) /
    valid.length
  );
}
