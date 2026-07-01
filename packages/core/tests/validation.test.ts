import { describe, expect, it } from "vitest";
import { parseDeal, safeParseDeal, safeParseDeals } from "../src";

const validDealInput = {
  id: "deal-1",
  accountName: "Acme Corp",
  ownerName: "Maya Chen",
  segment: "mid_market",
  amount: 80000,
  stage: "proposal",
  createdAt: "2026-04-12",
  closeDate: "2026-07-25",
  stageEnteredAt: "2026-06-14",
  lastActivityAt: null,
  nextStep: null,
  crmProbability: 0.6,
  ownerHistoricalWinRate: 0.48,
  averageSalesCycleDays: 70,
  source: "inbound"
} as const;

describe("deal validation schema", () => {
  it("parses a valid raw deal into a domain deal", () => {
    const deal = parseDeal(validDealInput);

    expect(deal.id).toBe("deal-1");
    expect(deal.createdAt).toBe("2026-04-12T00:00:00.000Z");
  });

  it("returns structured validation issues for invalid input", () => {
    const result = safeParseDeal({ ...validDealInput, amount: -10, crmProbability: 2 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(["amount", "crmProbability"]));
    }
  });

  it("requires at least one deal when parsing a collection", () => {
    const result = safeParseDeals([]);

    expect(result.success).toBe(false);
  });
});
