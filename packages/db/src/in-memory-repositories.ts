import type { AuditRecord, AuditRepository, Deal, DealRepository } from "@constellation/core";

export class InMemoryDealRepository implements DealRepository {
  private readonly deals = new Map<string, Deal>();

  async saveMany(deals: readonly Deal[]): Promise<void> {
    for (const deal of deals) {
      this.deals.set(deal.id, deal);
    }
  }

  async listAll(): Promise<readonly Deal[]> {
    return [...this.deals.values()];
  }

  async findById(id: string): Promise<Deal | null> {
    return this.deals.get(id) ?? null;
  }

  async clear(): Promise<void> {
    this.deals.clear();
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly records: AuditRecord[] = [];

  async save(record: AuditRecord): Promise<void> {
    this.records.push(record);
  }

  async listByDealId(dealId: string): Promise<readonly AuditRecord[]> {
    return this.records.filter((record) => record.dealId === dealId);
  }

  async listAll(): Promise<readonly AuditRecord[]> {
    return [...this.records];
  }

  async clear(): Promise<void> {
    this.records.length = 0;
  }
}
