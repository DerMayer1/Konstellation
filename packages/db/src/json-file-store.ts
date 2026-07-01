import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  parseDeals,
  type AuditRecord,
  type AuditRepository,
  type Deal,
  type DealRepository
} from "@constellation/core";

type StoreShape = {
  readonly deals: unknown[];
  readonly auditRecords: AuditRecord[];
};

const emptyStore: StoreShape = {
  deals: [],
  auditRecords: []
};

export class JsonFileDealRepository implements DealRepository {
  constructor(private readonly filePath: string) {}

  async saveMany(deals: readonly Deal[]): Promise<void> {
    const store = await readStore(this.filePath);
    const byId = new Map<string, unknown>();

    for (const existing of store.deals) {
      const id = readId(existing);
      if (id) byId.set(id, existing);
    }

    for (const deal of deals) {
      byId.set(deal.id, deal);
    }

    await writeStore(this.filePath, { ...store, deals: [...byId.values()] });
  }

  async listAll(): Promise<readonly Deal[]> {
    const store = await readStore(this.filePath);
    return parseDeals(store.deals);
  }

  async findById(id: string): Promise<Deal | null> {
    const deals = await this.listAll();
    return deals.find((deal) => deal.id === id) ?? null;
  }
}

export class JsonFileAuditRepository implements AuditRepository {
  constructor(private readonly filePath: string) {}

  async save(record: AuditRecord): Promise<void> {
    const store = await readStore(this.filePath);
    await writeStore(this.filePath, {
      ...store,
      auditRecords: [...store.auditRecords, record]
    });
  }

  async listByDealId(dealId: string): Promise<readonly AuditRecord[]> {
    const store = await readStore(this.filePath);
    return store.auditRecords.filter((record) => record.dealId === dealId);
  }

  async listAll(): Promise<readonly AuditRecord[]> {
    const store = await readStore(this.filePath);
    return store.auditRecords;
  }
}

export async function resetJsonStore(filePath: string): Promise<void> {
  await writeStore(filePath, emptyStore);
}

async function readStore(filePath: string): Promise<StoreShape> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      deals: Array.isArray(parsed.deals) ? parsed.deals : [],
      auditRecords: Array.isArray(parsed.auditRecords) ? parsed.auditRecords : []
    };
  } catch (error) {
    if (isMissingFile(error)) return emptyStore;
    throw error;
  }
}

async function writeStore(filePath: string, store: StoreShape): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function readId(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const id = (input as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}
