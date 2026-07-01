import { describe, expect, it } from "vitest";
import { importDealsFromCsv } from "../src";

const todayIso = "2026-07-01T12:00:00.000Z";

describe("CSV deal importer", () => {
  it("imports a valid CSV into validated domain deals", () => {
    const result = importDealsFromCsv(
      [
        "id,accountName,ownerName,segment,amount,stage,createdAt,closeDate,stageEnteredAt,lastActivityAt,nextStep,crmProbability,ownerHistoricalWinRate,averageSalesCycleDays,source",
        "deal-1,Acme Corp,Maya Chen,mid_market,80000,proposal,2026-04-12,2026-07-25,2026-06-14,2026-06-27,Review proposal,60%,0.48,70,inbound"
      ].join("\n"),
      { todayIso }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.deals).toHaveLength(1);
      expect(result.deals[0]!.accountName).toBe("Acme Corp");
      expect(result.deals[0]!.crmProbability).toBe(0.6);
    }
  });

  it("returns structured row issues for invalid CSV rows", () => {
    const result = importDealsFromCsv(
      [
        "id,accountName,ownerName,segment,amount,stage,createdAt,closeDate,stageEnteredAt,crmProbability,ownerHistoricalWinRate,averageSalesCycleDays,source",
        "deal-1,Acme Corp,Maya Chen,mid_market,not-a-number,proposal,2026-04-12,2026-07-25,2026-06-14,0.6,0.48,70,inbound"
      ].join("\n"),
      { todayIso }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0]).toMatchObject({ row: 2, field: "amount" });
    }
  });

  it("handles quoted commas in account names", () => {
    const result = importDealsFromCsv(
      [
        "accountName,amount",
        "\"Acme, Inc\",12000"
      ].join("\n"),
      { todayIso }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.deals[0]!.accountName).toBe("Acme, Inc");
    }
  });
});
