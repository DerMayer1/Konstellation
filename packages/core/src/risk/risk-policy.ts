import type { Deal, RiskLevel } from "../domain/deal";

export const riskEngineVersion = "risk-engine-v0.2.0";
export const riskPenaltyGamma = 1.25;

export const riskWeights = {
  intercept: -1.2,
  age: 0.9,
  inactivity: 1.4,
  closePressure: 1.1,
  stage: 1,
  segment: 0.4,
  amount: 0.5,
  owner: 0.7,
  missingNextStep: 1.2
} as const;

export const riskLevelThresholds = {
  critical: 85,
  high: 65,
  medium: 40
} as const;

export const stageRisk = {
  prospecting: 0.9,
  qualification: 0.75,
  demo: 0.55,
  proposal: 0.35,
  negotiation: 0.25,
  closed_won: 0,
  closed_lost: 1
} satisfies Record<Deal["stage"], number>;

export const segmentRisk = {
  smb: 0.2,
  mid_market: 0.35,
  enterprise: 0.55
} satisfies Record<Deal["segment"], number>;

export const stageProbability = {
  prospecting: 0.05,
  qualification: 0.15,
  demo: 0.3,
  proposal: 0.5,
  negotiation: 0.7,
  closed_won: 1,
  closed_lost: 0
} satisfies Record<Deal["stage"], number>;

export const sourceProbability = {
  inbound: 0.35,
  outbound: 0.18,
  partner: 0.45,
  referral: 0.55
} satisfies Record<Deal["source"], number>;

export const probabilityWeights = {
  crm: 0.35,
  stage: 0.3,
  owner: 0.2,
  source: 0.15
} as const;

export function riskLevel(score: number): RiskLevel {
  if (score >= riskLevelThresholds.critical) return "critical";
  if (score >= riskLevelThresholds.high) return "high";
  if (score >= riskLevelThresholds.medium) return "medium";
  return "low";
}
