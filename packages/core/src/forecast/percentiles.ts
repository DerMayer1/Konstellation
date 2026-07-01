export function percentile(sortedValues: readonly number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const bounded = Math.min(1, Math.max(0, p));
  const index = Math.min(sortedValues.length - 1, Math.floor(bounded * sortedValues.length));
  return sortedValues[index] ?? 0;
}

export function summarizePercentiles(sortedValues: readonly number[]) {
  const p10 = percentile(sortedValues, 0.1);
  const p25 = percentile(sortedValues, 0.25);
  const p50 = percentile(sortedValues, 0.5);
  const p75 = percentile(sortedValues, 0.75);
  const p90 = percentile(sortedValues, 0.9);

  return { p10, p25, p50, p75, p90 };
}
