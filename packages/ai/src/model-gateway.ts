import type { DealAnalysis, DealRecommendation, ForecastResult } from "@constellation/core";
import type { RecommendationContext } from "./recommendation-context";
import type { AiDealAssessment } from "./two-step-schema";

export type ModelMetadata = {
  readonly provider: string;
  readonly modelName: string;
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly totalTokens?: number;
  };
};

export type RecommendationGatewayInput = {
  readonly analysis: DealAnalysis;
  readonly forecast: ForecastResult;
  readonly context: RecommendationContext;
};

export type RecommendationGatewayResult = {
  readonly output: unknown;
  readonly metadata: ModelMetadata;
  readonly latencyMs?: number;
};

export type RecommendationModelGateway = {
  generate(input: RecommendationGatewayInput): Promise<RecommendationGatewayResult>;
};

export type AssessmentModelGateway = {
  generateAssessment(input: RecommendationGatewayInput): Promise<RecommendationGatewayResult>;
};

export type ReportGatewayInput = RecommendationGatewayInput & {
  readonly assessment: AiDealAssessment;
};

export type ReportModelGateway = {
  generateReport(input: ReportGatewayInput): Promise<RecommendationGatewayResult>;
};

export type ValidatedRecommendationGatewayResult = {
  readonly recommendation: DealRecommendation;
  readonly metadata: ModelMetadata;
  readonly latencyMs?: number;
  readonly status: "success" | "partial_fallback" | "fallback";
  readonly fallbackReason?: string;
  readonly steps?: readonly {
    readonly step: "recommendation" | "analysis" | "report";
    readonly provider: string;
    readonly modelName: string;
    readonly status: "success" | "fallback";
    readonly usage?: ModelMetadata["usage"];
    readonly latencyMs?: number;
    readonly fallbackReason?: string;
  }[];
};
