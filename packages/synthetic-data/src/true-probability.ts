import type { DealSource, DealStage } from "@constellation/core";

const stageQuality = {
  prospecting: 0.08,
  qualification: 0.18,
  demo: 0.34,
  proposal: 0.52,
  negotiation: 0.72,
  closed_won: 1,
  closed_lost: 0
} satisfies Record<DealStage, number>;

const sourceQuality = {
  inbound: 0,
  outbound: -0.05,
  partner: 0.08,
  referral: 0.12
} satisfies Record<DealSource, number>;

export function stagePrior(stage: DealStage): number {
  return stageQuality[stage];
}

export function syntheticTrueProbability(input: {
  readonly stage: DealStage;
  readonly ownerHistoricalWinRate: number;
  readonly source: DealSource;
  readonly inactiveDays: number;
  readonly averageSalesCycleDays: number;
  readonly hasNextStep: boolean;
}): number {
  const inactivity = input.inactiveDays / Math.max(1, input.averageSalesCycleDays);
  return clamp(
    stageQuality[input.stage] * 0.45 +
      input.ownerHistoricalWinRate * 0.32 +
      sourceQuality[input.source] -
      inactivity * 0.22 -
      (input.hasNextStep ? 0 : 0.16)
  );
}

export function clampProbability(value: number): number {
  return clamp(value);
}

function clamp(value: number): number {
  return Math.min(0.98, Math.max(0.02, value));
}
