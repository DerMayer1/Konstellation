import { describe, expect, it } from "vitest";
import { analyzeDeals, createDeal, runMonteCarloForecast } from "@constellation/core";
import {
  OpenAIRecommendationGateway,
  buildRecommendationContext,
  dealAssessmentSystemPrompt,
  dealRecommendationSystemPrompt,
  dealReportSystemPrompt
} from "../src";

describe("OpenAI recommendation gateway", () => {
  it("sends a schema-constrained server-side request and parses output_text", async () => {
    const [analysis] = analyzeDeals([
      createDeal({
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
      })
    ], "2026-07-01T12:00:00.000Z");
    const forecast = runMonteCarloForecast([analysis!], 100000, 100, 1);
    const context = buildRecommendationContext(analysis!, forecast);
    const requests: unknown[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          executiveSummary: "Summary",
          riskExplanation: "Explanation",
          nextBestActions: [],
          missingInformation: [],
          confidence: "medium",
          shouldEscalateToHuman: false
        })
      }), { status: 200 });
    };

    const result = await new OpenAIRecommendationGateway({
      apiKey: "test-key",
      modelName: "test-model",
      maxOutputTokens: 333,
      temperature: 0.1,
      timeoutMs: 5000,
      fetchImpl
    }).generate({ analysis: analysis!, forecast, context });

    expect(result.metadata).toEqual({ provider: "openai", modelName: "test-model" });
    expect(result.output).toMatchObject({ executiveSummary: "Summary" });
    expect(JSON.stringify(requests[0])).toContain("json_schema");
    expect((requests[0] as { max_output_tokens: number; temperature: number }).max_output_tokens).toBe(333);
    expect((requests[0] as { max_output_tokens: number; temperature: number }).temperature).toBe(0.1);
    expect((requests[0] as { input: Array<{ content: string }> }).input[0]!.content).toBe(dealRecommendationSystemPrompt);
  });

  it("uses separate schemas and prompts for assessment and report steps", async () => {
    const [analysis] = analyzeDeals([
      createDeal({
        id: "deal-2",
        accountName: "Globex",
        ownerName: "Maya Chen",
        segment: "enterprise",
        amount: 120000,
        stage: "negotiation",
        createdAt: "2026-04-12T00:00:00.000Z",
        closeDate: "2026-07-25T00:00:00.000Z",
        stageEnteredAt: "2026-06-14T00:00:00.000Z",
        lastActivityAt: "2026-06-27T00:00:00.000Z",
        nextStep: "Procurement review",
        crmProbability: 0.7,
        ownerHistoricalWinRate: 0.52,
        averageSalesCycleDays: 80,
        source: "outbound"
      })
    ], "2026-07-01T12:00:00.000Z");
    const forecast = runMonteCarloForecast([analysis!], 100000, 100, 1);
    const context = buildRecommendationContext(analysis!, forecast);
    const requests: unknown[] = [];
    const responses = [
      {
        dealHealth: "moderate",
        forecastInterpretation: "Forecast interpretation.",
        riskFactors: [],
        positiveSignals: [],
        missingEvidence: [],
        recommendedFocusAreas: [],
        confidenceExplanation: "Confidence explanation."
      },
      {
        executiveSummary: "Executive summary.",
        forecastExplanation: "Forecast explanation.",
        riskAnalysis: [],
        opportunityAnalysis: [],
        recommendedActions: [],
        nextSteps: [],
        decisionSupport: "Decision support.",
        missingInformation: [],
        confidence: "medium",
        shouldEscalateToHuman: false
      }
    ];
    const fetchImpl: typeof fetch = async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({
        output_text: JSON.stringify(responses[requests.length - 1])
      }), { status: 200 });
    };
    const gateway = new OpenAIRecommendationGateway({
      apiKey: "test-key",
      modelName: "test-model",
      maxOutputTokens: 333,
      timeoutMs: 5000,
      fetchImpl
    });

    const assessment = await gateway.generateAssessment({ analysis: analysis!, forecast, context });
    const report = await gateway.generateReport({
      analysis: analysis!,
      forecast,
      context,
      assessment: assessment.output as never
    });

    expect(report.output).toMatchObject({ executiveSummary: "Executive summary." });
    expect((requests[0] as { input: Array<{ content: string }>; text: { format: { name: string } } }).input[0]!.content).toBe(dealAssessmentSystemPrompt);
    expect((requests[0] as { text: { format: { name: string } } }).text.format.name).toBe("deal_assessment");
    expect((requests[1] as { input: Array<{ content: string }>; text: { format: { name: string } } }).input[0]!.content).toBe(dealReportSystemPrompt);
    expect((requests[1] as { text: { format: { name: string } } }).text.format.name).toBe("deal_recommendation_report");
  });
});
