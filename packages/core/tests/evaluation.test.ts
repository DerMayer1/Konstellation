import { describe, expect, it } from "vitest";
import {
  brierScore,
  calibrationBuckets,
  createDeal,
  forecastError,
  meanAbsolutePercentageError,
  type DealAnalysis
} from "../src";

function analysis(id: string, probability: number, syntheticOutcome: "won" | "lost"): DealAnalysis {
  return {
    deal: createDeal({
      id,
      accountName: id,
      ownerName: "Owner",
      segment: "smb",
      amount: 1000,
      stage: syntheticOutcome === "won" ? "closed_won" : "closed_lost",
      createdAt: "2026-06-01T00:00:00.000Z",
      closeDate: "2026-07-15T00:00:00.000Z",
      stageEnteredAt: "2026-06-15T00:00:00.000Z",
      lastActivityAt: "2026-06-29T00:00:00.000Z",
      nextStep: "Call",
      crmProbability: probability,
      ownerHistoricalWinRate: probability,
      averageSalesCycleDays: 50,
      source: "inbound",
      syntheticOutcome
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
    expectedRevenue: 1000 * probability,
    missingData: []
  };
}

describe("evaluation metrics", () => {
  it("calculates Brier score against synthetic outcomes", () => {
    const score = brierScore([analysis("a", 0.8, "won"), analysis("b", 0.3, "lost")]);

    expect(score).toBeCloseTo(((0.8 - 1) ** 2 + (0.3 - 0) ** 2) / 2, 6);
  });

  it("calculates calibration buckets", () => {
    const buckets = calibrationBuckets([
      analysis("a", 0.1, "lost"),
      analysis("b", 0.3, "won"),
      analysis("c", 0.7, "won")
    ]);

    expect(buckets[0]!.count).toBe(1);
    expect(buckets[1]!.averagePredicted).toBeCloseTo(0.3, 6);
    expect(buckets[3]!.actualCloseRate).toBe(1);
  });

  it("calculates forecast error and MAPE", () => {
    expect(forecastError(900, 1000)).toBe(100);
    expect(meanAbsolutePercentageError([{ predicted: 900, actual: 1000 }, { predicted: 220, actual: 200 }])).toBeCloseTo(0.1, 6);
  });

  it("returns null MAPE when all actual values are zero", () => {
    expect(meanAbsolutePercentageError([{ predicted: 100, actual: 0 }])).toBeNull();
  });
});
