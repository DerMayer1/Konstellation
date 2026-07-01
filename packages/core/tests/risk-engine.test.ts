import { describe, expect, it } from "vitest";
import { analyzeDeals, createDeal, type DealInput } from "../src";

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

const today = "2026-07-01T00:00:00.000Z";

describe("risk engine", () => {
  it("increases risk when activity is stale", () => {
    const [fresh, stale] = analyzeDeals([
      createDeal(baseDealInput),
      createDeal({ ...baseDealInput, id: "stale", lastActivityAt: "2026-05-12T00:00:00.000Z" })
    ], today);

    expect(stale!.riskScore).toBeGreaterThan(fresh!.riskScore);
  });

  it("increases risk when next step is missing", () => {
    const [withNextStep, withoutNextStep] = analyzeDeals([
      createDeal(baseDealInput),
      createDeal({ ...baseDealInput, id: "missing", nextStep: null })
    ], today);

    expect(withoutNextStep!.riskScore).toBeGreaterThan(withNextStep!.riskScore);
  });

  it("increases risk when close date is near", () => {
    const [comfortable, urgent] = analyzeDeals([
      createDeal({ ...baseDealInput, id: "comfortable", closeDate: "2026-08-20T00:00:00.000Z" }),
      createDeal({ ...baseDealInput, id: "urgent", closeDate: "2026-07-03T00:00:00.000Z" })
    ], today);

    expect(urgent!.riskScore).toBeGreaterThan(comfortable!.riskScore);
  });

  it("increases risk when owner win rate is low", () => {
    const [strongOwner, weakOwner] = analyzeDeals([
      createDeal({ ...baseDealInput, id: "strong-owner", ownerHistoricalWinRate: 0.75 }),
      createDeal({ ...baseDealInput, id: "weak-owner", ownerHistoricalWinRate: 0.25 })
    ], today);

    expect(weakOwner!.riskScore).toBeGreaterThan(strongOwner!.riskScore);
  });

  it("reduces adjusted probability when operational risk increases", () => {
    const [healthy, risky] = analyzeDeals([
      createDeal(baseDealInput),
      createDeal({
        ...baseDealInput,
        id: "risky",
        lastActivityAt: null,
        nextStep: null,
        closeDate: "2026-07-02T00:00:00.000Z"
      })
    ], today);

    expect(risky!.baseProbability).toBeCloseTo(healthy!.baseProbability, 6);
    expect(risky!.adjustedProbability).toBeLessThan(healthy!.adjustedProbability);
  });

  it("treats closed won and closed lost as terminal states", () => {
    const [won, lost] = analyzeDeals([
      createDeal({ ...baseDealInput, id: "won", stage: "closed_won" }),
      createDeal({ ...baseDealInput, id: "lost", stage: "closed_lost" })
    ], today);

    expect(won!.riskScore).toBe(0);
    expect(won!.adjustedProbability).toBe(1);
    expect(lost!.riskScore).toBe(100);
    expect(lost!.adjustedProbability).toBe(0);
  });
});
