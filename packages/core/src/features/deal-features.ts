import type { Deal, DealFeatures } from "../domain/deal";
import { clamp, daysBetween } from "../math";
import { segmentRisk, stageRisk } from "../risk/risk-policy";

export function extractDealFeatures(deal: Deal, maxAmount: number, todayIso: string): DealFeatures {
  const safeCycle = Math.max(1, deal.averageSalesCycleDays);
  const dealAgeDays = Math.max(0, daysBetween(deal.createdAt, todayIso));
  const stageAgeDays = Math.max(0, daysBetween(deal.stageEnteredAt, todayIso));
  const daysSinceLastActivity = deal.lastActivityAt
    ? Math.max(0, daysBetween(deal.lastActivityAt, todayIso))
    : null;
  const daysUntilClose = daysBetween(todayIso, deal.closeDate);
  const inactivityDays = daysSinceLastActivity ?? safeCycle;

  return {
    dealAgeDays,
    stageAgeDays,
    daysSinceLastActivity,
    daysUntilClose,
    salesCycleRatio: dealAgeDays / safeCycle,
    inactivityRatio: inactivityDays / safeCycle,
    closePressure: clamp(1 - Math.max(0, daysUntilClose) / 30),
    missingNextStep: !deal.nextStep || deal.nextStep.trim().length === 0,
    stageRisk: stageRisk[deal.stage],
    segmentRisk: segmentRisk[deal.segment],
    amountRisk: Math.log1p(deal.amount) / Math.max(1, Math.log1p(maxAmount)),
    ownerRisk: 1 - clamp(deal.ownerHistoricalWinRate)
  };
}

export { segmentRisk, stageRisk };
