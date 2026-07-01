import type { Deal } from "../domain/deal";
import { logit, sigmoid } from "../math";
import { probabilityWeights, riskPenaltyGamma, sourceProbability, stageProbability } from "./risk-policy";

export function calculateBaseProbability(deal: Deal): number {
  if (deal.stage === "closed_won") return 1;
  if (deal.stage === "closed_lost") return 0;

  const combinedLogit =
    probabilityWeights.crm * logit(deal.crmProbability) +
    probabilityWeights.stage * logit(stageProbability[deal.stage]) +
    probabilityWeights.owner * logit(deal.ownerHistoricalWinRate) +
    probabilityWeights.source * logit(sourceProbability[deal.source]);

  return sigmoid(combinedLogit);
}

export function adjustProbabilityForRisk(baseProbability: number, risk: number): number {
  return sigmoid(logit(baseProbability) - riskPenaltyGamma * risk);
}
