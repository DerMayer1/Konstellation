import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createDeal, type AuditRecord } from "@constellation/core";
import {
  InMemoryAuditRepository,
  InMemoryDealRepository,
  JsonFileAuditRepository,
  JsonFileDealRepository,
  StableInputHasher,
  resetJsonStore,
  seedSyntheticDeals
} from "../src";

const deal = createDeal({
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
});

const auditRecord: AuditRecord = {
  id: "audit-1",
  dealId: "deal-1",
  createdAt: "2026-07-01T12:00:00.000Z",
  riskEngineVersion: "risk-engine-v0.2.0",
  promptVersion: "deal-recommendation-v0.1.0",
  modelProvider: "deterministic-fallback",
  modelName: "rules-from-engine-output",
  inputHash: "hash",
  riskScore: 72,
  adjustedProbability: 0.33,
  output: {
    executiveSummary: "Summary",
    riskExplanation: "Explanation",
    nextBestActions: [],
    missingInformation: [],
    confidence: "medium",
    shouldEscalateToHuman: false
  }
};

describe("in-memory repositories", () => {
  it("saves and retrieves deals", async () => {
    const repository = new InMemoryDealRepository();
    await repository.saveMany([deal]);

    expect(await repository.findById("deal-1")).toEqual(deal);
    expect(await repository.listAll()).toHaveLength(1);
  });

  it("saves and retrieves audit records by deal", async () => {
    const repository = new InMemoryAuditRepository();
    await repository.save(auditRecord);

    expect(await repository.listByDealId("deal-1")).toEqual([auditRecord]);
    expect(await repository.listByDealId("missing")).toEqual([]);
  });
});

describe("JSON file repositories", () => {
  it("persists deals and audit records to disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "constellation-db-"));
    const filePath = join(dir, "store.json");

    try {
      await resetJsonStore(filePath);
      await new JsonFileDealRepository(filePath).saveMany([deal]);
      await new JsonFileAuditRepository(filePath).save(auditRecord);

      expect(await new JsonFileDealRepository(filePath).findById("deal-1")).toMatchObject({ id: "deal-1" });
      expect(await new JsonFileAuditRepository(filePath).listByDealId("deal-1")).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("seeds synthetic deals into a JSON store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "constellation-seed-"));
    const filePath = join(dir, "store.json");

    try {
      const result = await seedSyntheticDeals(filePath);
      const deals = await new JsonFileDealRepository(filePath).listAll();

      expect(result.scenarioCount).toBe(5);
      expect(result.dealCount).toBe(deals.length);
      expect(deals.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("stable input hasher", () => {
  it("creates stable SHA-256 hashes independent of object key order", () => {
    const hasher = new StableInputHasher();

    expect(hasher.hash({ b: 2, a: 1 })).toBe(hasher.hash({ a: 1, b: 2 }));
    expect(hasher.hash({ a: 1 })).toHaveLength(64);
  });
});
