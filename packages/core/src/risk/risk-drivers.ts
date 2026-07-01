import type { Deal, DealFeatures, RiskDriver } from "../domain/deal";
import { clamp } from "../math";
import { riskWeights } from "./risk-policy";

export type NormalizedRiskFeatures = {
  readonly age: number;
  readonly inactivity: number;
  readonly closePressure: number;
  readonly stage: number;
  readonly segment: number;
  readonly amount: number;
  readonly owner: number;
  readonly missingNextStep: number;
};

export function normalizeRiskFeatures(features: DealFeatures): NormalizedRiskFeatures {
  return {
    age: clamp(features.salesCycleRatio),
    inactivity: clamp(features.inactivityRatio),
    closePressure: clamp(features.closePressure),
    stage: clamp(features.stageRisk),
    segment: clamp(features.segmentRisk),
    amount: clamp(features.amountRisk),
    owner: clamp(features.ownerRisk),
    missingNextStep: features.missingNextStep ? 1 : 0
  };
}

export function buildRiskDrivers(features: DealFeatures): RiskDriver[] {
  const normalized = normalizeRiskFeatures(features);
  return [
    driver("missingNextStep", "Missing next step", normalized.missingNextStep, riskWeights.missingNextStep, "No explicit next action is recorded."),
    driver("inactivity", "Inactivity", normalized.inactivity, riskWeights.inactivity, "Recent activity is weak relative to the expected sales cycle."),
    driver("closePressure", "Close pressure", normalized.closePressure, riskWeights.closePressure, "The close date is near, raising execution risk."),
    driver("age", "Deal age above cycle", normalized.age, riskWeights.age, "The deal is aging relative to the average sales cycle."),
    driver("stage", "Stage uncertainty", normalized.stage, riskWeights.stage, "Current stage carries structural uncertainty."),
    driver("owner", "Owner historical win rate", normalized.owner, riskWeights.owner, "The owner win rate reduces confidence."),
    driver("amount", "Large deal concentration", normalized.amount, riskWeights.amount, "Large deal size increases forecast impact."),
    driver("segment", "Segment variance", normalized.segment, riskWeights.segment, "Segment profile adds variance to the forecast.")
  ].sort((a, b) => b.contribution - a.contribution);
}

export function riskLogitFromDrivers(drivers: readonly RiskDriver[]): number {
  return riskWeights.intercept + drivers.reduce((sum, item) => sum + item.contribution, 0);
}

export function missingDataFor(deal: Deal): string[] {
  const missing: string[] = [];
  if (!deal.lastActivityAt) missing.push("lastActivityAt");
  if (!deal.nextStep) missing.push("nextStep");
  return missing;
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
    contribution: roundContribution(value * weight),
    explanation
  };
}

function roundContribution(value: number): number {
  return Math.round(value * 100) / 100;
}
