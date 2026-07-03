import {
  buildDealAssessmentUserPrompt,
  dealRecommendationSystemPrompt,
  buildDealRecommendationUserPrompt,
  buildDealReportUserPrompt,
  dealAssessmentSystemPrompt,
  dealReportSystemPrompt
} from "./prompt-policy";
import { recommendationJsonSchema } from "./recommendation-schema";
import {
  aiDealAssessmentJsonSchema,
  aiRecommendationReportJsonSchema
} from "./two-step-schema";
import type {
  RecommendationGatewayInput,
  RecommendationGatewayResult,
  RecommendationModelGateway,
  ReportGatewayInput
} from "./model-gateway";
import { loadAiRuntimeConfig } from "./runtime-config";

export type OpenAIRecommendationGatewayConfig = {
  readonly apiKey: string;
  readonly modelName: string;
  readonly maxOutputTokens: number;
  readonly temperature?: number;
  readonly timeoutMs: number;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
};

export class OpenAIRecommendationGateway implements RecommendationModelGateway {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OpenAIRecommendationGatewayConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async generate(input: RecommendationGatewayInput) {
    return this.requestStructuredOutput({
      systemPrompt: dealRecommendationSystemPrompt,
      userPrompt: buildDealRecommendationUserPrompt(input.context),
      schemaName: "deal_recommendation",
      schema: recommendationJsonSchema
    });
  }

  async generateAssessment(input: RecommendationGatewayInput) {
    return this.requestStructuredOutput({
      systemPrompt: dealAssessmentSystemPrompt,
      userPrompt: buildDealAssessmentUserPrompt(input.context),
      schemaName: "deal_assessment",
      schema: aiDealAssessmentJsonSchema
    });
  }

  async generateReport(input: ReportGatewayInput) {
    return this.requestStructuredOutput({
      systemPrompt: dealReportSystemPrompt,
      userPrompt: buildDealReportUserPrompt(input.context, input.assessment),
      schemaName: "deal_recommendation_report",
      schema: aiRecommendationReportJsonSchema
    });
  }

  private async requestStructuredOutput(input: {
    readonly systemPrompt: string;
    readonly userPrompt: string;
    readonly schemaName: string;
    readonly schema: unknown;
  }): Promise<RecommendationGatewayResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const startedAt = Date.now();

    const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(removeUndefined({
        model: this.config.modelName,
        max_output_tokens: this.config.maxOutputTokens,
        temperature: this.config.temperature,
        input: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt }
        ],
        text: {
          format: {
            type: "json_schema",
            name: input.schemaName,
            schema: input.schema,
            strict: true
          }
        }
      }))
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`OpenAI recommendation request failed with ${response.status}`);
    }

    const payload = await response.json();
    return {
      output: extractJsonPayload(payload),
      metadata: {
        provider: "openai",
        modelName: this.config.modelName,
        usage: extractUsage(payload)
      },
      latencyMs: Date.now() - startedAt
    };
  }
}

export type OpenAIGatewayRole = "recommendation" | "analysis" | "report";

export function createOpenAIRecommendationGatewayFromEnv(
  env: Record<string, string | undefined>,
  role: OpenAIGatewayRole = "recommendation"
): OpenAIRecommendationGateway | null {
  const config = loadAiRuntimeConfig(env);
  if (!config.openAiApiKey) return null;

  return new OpenAIRecommendationGateway({
    apiKey: config.openAiApiKey,
    modelName: modelNameForRole(config, role),
    baseUrl: config.openAiBaseUrl,
    maxOutputTokens: maxOutputTokensForRole(config, role),
    temperature: config.temperature,
    timeoutMs: config.timeoutMs
  });
}

function modelNameForRole(config: ReturnType<typeof loadAiRuntimeConfig>, role: OpenAIGatewayRole): string {
  if (role === "analysis") return config.analysisModel;
  if (role === "report") return config.reportModel;
  return config.openAiModel;
}

function maxOutputTokensForRole(config: ReturnType<typeof loadAiRuntimeConfig>, role: OpenAIGatewayRole): number {
  if (role === "analysis") return config.analysisMaxOutputTokens;
  if (role === "report") return config.reportMaxOutputTokens;
  return config.maxOutputTokens;
}

function extractJsonPayload(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) return payload;

  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return JSON.parse(direct);

  const output = (payload as { output?: unknown }).output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string") return JSON.parse(text);
      }
    }
  }

  return payload;
}

function extractUsage(payload: unknown): { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const usage = (payload as { usage?: unknown }).usage;
  if (typeof usage !== "object" || usage === null) return undefined;
  const inputTokens = numberField(usage, "input_tokens");
  const outputTokens = numberField(usage, "output_tokens");
  const totalTokens = numberField(usage, "total_tokens");
  return { inputTokens, outputTokens, totalTokens };
}

function numberField(input: unknown, key: string): number | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

function removeUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
