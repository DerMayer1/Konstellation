import type { Segment } from "@constellation/core";
import type { ScenarioBias } from "./scenarios";

export const segmentAmountParams = {
  smb: { mu: 9.5, sigma: 0.4 },
  mid_market: { mu: 10.8, sigma: 0.5 },
  enterprise: { mu: 12.0, sigma: 0.6 }
} satisfies Record<Segment, { mu: number; sigma: number }>;

export function amountForSegment(segment: Segment, random: () => number, bias: ScenarioBias): number {
  const { mu, sigma } = segmentAmountParams[segment];
  const standardNormal = boxMuller(random);
  const amount = Math.exp(mu + sigma * standardNormal);
  const multiplier = bias === "enterprise" && segment === "enterprise" ? 1.35 : 1;
  return Math.max(1000, Math.round((amount * multiplier) / 1000) * 1000);
}

function boxMuller(random: () => number): number {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
