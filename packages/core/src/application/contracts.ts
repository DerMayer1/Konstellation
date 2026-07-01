import type { AuditRecord } from "../domain/audit";
import type { Deal, DealInput } from "../domain/deal";
import type { ForecastResult } from "../domain/forecast";
import type { DealRecommendation } from "../domain/recommendation";
import type { DealAnalysis } from "../domain/risk";

export type UseCase<Input, Output> = {
  execute(input: Input): Promise<Output> | Output;
};

export type Clock = {
  now(): Date;
};

export type IdGenerator = {
  generate(): string;
};

export type InputHasher = {
  hash(input: unknown): string;
};

export type DealRepository = {
  saveMany(deals: readonly Deal[]): Promise<void>;
  listAll(): Promise<readonly Deal[]>;
  findById(id: string): Promise<Deal | null>;
};

export type AuditRepository = {
  save(record: AuditRecord): Promise<void>;
  listByDealId(dealId: string): Promise<readonly AuditRecord[]>;
};

export type ImportDealsInput = {
  readonly records: readonly DealInput[];
};

export type ImportDealsOutput = {
  readonly deals: readonly Deal[];
};

export type AnalyzeDealsInput = {
  readonly deals: readonly Deal[];
  readonly todayIso: string;
};

export type AnalyzeDealsOutput = {
  readonly analyses: readonly DealAnalysis[];
};

export type ForecastPipelineInput = {
  readonly analyses: readonly DealAnalysis[];
  readonly targetRevenue: number;
  readonly simulationCount: number;
  readonly seed: number;
};

export type ForecastPipelineOutput = {
  readonly forecast: ForecastResult;
};

export type GenerateDealRecommendationInput = {
  readonly analysis: DealAnalysis;
  readonly forecast: ForecastResult;
};

export type GenerateDealRecommendationOutput = {
  readonly recommendation: DealRecommendation;
  readonly auditRecord: AuditRecord;
};

export type ModelGateway = {
  generateStructuredRecommendation(input: GenerateDealRecommendationInput): Promise<DealRecommendation>;
};
