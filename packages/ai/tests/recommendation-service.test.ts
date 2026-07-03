import { describe, expect, it } from "vitest";
import {
  analyzeDeals,
  createDeal,
  runMonteCarloForecast,
  type DealAnalysis,
  type DealRecommendation,
  type ForecastResult
} from "@constellation/core";
import {
  RecommendationService,
  buildDeterministicRecommendation,
  createAuditRecord,
  loadAiRuntimeConfig,
  recommendationSchema,
  type AssessmentModelGateway,
  type ReportModelGateway,
  type RecommendationModelGateway
} from "../src";

const todayIso = "2026-07-01T12:00:00.000Z";

function subject(): { analysis: DealAnalysis; forecast: ForecastResult } {
  const [analysis] = analyzeDeals([
    createDeal({
      id: "deal-1",
      accountName: "Acme Corp",
      ownerName: "Maya Chen",
      segment: "enterprise",
      amount: 250000,
      stage: "proposal",
      createdAt: "2026-03-01T00:00:00.000Z",
      closeDate: "2026-07-03T00:00:00.000Z",
      stageEnteredAt: "2026-05-15T00:00:00.000Z",
      lastActivityAt: null,
      nextStep: null,
      crmProbability: 0.6,
      ownerHistoricalWinRate: 0.35,
      averageSalesCycleDays: 70,
      source: "inbound"
    })
  ], todayIso);

  const forecast = runMonteCarloForecast([analysis!], 200000, 500, 1);
  return { analysis: analysis!, forecast };
}

describe("recommendation schema", () => {
  it("rejects invalid recommendation output", () => {
    expect(() => recommendationSchema.parse({ executiveSummary: "Only one field" })).toThrow();
  });
});

describe("deterministic recommendation", () => {
  it("explains engine outputs and includes missing data", () => {
    const { analysis, forecast } = subject();
    const recommendation = buildDeterministicRecommendation(analysis, forecast);

    expect(recommendation.executiveSummary).toContain("Acme Corp");
    expect(recommendation.riskExplanation).toContain("deterministic model outputs");
    expect(recommendation.missingInformation).toEqual(expect.arrayContaining(["lastActivityAt", "nextStep"]));
  });
});

describe("recommendation service", () => {
  it("falls back when a gateway returns invalid output", async () => {
    const { analysis, forecast } = subject();
    const invalidGateway: RecommendationModelGateway = {
      async generate() {
        return {
          output: { invalid: true },
          metadata: { provider: "test", modelName: "invalid-model" }
        };
      }
    };

    const result = await new RecommendationService({ gateway: invalidGateway }).generate({ analysis, forecast });

    expect(result.metadata.provider).toBe("deterministic-fallback");
    expect(result.recommendation.executiveSummary).toContain("Acme Corp");
  });

  it("enforces missing data and human escalation policy after model output", async () => {
    const { analysis, forecast } = subject();
    const weakOutput: DealRecommendation = {
      executiveSummary: "Summary",
      riskExplanation: "Explanation",
      nextBestActions: [],
      missingInformation: [],
      confidence: "high",
      shouldEscalateToHuman: false
    };
    const gateway: RecommendationModelGateway = {
      async generate() {
        return {
          output: weakOutput,
          metadata: { provider: "test", modelName: "policy-model" }
        };
      }
    };

    const result = await new RecommendationService({ gateway }).generate({ analysis, forecast });

    expect(result.recommendation.missingInformation).toEqual(expect.arrayContaining(["lastActivityAt", "nextStep"]));
    expect(result.recommendation.shouldEscalateToHuman).toBe(true);
  });

  it("creates audit records from original engine numbers", async () => {
    const { analysis, forecast } = subject();
    const hasher = { hash: () => "stable-hash" };
    const result = await new RecommendationService({
      hasher,
      clock: () => new Date("2026-07-02T00:00:00.000Z")
    }).generate({ analysis, forecast });

    expect(result.auditRecord.riskScore).toBe(analysis.riskScore);
    expect(result.auditRecord.adjustedProbability).toBe(analysis.adjustedProbability);
    expect(result.auditRecord.inputHash).toBe("stable-hash");
    expect(result.auditRecord.createdAt).toBe("2026-07-02T00:00:00.000Z");
    expect(result.auditRecord.status).toBe("success");
  });

  it("records fallback status and reason in audit metadata", async () => {
    const { analysis, forecast } = subject();
    const invalidGateway: RecommendationModelGateway = {
      async generate() {
        throw new Error("provider unavailable");
      }
    };

    const result = await new RecommendationService({ gateway: invalidGateway }).generate({ analysis, forecast });

    expect(result.status).toBe("fallback");
    expect(result.fallbackReason).toContain("provider unavailable");
    expect(result.auditRecord.status).toBe("fallback");
    expect(result.auditRecord.fallbackReason).toContain("provider unavailable");
  });

  it("applies runtime max action customization to deterministic fallback", async () => {
    const { analysis, forecast } = subject();
    const result = await new RecommendationService({
      runtimeConfig: { maxActions: 1 }
    }).generate({ analysis, forecast });

    expect(result.recommendation.nextBestActions).toHaveLength(1);
  });

  it("orchestrates the two-step analysis and report pipeline", async () => {
    const { analysis, forecast } = subject();
    const calls: string[] = [];
    const analysisGateway: AssessmentModelGateway = {
      async generateAssessment() {
        calls.push("analysis");
        return {
          output: {
            dealHealth: "weak",
            forecastInterpretation: "The deterministic forecast shows elevated close risk.",
            riskFactors: [
              {
                label: "Missing next step",
                severity: "high",
                evidence: "The deal has no next step.",
                impact: "Execution risk is high."
              }
            ],
            positiveSignals: [],
            missingEvidence: ["nextStep"],
            recommendedFocusAreas: ["Define a dated next step"],
            confidenceExplanation: "Confidence is low because key evidence is missing."
          },
          metadata: { provider: "test", modelName: "small-analysis-model" },
          latencyMs: 10
        };
      }
    };
    const reportGateway: ReportModelGateway = {
      async generateReport(input) {
        calls.push(`report:${input.assessment.dealHealth}`);
        return {
          output: {
            executiveSummary: "Acme Corp needs leadership attention before the forecast can be trusted.",
            forecastExplanation: "The deterministic forecast shows elevated close risk.",
            riskAnalysis: [
              {
                title: "Missing next step",
                explanation: "Execution risk is high.",
                evidence: ["The deal has no next step."]
              }
            ],
            opportunityAnalysis: [
              {
                title: "Forecast recovery path",
                explanation: "The team can improve confidence by confirming buyer commitment.",
                evidence: ["Recommended focus area: Define a dated next step."]
              }
            ],
            recommendedActions: [
              {
                action: "Define a dated next step",
                rationale: "The deal cannot be forecast confidently without a concrete buyer commitment.",
                urgency: "high"
              }
            ],
            nextSteps: ["Define a dated next step"],
            decisionSupport: "Keep the deal in the forecast only with explicit leadership review.",
            missingInformation: ["nextStep"],
            confidence: "low",
            shouldEscalateToHuman: false
          },
          metadata: { provider: "test", modelName: "large-report-model" },
          latencyMs: 20
        };
      }
    };

    const result = await new RecommendationService({
      analysisGateway,
      reportGateway,
      runtimeConfig: {
        pipelineMode: "two_step",
        maxCallsPerRequest: 2,
        maxActions: 1
      }
    }).generate({ analysis, forecast });

    expect(calls).toEqual(["analysis", "report:weak"]);
    expect(result.status).toBe("success");
    expect(result.metadata.modelName).toBe("large-report-model");
    expect(result.recommendation.detailedReport?.decisionSupport).toContain("leadership review");
    expect(result.recommendation.nextBestActions).toHaveLength(1);
    expect(result.auditRecord.steps).toHaveLength(2);
    expect(result.auditRecord.steps?.map((step) => step.step)).toEqual(["analysis", "report"]);
  });

  it("falls back only the failed step in the two-step pipeline", async () => {
    const { analysis, forecast } = subject();
    const analysisGateway: AssessmentModelGateway = {
      async generateAssessment() {
        throw new Error("analysis model unavailable");
      }
    };
    const reportGateway: ReportModelGateway = {
      async generateReport(input) {
        return {
          output: {
            executiveSummary: "Report generated from deterministic assessment.",
            forecastExplanation: input.assessment.forecastInterpretation,
            riskAnalysis: [],
            opportunityAnalysis: [],
            recommendedActions: [
              {
                action: "Review deterministic fallback assessment",
                rationale: "The first AI step failed, so the report used deterministic analysis.",
                urgency: "medium"
              }
            ],
            nextSteps: ["Review deterministic fallback assessment"],
            decisionSupport: "Treat this as a partial fallback result.",
            missingInformation: input.assessment.missingEvidence,
            confidence: "low",
            shouldEscalateToHuman: false
          },
          metadata: { provider: "test", modelName: "large-report-model" }
        };
      }
    };

    const result = await new RecommendationService({
      analysisGateway,
      reportGateway,
      runtimeConfig: {
        pipelineMode: "two_step",
        maxCallsPerRequest: 2
      }
    }).generate({ analysis, forecast });

    expect(result.status).toBe("partial_fallback");
    expect(result.fallbackReason).toContain("analysis model unavailable");
    expect(result.auditRecord.steps?.[0]?.status).toBe("fallback");
    expect(result.auditRecord.steps?.[1]?.status).toBe("success");
  });

  it("prevents hidden extra calls through the execution guard", async () => {
    const { analysis, forecast } = subject();
    const calls: string[] = [];
    const analysisGateway: AssessmentModelGateway = {
      async generateAssessment() {
        calls.push("analysis");
        return {
          output: {
            dealHealth: "moderate",
            forecastInterpretation: "Assessment generated.",
            riskFactors: [],
            positiveSignals: [],
            missingEvidence: [],
            recommendedFocusAreas: [],
            confidenceExplanation: "Assessment confidence is medium."
          },
          metadata: { provider: "test", modelName: "analysis-model" }
        };
      }
    };
    const reportGateway: ReportModelGateway = {
      async generateReport() {
        calls.push("report");
        throw new Error("report should not be called");
      }
    };

    const result = await new RecommendationService({
      analysisGateway,
      reportGateway,
      runtimeConfig: {
        pipelineMode: "two_step",
        maxCallsPerRequest: 1
      }
    }).generate({ analysis, forecast });

    expect(calls).toEqual(["analysis"]);
    expect(result.status).toBe("partial_fallback");
    expect(result.fallbackReason).toContain("AI call budget exceeded before report");
    expect(result.auditRecord.steps?.map((step) => step.step)).toEqual(["analysis", "report"]);
    expect(result.auditRecord.steps?.[1]?.status).toBe("fallback");
  });

  it("keeps the legacy audit helper deterministic", () => {
    const { analysis, forecast } = subject();
    const recommendation = buildDeterministicRecommendation(analysis, forecast);

    expect(createAuditRecord(analysis, recommendation)).toEqual(createAuditRecord(analysis, recommendation));
  });
});

describe("AI runtime config", () => {
  it("loads bounded runtime controls from env", () => {
    const config = loadAiRuntimeConfig({
      AI_PROVIDER: "openai",
      AI_PIPELINE_MODE: "two_step",
      AI_MAX_CALLS_PER_REQUEST: "2",
      OPENAI_API_KEY: "key",
      OPENAI_MODEL: "model",
      AI_ANALYSIS_MODEL: "small-model",
      AI_REPORT_MODEL: "large-model",
      OPENAI_MAX_OUTPUT_TOKENS: "900",
      AI_ANALYSIS_MAX_OUTPUT_TOKENS: "600",
      AI_REPORT_MAX_OUTPUT_TOKENS: "1800",
      OPENAI_TEMPERATURE: "0.4",
      OPENAI_TIMEOUT_MS: "12000",
      AI_RECOMMENDATION_TONE: "operator",
      AI_RECOMMENDATION_DETAIL_LEVEL: "detailed",
      AI_RECOMMENDATION_MAX_ACTIONS: "2"
    });

    expect(config.provider).toBe("openai");
    expect(config.pipelineMode).toBe("two_step");
    expect(config.maxCallsPerRequest).toBe(2);
    expect(config.analysisModel).toBe("small-model");
    expect(config.reportModel).toBe("large-model");
    expect(config.maxOutputTokens).toBe(900);
    expect(config.analysisMaxOutputTokens).toBe(600);
    expect(config.reportMaxOutputTokens).toBe(1800);
    expect(config.temperature).toBe(0.4);
    expect(config.timeoutMs).toBe(12000);
    expect(config.recommendationTone).toBe("operator");
    expect(config.recommendationDetailLevel).toBe("detailed");
    expect(config.maxActions).toBe(2);
  });
});
