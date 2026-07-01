export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function logit(probability: number): number {
  const p = clamp(probability, 0.001, 0.999);
  return Math.log(p / (1 - p));
}

export function daysBetween(fromIso: string, toIso: string): number {
  const day = 24 * 60 * 60 * 1000;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  return Math.round((to - from) / day);
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.floor(p * sortedValues.length));
  return sortedValues[index] ?? 0;
}

export function formatDriverValue(value: number): string {
  return value.toFixed(2);
}
