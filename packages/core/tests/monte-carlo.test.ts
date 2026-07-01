import { describe, expect, it } from "vitest";
import { createDeal, runMonteCarloForecast, type DealAnalysis } from "../src";

function analysis(id: string, amount: number, probability: number): DealAnalysis {
  return {
    deal: createDeal({
      id,
      accountName: id,
      ownerName: "Owner",
      segment: "smb",
      amount,
      stage: "proposal",
      createdAt: "2026-06-01T00:00:00.000Z",
      closeDate: "2026-07-15T00:00:00.000Z",
      stageEnteredAt: "2026-06-15T00:00:00.000Z",
      lastActivityAt: "2026-06-29T00:00:00.000Z",
      nextStep: "Call",
      crmProbability: probability,
      ownerHistoricalWinRate: probability,
      averageSalesCycleDays: 50,
      source: "inbound"
    }),
    features: {
      dealAgeDays: 0,
      stageAgeDays: 0,
      daysSinceLastActivity: 0,
      daysUntilClose: 0,
      salesCycleRatio: 0,
      inactivityRatio: 0,
      closePressure: 0,
      missingNextStep: false,
      stageRisk: 0,
      segmentRisk: 0,
      amountRisk: 0,
      ownerRisk: 0
    },
    riskScore: 0,
    riskLevel: "low",
    riskDrivers: [],
    baseProbability: probability,
    adjustedProbability: probability,
    expectedRevenue: amount * probability,
    missingData: []
  };
}

describe("monte carlo forecast", () => {
  it("returns all revenue when every deal has probability 1", () => {
    const forecast = runMonteCarloForecast([analysis("a", 100, 1), analysis("b", 200, 1)], 250, 100, 1);
    expect(forecast.expectedRevenue).toBe(300);
    expect(forecast.probabilityOfHittingTarget).toBe(1);
  });

  it("returns no revenue when every deal has probability 0", () => {
    const forecast = runMonteCarloForecast([analysis("a", 100, 0), analysis("b", 200, 0)], 1, 100, 1);
    expect(forecast.expectedRevenue).toBe(0);
    expect(forecast.probabilityOfHittingTarget).toBe(0);
  });

  it("keeps percentiles ordered and probability bounded", () => {
    const forecast = runMonteCarloForecast([analysis("a", 100, 0.5), analysis("b", 200, 0.25)], 150, 1000, 1);
    expect(forecast.p10).toBeLessThanOrEqual(forecast.p50);
    expect(forecast.p50).toBeLessThanOrEqual(forecast.p90);
    expect(forecast.probabilityOfHittingTarget).toBeGreaterThanOrEqual(0);
    expect(forecast.probabilityOfHittingTarget).toBeLessThanOrEqual(1);
  });
});
