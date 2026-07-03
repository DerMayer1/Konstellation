export type AiProvider = "deterministic" | "openai";
export type AiPipelineMode = "single" | "two_step";
export type RecommendationTone = "executive" | "analytical" | "operator";
export type RecommendationDetailLevel = "concise" | "standard" | "detailed";

export type AiRuntimeConfig = {
  readonly provider: AiProvider;
  readonly pipelineMode: AiPipelineMode;
  readonly openAiApiKey?: string;
  readonly openAiModel: string;
  readonly analysisModel: string;
  readonly reportModel: string;
  readonly openAiBaseUrl?: string;
  readonly maxOutputTokens: number;
  readonly analysisMaxOutputTokens: number;
  readonly reportMaxOutputTokens: number;
  readonly temperature?: number;
  readonly timeoutMs: number;
  readonly maxCallsPerRequest: number;
  readonly recommendationTone: RecommendationTone;
  readonly recommendationDetailLevel: RecommendationDetailLevel;
  readonly maxActions: number;
  readonly promptVersion?: string;
};

export const defaultAiRuntimeConfig: AiRuntimeConfig = {
  provider: "deterministic",
  pipelineMode: "single",
  openAiModel: "gpt-4.1-mini",
  analysisModel: "gpt-4.1-mini",
  reportModel: "gpt-4.1",
  maxOutputTokens: 700,
  analysisMaxOutputTokens: 700,
  reportMaxOutputTokens: 1800,
  temperature: 0.2,
  timeoutMs: 15000,
  maxCallsPerRequest: 1,
  recommendationTone: "executive",
  recommendationDetailLevel: "standard",
  maxActions: 4
};

export function loadAiRuntimeConfig(env: Record<string, string | undefined>): AiRuntimeConfig {
  const pipelineMode = enumValue(env.AI_PIPELINE_MODE, ["single", "two_step"], defaultAiRuntimeConfig.pipelineMode);
  return {
    provider: enumValue(env.AI_PROVIDER, ["deterministic", "openai"], defaultAiRuntimeConfig.provider),
    pipelineMode,
    openAiApiKey: emptyToUndefined(env.OPENAI_API_KEY),
    openAiModel: env.OPENAI_MODEL || defaultAiRuntimeConfig.openAiModel,
    analysisModel: env.AI_ANALYSIS_MODEL || env.OPENAI_MODEL || defaultAiRuntimeConfig.analysisModel,
    reportModel: env.AI_REPORT_MODEL || defaultAiRuntimeConfig.reportModel,
    openAiBaseUrl: emptyToUndefined(env.OPENAI_BASE_URL),
    maxOutputTokens: integerValue(env.OPENAI_MAX_OUTPUT_TOKENS, defaultAiRuntimeConfig.maxOutputTokens, { min: 1 }),
    analysisMaxOutputTokens: integerValue(
      env.AI_ANALYSIS_MAX_OUTPUT_TOKENS,
      defaultAiRuntimeConfig.analysisMaxOutputTokens,
      { min: 1 }
    ),
    reportMaxOutputTokens: integerValue(
      env.AI_REPORT_MAX_OUTPUT_TOKENS,
      defaultAiRuntimeConfig.reportMaxOutputTokens,
      { min: 1 }
    ),
    temperature: optionalNumberValue(env.OPENAI_TEMPERATURE, { min: 0, max: 2 }) ?? defaultAiRuntimeConfig.temperature,
    timeoutMs: integerValue(env.OPENAI_TIMEOUT_MS, defaultAiRuntimeConfig.timeoutMs, { min: 1000 }),
    maxCallsPerRequest: integerValue(
      env.AI_MAX_CALLS_PER_REQUEST,
      pipelineMode === "two_step" ? 2 : defaultAiRuntimeConfig.maxCallsPerRequest,
      { min: 0, max: 2 }
    ),
    recommendationTone: enumValue(env.AI_RECOMMENDATION_TONE, ["executive", "analytical", "operator"], defaultAiRuntimeConfig.recommendationTone),
    recommendationDetailLevel: enumValue(
      env.AI_RECOMMENDATION_DETAIL_LEVEL,
      ["concise", "standard", "detailed"],
      defaultAiRuntimeConfig.recommendationDetailLevel
    ),
    maxActions: integerValue(env.AI_RECOMMENDATION_MAX_ACTIONS, defaultAiRuntimeConfig.maxActions, { min: 1 }),
    promptVersion: emptyToUndefined(env.AI_PROMPT_VERSION)
  };
}

function enumValue<const T extends readonly string[]>(value: string | undefined, options: T, fallback: T[number]): T[number] {
  return value && (options as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

function integerValue(value: string | undefined, fallback: number, bounds: { min: number; max?: number }): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < bounds.min) return fallback;
  if (bounds.max !== undefined && parsed > bounds.max) return fallback;
  return parsed;
}

function optionalNumberValue(value: string | undefined, bounds: { min: number; max: number }): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  if (parsed < bounds.min || parsed > bounds.max) return undefined;
  return parsed;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}
