# Phase 4: Controlled AI Layer

## Scope

Phase 4 adds a controlled recommendation layer on top of the deterministic quantitative engine.

It includes:

- prompt policy versioning;
- recommendation context construction;
- JSON schema validation;
- deterministic fallback gateway;
- optional OpenAI gateway;
- single-step and two-step AI pipeline modes;
- runtime configuration for provider, models, tokens, timeout, call budget and recommendation style;
- recommendation service orchestration;
- audit record generation;
- tests for schema, fallback, policy enforcement and audit safety.

It intentionally excludes:

- giving the LLM authority to calculate risk;
- letting the LLM alter probabilities or scores;
- storing API keys in the browser;
- autonomous agents;
- RAG;
- fine-tuning;
- workflow builders.

## Core Rule

The LLM does not decide.

The quantitative engine decides:

- risk score;
- risk level;
- risk drivers;
- base probability;
- adjusted probability;
- expected revenue;
- forecast confidence.

The AI layer explains, organizes and recommends from those outputs.

## Module Map

| Concern | Module |
| --- | --- |
| Recommendation schema | `packages/ai/src/recommendation-schema.ts` |
| Two-step assessment and report schemas | `packages/ai/src/two-step-schema.ts` |
| Prompt policy | `packages/ai/src/prompt-policy.ts` |
| Recommendation context | `packages/ai/src/recommendation-context.ts` |
| Gateway contracts | `packages/ai/src/model-gateway.ts` |
| Deterministic fallback | `packages/ai/src/deterministic-gateway.ts` |
| Optional OpenAI gateway | `packages/ai/src/openai-gateway.ts` |
| Runtime configuration | `packages/ai/src/runtime-config.ts` |
| Call budget guard | `packages/ai/src/execution-guard.ts` |
| Service orchestration and audit | `packages/ai/src/recommendation-service.ts` |

## Prompt Policy

Prompt version:

```ts
dealRecommendationPromptVersion = "deal-recommendation-v0.3.0"
```

The prompt policy exposes three English-only prompt contracts:

- `dealRecommendationSystemPrompt` for the legacy single-step recommendation;
- `dealAssessmentSystemPrompt` for structured analysis with the smaller model;
- `dealReportSystemPrompt` for detailed executive reporting with the stronger model.

The prompts enforce:

- no numerical score changes;
- explain only provided risk, drivers, probability and forecast context;
- no invented CRM facts, buyer names, objections, competitors or timeline facts;
- missing information must be listed;
- high value plus high risk must escalate to a human;
- JSON only.

## Pipeline Modes

`AI_PIPELINE_MODE=single` keeps the original one-call behavior.

Flow:

1. build recommendation context;
2. reserve one AI call through `AiExecutionGuard`;
3. call `RecommendationModelGateway.generate`;
4. validate `DealRecommendation`;
5. fallback to deterministic recommendation if the gateway fails or returns invalid output.

`AI_PIPELINE_MODE=two_step` splits analysis from reporting.

Flow:

1. build recommendation context;
2. reserve `analysis` call;
3. call `AssessmentModelGateway.generateAssessment`;
4. validate `AiDealAssessment`;
5. fallback to deterministic assessment if the analysis step fails;
6. reserve `report` call;
7. call `ReportModelGateway.generateReport`;
8. validate `AiRecommendationReport`;
9. fallback to deterministic report if the report step fails;
10. map the report to the public `DealRecommendation` contract.

The two-step mode is designed for richer reports, not for unbounded reasoning loops.

Success point:

- final recommendation/report is schema-valid;
- deterministic forecast numbers remain unchanged;
- call budget is respected;
- audit trail records every step;
- fallback returns a usable output if one external step fails.

Status values:

- `success`: all configured AI steps succeeded;
- `partial_fallback`: one step failed and used deterministic fallback;
- `fallback`: all AI steps used deterministic fallback;
- `failed`: reserved for future hard failure handling if both AI and deterministic fallback fail.

## Gateway Design

The package exposes `RecommendationModelGateway`.

Implementations:

- `DeterministicRecommendationGateway`;
- `OpenAIRecommendationGateway`.

Two-step orchestration uses:

- `AssessmentModelGateway`;
- `ReportModelGateway`.

`OpenAIRecommendationGateway` implements all three gateway contracts. `DeterministicRecommendationGateway` also implements all three contracts for fallback safety.

The OpenAI gateway is optional and server-side. It requires an API key passed through configuration or environment handling outside the browser. The app remains functional without `OPENAI_API_KEY`.

## Runtime Configuration

Supported environment variables:

```env
AI_PROVIDER=deterministic
AI_PIPELINE_MODE=single
AI_MAX_CALLS_PER_REQUEST=1
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
AI_ANALYSIS_MODEL=gpt-4.1-mini
AI_REPORT_MODEL=gpt-4.1
OPENAI_BASE_URL=
OPENAI_MAX_OUTPUT_TOKENS=700
AI_ANALYSIS_MAX_OUTPUT_TOKENS=700
AI_REPORT_MAX_OUTPUT_TOKENS=1800
OPENAI_TEMPERATURE=0.2
OPENAI_TIMEOUT_MS=15000
AI_RECOMMENDATION_TONE=executive
AI_RECOMMENDATION_DETAIL_LEVEL=standard
AI_RECOMMENDATION_MAX_ACTIONS=4
AI_PROMPT_VERSION=deal-recommendation-v0.3.0
```

`AI_PROVIDER=openai` uses the OpenAI gateway only when `OPENAI_API_KEY` is present. Otherwise, the service remains deterministic.

`AI_PIPELINE_MODE=two_step` enables the analysis/report pipeline.

`AI_MAX_CALLS_PER_REQUEST` caps AI calls per service execution. The default is `1` for `single` and `2` for `two_step`.

`AI_ANALYSIS_MODEL` selects the smaller structured-analysis model.

`AI_REPORT_MODEL` selects the stronger detailed-report model.

`OPENAI_MAX_OUTPUT_TOKENS` maps to the Responses API `max_output_tokens` parameter.

`AI_ANALYSIS_MAX_OUTPUT_TOKENS` controls output budget for the assessment step.

`AI_REPORT_MAX_OUTPUT_TOKENS` controls output budget for the report step.

`OPENAI_TEMPERATURE` maps to the Responses API `temperature` parameter.

`OPENAI_TIMEOUT_MS` controls an `AbortController` timeout around the API request.

## Validation And Fallback

`RecommendationService` executes:

1. build deterministic recommendation context;
2. execute the configured pipeline mode;
3. reserve calls through `AiExecutionGuard`;
4. parse outputs through the relevant schemas;
5. enforce product policy after parsing;
6. fallback at the failed step only when possible;
7. create audit record from original engine outputs.

The model output cannot overwrite:

- `riskScore`;
- `adjustedProbability`;
- `riskEngineVersion`;
- `inputHash`.

Those values are copied from the quantitative engine and audit process.

## Audit Behavior

Audit records include:

- `dealId`;
- `createdAt`;
- `riskEngineVersion`;
- `promptVersion`;
- `modelProvider`;
- `modelName`;
- `inputHash`;
- `riskScore`;
- `adjustedProbability`;
- validated recommendation output.

Two-step audit records also include `steps`:

- `step`;
- `provider`;
- `modelName`;
- `status`;
- `usage`;
- `latencyMs`;
- `fallbackReason`.

The service accepts an injected `InputHasher`, so production infrastructure can use the SHA-256 `StableInputHasher` from `packages/db`.

## Acceptance Criteria

Phase 4 is complete when:

- recommendation schema rejects invalid output;
- deterministic fallback works;
- gateway failure falls back safely;
- missing data appears in `missingInformation`;
- high value plus high risk forces human escalation;
- audit record preserves original quantitative values;
- audit record can include usage, latency, status and fallback reason;
- audit record can include per-step execution metadata;
- max output tokens, temperature, timeout, provider mode, pipeline mode, models, call budget and recommendation style are configurable;
- two-step orchestration uses exactly two guarded call reservations;
- two-step analysis and report outputs are schema validated separately;
- optional OpenAI gateway sends a schema-constrained request;
- no browser API key storage is introduced;
- tests, typecheck and build pass.

## Verification

```bash
npm test
npx tsc --noEmit
npm run build
```
