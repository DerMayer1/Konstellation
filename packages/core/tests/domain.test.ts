import { describe, expect, it } from "vitest";
import {
  DomainValidationError,
  createDeal,
  createMoneyAmount,
  createNonEmptyString,
  createProbability
} from "../src";

const validDealInput = {
  id: "deal-1",
  accountName: " Acme Corp ",
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
} as const;

describe("domain primitives", () => {
  it("rejects invalid primitive values", () => {
    expect(() => createNonEmptyString("   ")).toThrow(DomainValidationError);
    expect(() => createMoneyAmount(0)).toThrow(DomainValidationError);
    expect(() => createProbability(1.1)).toThrow(DomainValidationError);
  });
});

describe("deal entity", () => {
  it("normalizes and freezes a valid deal", () => {
    const deal = createDeal(validDealInput);

    expect(deal.accountName).toBe("Acme Corp");
    expect(deal.createdAt).toBe("2026-04-12T00:00:00.000Z");
    expect(Object.isFrozen(deal)).toBe(true);
  });

  it("rejects invalid deal invariants", () => {
    expect(() => createDeal({ ...validDealInput, amount: -1 })).toThrow(DomainValidationError);
    expect(() => createDeal({ ...validDealInput, crmProbability: 1.5 })).toThrow(DomainValidationError);
    expect(() => createDeal({ ...validDealInput, averageSalesCycleDays: 0 })).toThrow(DomainValidationError);
  });
});
