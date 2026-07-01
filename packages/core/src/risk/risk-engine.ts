import type { Deal, DealAnalysis } from "../domain/deal";
import { extractDealFeatures } from "../features/deal-features";
import { sigmoid } from "../math";
import { buildRiskDrivers, missingDataFor, riskLogitFromDrivers } from "./risk-drivers";
import { calculateBaseProbability, adjustProbabilityForRisk } from "./probability-engine";
import { expectedRevenue } from "./expected-revenue";
import { riskEngineVersion, riskLevel } from "./risk-policy";

export { riskEngineVersion, riskLevel } from "./risk-policy";
export {
  probabilityWeights,
  riskLevelThresholds,
  riskPenaltyGamma,
  riskWeights,
  segmentRisk,
  sourceProbability,
  stageProbability,
  stageRisk
} from "./risk-policy";
export { adjustProbabilityForRisk, calculateBaseProbability } from "./probability-engine";
export { buildRiskDrivers, normalizeRiskFeatures, riskLogitFromDrivers } from "./risk-drivers";
export { expectedRevenue } from "./expected-revenue";

export function analyzeDeals(deals: readonly Deal[], todayIso = new Date().toISOString()): DealAnalysis[] {
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

  const drivers = buildRiskDrivers(features);
  const z = riskLogitFromDrivers(drivers);
  const risk = sigmoid(z);
  const riskScore = Math.round(risk * 1000) / 10;
  const baseProbability = calculateBaseProbability(deal);
  const adjustedProbability = adjustProbabilityForRisk(baseProbability, risk);

  return {
    deal,
    features,
    riskScore,
    riskLevel: riskLevel(riskScore),
    riskDrivers: drivers,
    baseProbability,
    adjustedProbability,
    expectedRevenue: expectedRevenue(deal.amount, adjustedProbability),
    missingData: missingDataFor(deal)
  };
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
    expectedRevenue: expectedRevenue(deal.amount, adjustedProbability),
    missingData: missingDataFor(deal)
  };
}
