import { describe, expect, it } from "vitest";
import {
  adjustProbabilityForRisk,
  calculateBaseProbability,
  createDeal,
  expectedRevenue,
  riskPenaltyGamma,
  type DealInput
} from "../src";

const baseDealInput: DealInput = {
  id: "deal-1",
  accountName: "Acme Corp",
  ownerName: "Maya Chen",
  segment: "mid_market",
  amount: 80000,
  stage: "proposal",
  createdAt: "2026-04-12T00:00:00.000Z",
  closeDate: "2026-07-25T00:00:00.000Z",
  stageEnteredAt: "2026-06-14T00:00:00.000Z",
  lastActivityAt: "2026-06-27T00:00:00.000Z",
  nextStep: "Review proposal",
  crmProbability: 0.6,
  ownerHistoricalWinRate: 0.48,
  averageSalesCycleDays: 70,
  source: "inbound"
};

describe("probability engine", () => {
  it("combines CRM, stage, owner and source priors into a bounded base probability", () => {
    const baseProbability = calculateBaseProbability(createDeal(baseDealInput));

    expect(baseProbability).toBeGreaterThan(0);
    expect(baseProbability).toBeLessThan(1);
  });

  it("penalizes base probability by operational risk", () => {
    const lowRiskProbability = adjustProbabilityForRisk(0.6, 0.1);
    const highRiskProbability = adjustProbabilityForRisk(0.6, 0.9);

    expect(riskPenaltyGamma).toBe(1.25);
    expect(highRiskProbability).toBeLessThan(lowRiskProbability);
  });

  it("calculates expected revenue per deal", () => {
    expect(expectedRevenue(80000, 0.25)).toBe(20000);
  });
});
