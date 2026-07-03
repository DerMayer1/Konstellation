import {
  riskEngineVersion,
  type AuditRecord,
  type DealAnalysis,
  type DealRecommendation,
  type ForecastResult,
  type InputHasher
} from "@constellation/core";
import {
  DeterministicRecommendationGateway,
  buildDeterministicAssessment,
  buildDeterministicRecommendation as buildDeterministicFromGatewayInput,
  buildDeterministicReport,
  mapReportToRecommendation
} from "./deterministic-gateway";
import { AiExecutionGuard } from "./execution-guard";
import type {
  AssessmentModelGateway,
  ModelMetadata,
  RecommendationGatewayResult,
  RecommendationModelGateway,
  ReportModelGateway,
  ValidatedRecommendationGatewayResult
} from "./model-gateway";
import { dealRecommendationPromptVersion } from "./prompt-policy";
import { buildRecommendationContext, shouldEscalateToHuman } from "./recommendation-context";
import { recommendationSchema } from "./recommendation-schema";
import { loadAiRuntimeConfig, type AiRuntimeConfig } from "./runtime-config";
import { createOpenAIRecommendationGatewayFromEnv } from "./openai-gateway";
import {
  aiDealAssessmentSchema,
  aiRecommendationReportSchema,
  type AiDealAssessment,
  type AiRecommendationReport
} from "./two-step-schema";

export type RecommendationServiceInput = {
  readonly analysis: DealAnalysis;
  readonly forecast: ForecastResult;
};

export type RecommendationServiceOutput = {
  readonly recommendation: DealRecommendation;
  readonly auditRecord: AuditRecord;
  readonly metadata: ModelMetadata;
  readonly status: "success" | "partial_fallback" | "fallback";
  readonly fallbackReason?: string;
};

export type RecommendationServiceOptions = {
  readonly gateway?: RecommendationModelGateway;
  readonly analysisGateway?: AssessmentModelGateway;
  readonly reportGateway?: ReportModelGateway;
  readonly fallbackGateway?: RecommendationModelGateway;
  readonly hasher?: InputHasher;
  readonly clock?: () => Date;
  readonly runtimeConfig?: Partial<AiRuntimeConfig>;
};

type StepRecord = NonNullable<ValidatedRecommendationGatewayResult["steps"]>[number];

export class RecommendationService {
  private readonly gateway: RecommendationModelGateway;
  private readonly analysisGateway: AssessmentModelGateway;
  private readonly reportGateway: ReportModelGateway;
  private readonly fallbackGateway: RecommendationModelGateway;
  private readonly deterministicGateway: DeterministicRecommendationGateway;
  private readonly hasher: InputHasher;
  private readonly clock: () => Date;
  private readonly runtimeConfig: AiRuntimeConfig;

  constructor(options: RecommendationServiceOptions = {}) {
    this.runtimeConfig = resolveRuntimeConfig(options.runtimeConfig);
    this.deterministicGateway = new DeterministicRecommendationGateway();
    this.gateway = options.gateway ?? this.deterministicGateway;
    this.fallbackGateway = options.fallbackGateway ?? this.deterministicGateway;
    this.analysisGateway = options.analysisGateway ?? gatewayWithAssessment(this.gateway) ?? this.deterministicGateway;
    this.reportGateway = options.reportGateway ?? gatewayWithReport(this.gateway) ?? this.deterministicGateway;
    this.hasher = options.hasher ?? new PortableStableHasher();
    this.clock = options.clock ?? (() => new Date());
  }

  async generate(input: RecommendationServiceInput): Promise<RecommendationServiceOutput> {
    const result = this.runtimeConfig.pipelineMode === "two_step"
      ? await this.generateTwoStep(input)
      : await this.generateValidated(input);
    const auditRecord = createAuditRecord(input.analysis, result.recommendation, {
      metadata: result.metadata,
      hasher: this.hasher,
      createdAt: this.clock().toISOString(),
      usage: result.metadata.usage,
      latencyMs: result.latencyMs,
      status: result.status,
      fallbackReason: result.fallbackReason,
      steps: result.steps
    });

    return {
      recommendation: result.recommendation,
      auditRecord,
      metadata: result.metadata,
      status: result.status,
      fallbackReason: result.fallbackReason
    };
  }

  private async generateValidated(input: RecommendationServiceInput): Promise<ValidatedRecommendationGatewayResult> {
    const guard = new AiExecutionGuard(this.runtimeConfig.maxCallsPerRequest);
    const context = buildRecommendationContext(input.analysis, input.forecast, {
      tone: this.runtimeConfig.recommendationTone,
      detailLevel: this.runtimeConfig.recommendationDetailLevel,
      maxActions: this.runtimeConfig.maxActions
    });
    const gatewayInput = { ...input, context };

    try {
      guard.reserve("recommendation");
      const result = await this.gateway.generate(gatewayInput);
      return {
        recommendation: enforceRecommendationPolicy(recommendationSchema.parse(result.output), input),
        metadata: result.metadata,
        latencyMs: result.latencyMs,
        status: "success",
        steps: [createStepRecord("recommendation", result, "success")]
      };
    } catch (error) {
      const fallback = await this.fallbackGateway.generate(gatewayInput);
      return {
        recommendation: enforceRecommendationPolicy(recommendationSchema.parse(fallback.output), input),
        metadata: fallback.metadata,
        latencyMs: fallback.latencyMs,
        status: "fallback",
        fallbackReason: errorMessage(error),
        steps: [createStepRecord("recommendation", fallback, "fallback", errorMessage(error))]
      };
    }
  }

  private async generateTwoStep(input: RecommendationServiceInput): Promise<ValidatedRecommendationGatewayResult> {
    const guard = new AiExecutionGuard(this.runtimeConfig.maxCallsPerRequest);
    const context = buildRecommendationContext(input.analysis, input.forecast, {
      tone: this.runtimeConfig.recommendationTone,
      detailLevel: this.runtimeConfig.recommendationDetailLevel,
      maxActions: this.runtimeConfig.maxActions
    });
    const gatewayInput = { ...input, context };
    const steps: StepRecord[] = [];
    const fallbackReasons: string[] = [];
    let fallbackCount = 0;

    let assessment: AiDealAssessment;
    try {
      guard.reserve("analysis");
      const result = await this.analysisGateway.generateAssessment(gatewayInput);
      assessment = aiDealAssessmentSchema.parse(result.output);
      steps.push(createStepRecord("analysis", result, "success"));
    } catch (error) {
      const reason = errorMessage(error);
      fallbackCount += 1;
      fallbackReasons.push(`analysis: ${reason}`);
      assessment = buildDeterministicAssessment(gatewayInput);
      steps.push(createSyntheticStepRecord("analysis", "fallback", reason));
    }

    let report: AiRecommendationReport;
    let reportResult: RecommendationGatewayResult | null = null;
    try {
      guard.reserve("report");
      reportResult = await this.reportGateway.generateReport({ ...gatewayInput, assessment });
      report = aiRecommendationReportSchema.parse(reportResult.output);
      steps.push(createStepRecord("report", reportResult, "success"));
    } catch (error) {
      const reason = errorMessage(error);
      fallbackCount += 1;
      fallbackReasons.push(`report: ${reason}`);
      report = buildDeterministicReport({ ...gatewayInput, assessment });
      reportResult = {
        output: report,
        metadata: {
          provider: "deterministic-fallback",
          modelName: "rules-from-engine-output"
        }
      };
      steps.push(createStepRecord("report", reportResult, "fallback", reason));
    }

    const recommendation = enforceRecommendationPolicy(
      mapReportToRecommendation(report, this.runtimeConfig.maxActions),
      input
    );

    return {
      recommendation,
      metadata: reportResult.metadata,
      latencyMs: totalLatency(steps),
      status: fallbackCount === 0 ? "success" : fallbackCount === 2 ? "fallback" : "partial_fallback",
      fallbackReason: fallbackReasons.length ? fallbackReasons.join("; ") : undefined,
      steps
    };
  }
}

export function createRecommendationServiceFromEnv(
  env: Record<string, string | undefined>,
  options: Omit<RecommendationServiceOptions, "gateway" | "runtimeConfig"> = {}
): RecommendationService {
  const runtimeConfig = loadAiRuntimeConfig(env);
  const openAiGateway = runtimeConfig.provider === "openai" ? createOpenAIRecommendationGatewayFromEnv(env) : null;
  const openAiAnalysisGateway = runtimeConfig.provider === "openai" ? createOpenAIRecommendationGatewayFromEnv(env, "analysis") : null;
  const openAiReportGateway = runtimeConfig.provider === "openai" ? createOpenAIRecommendationGatewayFromEnv(env, "report") : null;
  return new RecommendationService({
    ...options,
    runtimeConfig,
    gateway: openAiGateway ?? new DeterministicRecommendationGateway(),
    analysisGateway: openAiAnalysisGateway ?? undefined,
    reportGateway: openAiReportGateway ?? undefined
  });
}

export function buildDeterministicRecommendation(
  analysis: DealAnalysis,
  forecast: ForecastResult
): DealRecommendation {
  const context = buildRecommendationContext(analysis, forecast);
  return enforceRecommendationPolicy(
    buildDeterministicFromGatewayInput({ analysis, forecast, context }),
    { analysis, forecast }
  );
}

export function createAuditRecord(
  analysis: DealAnalysis,
  output: DealRecommendation,
  options: {
    readonly metadata?: ModelMetadata;
    readonly hasher?: InputHasher;
    readonly createdAt?: string;
    readonly usage?: AuditRecord["usage"];
    readonly latencyMs?: number;
    readonly status?: AuditRecord["status"];
    readonly fallbackReason?: string;
    readonly steps?: AuditRecord["steps"];
  } = {}
): AuditRecord {
  const metadata = options.metadata ?? {
    provider: "deterministic-fallback",
    modelName: "rules-from-engine-output"
  };
  const hasher = options.hasher ?? new PortableStableHasher();
  const inputHash = hasher.hash({
    deal: analysis.deal,
    features: analysis.features,
    riskScore: analysis.riskScore,
    riskDrivers: analysis.riskDrivers,
    baseProbability: analysis.baseProbability,
    adjustedProbability: analysis.adjustedProbability,
    expectedRevenue: analysis.expectedRevenue,
    missingData: analysis.missingData
  });

  return {
    id: `audit-${analysis.deal.id}-${inputHash.slice(0, 16)}`,
    dealId: analysis.deal.id,
    createdAt: options.createdAt ?? new Date("2026-07-01T12:00:00.000Z").toISOString(),
    riskEngineVersion,
    promptVersion: dealRecommendationPromptVersion,
    modelProvider: metadata.provider,
    modelName: metadata.modelName,
    inputHash,
    riskScore: analysis.riskScore,
    adjustedProbability: analysis.adjustedProbability,
    output,
    usage: options.usage,
    latencyMs: options.latencyMs,
    status: options.status,
    fallbackReason: options.fallbackReason,
    steps: options.steps
  };
}

function enforceRecommendationPolicy(
  recommendation: DealRecommendation,
  input: RecommendationServiceInput
): DealRecommendation {
  const context = buildRecommendationContext(input.analysis, input.forecast);
  const missing = Array.from(new Set([...recommendation.missingInformation, ...input.analysis.missingData]));

  return {
    ...recommendation,
    missingInformation: missing,
    shouldEscalateToHuman: recommendation.shouldEscalateToHuman || shouldEscalateToHuman(context)
  };
}

class PortableStableHasher implements InputHasher {
  hash(input: unknown): string {
    return fnv1a64(stableStringify(input));
  }
}

function stableStringify(input: unknown): string {
  return JSON.stringify(normalize(input));
}

function normalize(input: unknown): unknown {
  if (input === null || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map((item) => normalize(item));

  const record = input as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      const value = record[key];
      if (value !== undefined) accumulator[key] = normalize(value);
      return accumulator;
    }, {});
}

function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, "0");
}

function gatewayWithAssessment(gateway: RecommendationModelGateway): AssessmentModelGateway | null {
  const candidate = gateway as RecommendationModelGateway & Partial<AssessmentModelGateway>;
  return typeof candidate.generateAssessment === "function" ? candidate as AssessmentModelGateway : null;
}

function gatewayWithReport(gateway: RecommendationModelGateway): ReportModelGateway | null {
  const candidate = gateway as RecommendationModelGateway & Partial<ReportModelGateway>;
  return typeof candidate.generateReport === "function" ? candidate as ReportModelGateway : null;
}

function createStepRecord(
  step: "recommendation" | "analysis" | "report",
  result: RecommendationGatewayResult,
  status: "success" | "fallback",
  fallbackReason?: string
): NonNullable<ValidatedRecommendationGatewayResult["steps"]>[number] {
  return {
    step,
    provider: result.metadata.provider,
    modelName: result.metadata.modelName,
    status,
    usage: result.metadata.usage,
    latencyMs: result.latencyMs,
    fallbackReason
  };
}

function createSyntheticStepRecord(
  step: "recommendation" | "analysis" | "report",
  status: "success" | "fallback",
  fallbackReason?: string
): NonNullable<ValidatedRecommendationGatewayResult["steps"]>[number] {
  return {
    step,
    provider: "deterministic-fallback",
    modelName: "rules-from-engine-output",
    status,
    fallbackReason
  };
}

function totalLatency(steps: NonNullable<ValidatedRecommendationGatewayResult["steps"]>): number | undefined {
  const latencies = steps.map((step) => step.latencyMs).filter((latency): latency is number => latency !== undefined);
  return latencies.length ? latencies.reduce((sum, latency) => sum + latency, 0) : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown gateway failure";
}

function resolveRuntimeConfig(overrides: Partial<AiRuntimeConfig> | undefined): AiRuntimeConfig {
  const base = loadAiRuntimeConfig({});
  const merged = { ...base, ...overrides };
  if (overrides?.pipelineMode === "two_step" && overrides.maxCallsPerRequest === undefined) {
    return { ...merged, maxCallsPerRequest: 2 };
  }
  return merged;
}
