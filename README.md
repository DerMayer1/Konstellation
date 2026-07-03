# Constellation

Constellation is an AI-native revenue forecasting system for B2B sales pipelines under uncertainty.

It is not a CRM, a generic dashboard, or a sales chatbot. The product turns pipeline data into deal risk, adjusted close probability, Monte Carlo forecast ranges, controlled AI recommendations, and an audit trail.

Core rule:

> The LLM does not decide. The deterministic forecasting engine decides. The AI layer explains and recommends from validated system outputs.

## Current Status

The repository currently implements the local product foundation:

- domain contracts and validation for B2B deals;
- deterministic risk scoring and risk drivers;
- adjusted close probability;
- Monte Carlo revenue forecasting;
- CSV pipeline import;
- local JSON/in-memory repository layer;
- controlled AI recommendation layer with deterministic fallback;
- guarded single-step and two-step AI orchestration;
- terminal-style web dashboard inspired by legacy financial terminals;
- tests for the core, data, and AI layers.

Real production CRM integration is not implemented yet. The app supports real input through CSV upload. Synthetic datasets exist only as explicit development fixtures and are visually marked as demo data in the UI.

## Product Flow

```txt
CSV pipeline export or explicit demo fixture
        ↓
Deal validation and normalization
        ↓
Risk engine
        ↓
Adjusted close probability
        ↓
Monte Carlo forecast
        ↓
Recommendation service
        ↓
Audit record
        ↓
Terminal dashboard
```

## Data Policy

The default UI state does not show fabricated numbers.

To generate a forecast, load real pipeline data through CSV upload. The `Load Demo Dataset` action is available only as a secondary development path. Demo mode is not evidence of forecast quality.

Supported CSV columns:

```csv
id,accountName,ownerName,segment,amount,stage,createdAt,closeDate,stageEnteredAt,lastActivityAt,nextStep,crmProbability,ownerHistoricalWinRate,averageSalesCycleDays,source
```

Accepted values:

- `segment`: `smb`, `mid_market`, `enterprise`
- `stage`: `prospecting`, `qualification`, `demo`, `proposal`, `negotiation`, `closed_won`, `closed_lost`
- `source`: `inbound`, `outbound`, `partner`, `referral`
- probabilities can be decimals such as `0.6` or percentages such as `60%`

Minimal CSV example:

```csv
id,accountName,ownerName,segment,amount,stage,createdAt,closeDate,stageEnteredAt,lastActivityAt,nextStep,crmProbability,ownerHistoricalWinRate,averageSalesCycleDays,source
deal-1,Acme Corp,Maya Chen,mid_market,80000,proposal,2026-04-12,2026-07-25,2026-06-14,2026-06-27,Review proposal,60%,0.48,70,inbound
```

## AI Layer

The AI layer is controlled and optional.

Default behavior:

```env
AI_PROVIDER=deterministic
```

With this default, no external AI API call is made.

When enabled with OpenAI credentials, the service can run in two modes:

```env
AI_PIPELINE_MODE=single
```

Single-step mode produces one structured recommendation.

```env
AI_PIPELINE_MODE=two_step
```

Two-step mode separates:

1. smaller-model structured assessment;
2. stronger-model executive report.

Guardrails:

- `AI_MAX_CALLS_PER_REQUEST` caps model calls;
- schemas validate every model output;
- deterministic fallback handles gateway or validation failures;
- audit records preserve provider, model, prompt version, usage, latency, status, and fallback reason;
- the model cannot overwrite deterministic risk scores, probabilities, expected revenue, or forecast ranges.

See `.env.example` for all runtime controls.

## Project Layout

```txt
apps/web
  Next.js terminal-style product UI.

packages/core
  Domain model, validation, risk engine, probability engine, CSV importer, Monte Carlo forecast.

packages/ai
  Prompt policy, schemas, gateways, execution guard, recommendation service, deterministic fallback.

packages/db
  Local repository abstractions, stable hashing, seed support.

packages/synthetic-data
  Seeded demo fixtures for development and UI testing only.

docs
  Architecture notes, phase documents, frontend design guardrails.
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the web app:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

If port `3000` is occupied:

```bash
npm --workspace @constellation/web run dev -- -p 3001
```

## Environment

Create a local env file from the example:

```bash
copy .env.example .env.local
```

Keep `.env.local` out of Git.

Important variables:

```env
AI_PROVIDER=deterministic
AI_PIPELINE_MODE=single
AI_MAX_CALLS_PER_REQUEST=1
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
AI_ANALYSIS_MODEL=gpt-4.1-mini
AI_REPORT_MODEL=gpt-4.1
OPENAI_MAX_OUTPUT_TOKENS=700
AI_ANALYSIS_MAX_OUTPUT_TOKENS=700
AI_REPORT_MAX_OUTPUT_TOKENS=1800
OPENAI_TIMEOUT_MS=15000
AI_RECOMMENDATION_MAX_ACTIONS=4
```

Use `AI_PROVIDER=openai` only when you intentionally want external model calls.

## Verification

Run the test suite:

```bash
npm test
```

Typecheck:

```bash
npx tsc --noEmit
```

Production build:

```bash
npm run build
```

Seed local data fixtures:

```bash
npm run seed
```

## Documentation

Key documents:

- `docs/architecture.md`
- `docs/algorithms.md`
- `docs/phase-1-domain-contracts.md`
- `docs/phase-2-quantitative-engine.md`
- `docs/phase-3-data-audit.md`
- `docs/phase-4-controlled-ai-layer.md`
- `docs/frontend-terminal-design.md`

## Deliberately Not Implemented Yet

The following are intentionally outside the current implementation:

- Salesforce or HubSpot live sync;
- authentication;
- multi-tenancy;
- billing;
- production database migrations;
- background jobs;
- autonomous agents;
- vector database or RAG;
- Slack/email alerts;
- workflow builders.

These should be added only after the real data ingestion and audit surface are validated against representative pipeline exports.
