import type { ForecastResult } from "../domain/deal";

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: readonly number[], mean = average(values)): number {
  if (values.length === 0) return 0;
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

export function bucketize(sortedValues: readonly number[], bucketCount: number): ForecastResult["distribution"] {
  const safeBucketCount = Math.max(1, Math.floor(bucketCount));
  const min = sortedValues[0] ?? 0;
  const max = sortedValues[sortedValues.length - 1] ?? min;
  const width = Math.max(1, (max - min) / safeBucketCount);
  const buckets = Array.from({ length: safeBucketCount }, (_, index) => ({
    bucketStart: Math.round(min + width * index),
    bucketEnd: Math.round(min + width * (index + 1)),
    count: 0
  }));

  for (const value of sortedValues) {
    const bucketIndex = Math.min(safeBucketCount - 1, Math.floor((value - min) / width));
    const bucket = buckets[bucketIndex];
    if (bucket) bucket.count += 1;
  }

  return buckets;
}
