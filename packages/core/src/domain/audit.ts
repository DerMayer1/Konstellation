import type { DealRecommendation } from "./recommendation";

export type AuditRecord = {
  readonly id: string;
  readonly dealId: string;
  readonly createdAt: string;
  readonly riskEngineVersion: string;
  readonly promptVersion: string;
  readonly modelProvider: string;
  readonly modelName: string;
  readonly inputHash: string;
  readonly riskScore: number;
  readonly adjustedProbability: number;
  readonly output: DealRecommendation;
};
