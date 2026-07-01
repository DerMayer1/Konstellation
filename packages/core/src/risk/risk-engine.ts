import type { Deal, DealAnalysis, RiskDriver, RiskLevel } from "../domain/deal";
import { extractDealFeatures } from "../features/deal-features";
import { clamp, logit, sigmoid } from "../math";

export const riskEngineVersion = "risk-engine-v0.1.0";

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
};

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
};

export function riskLevel(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function analyzeDeals(deals: Deal[], todayIso = new Date().toISOString()): DealAnalysis[] {
  const maxAmount = Math.max(1, ...deals.map((deal) => deal.amount));
  return deals.map((deal) => analyzeDeal(deal, maxAmount, todayIso));
}

export function analyzeDeal(deal: Deal, maxAmount: number, todayIso: string): DealAnalysis {
  const features = extractDealFeatures(deal, maxAmount, todayIso);

  if (deal.stage === "closed_won") {
    return closedAnalysis(deal, features, 0, 1);
  }

  if (deal.stage === "closed_lost") {
    return closedAnalysis(deal, features, 100, 0);
  }

  const normalized = {
    age: clamp(features.salesCycleRatio),
    inactivity: clamp(features.inactivityRatio),
    closePressure: features.closePressure,
    stage: features.stageRisk,
    segment: features.segmentRisk,
    amount: features.amountRisk,
    owner: features.ownerRisk,
    missingNextStep: features.missingNextStep ? 1 : 0
  };

  const drivers: RiskDriver[] = [
    driver("missingNextStep", "Missing next step", normalized.missingNextStep, riskWeights.missingNextStep, "No explicit next action is recorded."),
    driver("inactivity", "Inactivity", normalized.inactivity, riskWeights.inactivity, "Recent activity is weak relative to the expected sales cycle."),
    driver("closePressure", "Close pressure", normalized.closePressure, riskWeights.closePressure, "The close date is near, raising execution risk."),
    driver("age", "Deal age above cycle", normalized.age, riskWeights.age, "The deal is aging relative to the average sales cycle."),
    driver("stage", "Stage uncertainty", normalized.stage, riskWeights.stage, "Current stage carries structural uncertainty."),
    driver("owner", "Owner historical win rate", normalized.owner, riskWeights.owner, "The owner win rate reduces confidence."),
    driver("amount", "Large deal concentration", normalized.amount, riskWeights.amount, "Large deal size increases forecast impact."),
    driver("segment", "Segment variance", normalized.segment, riskWeights.segment, "Segment profile adds variance to the forecast.")
  ].sort((a, b) => b.contribution - a.contribution);

  const z = riskWeights.intercept + drivers.reduce((sum, item) => sum + item.contribution, 0);
  const risk = sigmoid(z);
  const riskScore = Math.round(risk * 1000) / 10;
  const baseProbability = calculateBaseProbability(deal);
  const adjustedProbability = sigmoid(logit(baseProbability) - 1.25 * risk);

  return {
    deal,
    features,
    riskScore,
    riskLevel: riskLevel(riskScore),
    riskDrivers: drivers,
    baseProbability,
    adjustedProbability,
    expectedRevenue: deal.amount * adjustedProbability,
    missingData: missingDataFor(deal)
  };
}

function calculateBaseProbability(deal: Deal): number {
  const combinedLogit =
    probabilityWeights.crm * logit(deal.crmProbability) +
    probabilityWeights.stage * logit(stageProbability[deal.stage]) +
    probabilityWeights.owner * logit(deal.ownerHistoricalWinRate) +
    probabilityWeights.source * logit(sourceProbability[deal.source]);
  return sigmoid(combinedLogit);
}

function closedAnalysis(
  deal: Deal,
  features: DealAnalysis["features"],
  riskScore: number,
  adjustedProbability: number
): DealAnalysis {
  return {
    deal,
    features,
    riskScore,
    riskLevel: riskLevel(riskScore),
    riskDrivers: [],
    baseProbability: adjustedProbability,
    adjustedProbability,
    expectedRevenue: deal.amount * adjustedProbability,
    missingData: missingDataFor(deal)
  };
}

function driver(
  key: string,
  label: string,
  value: number,
  weight: number,
  explanation: string
): RiskDriver {
  return {
    key,
    label,
    value,
    weight,
    contribution: Math.round(value * weight * 100) / 100,
    explanation
  };
}

function missingDataFor(deal: Deal): string[] {
  const missing: string[] = [];
  if (!deal.lastActivityAt) missing.push("lastActivityAt");
  if (!deal.nextStep) missing.push("nextStep");
  if (!deal.averageSalesCycleDays) missing.push("averageSalesCycleDays");
  return missing;
}
