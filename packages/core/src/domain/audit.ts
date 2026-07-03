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
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly totalTokens?: number;
  };
  readonly latencyMs?: number;
  readonly status?: "success" | "partial_fallback" | "fallback" | "failed";
  readonly fallbackReason?: string;
  readonly steps?: readonly {
    readonly step: "recommendation" | "analysis" | "report";
    readonly provider: string;
    readonly modelName: string;
    readonly status: "success" | "fallback";
    readonly usage?: {
      readonly inputTokens?: number;
      readonly outputTokens?: number;
      readonly totalTokens?: number;
    };
    readonly latencyMs?: number;
    readonly fallbackReason?: string;
  }[];
};
