# Constellation

AI-native revenue forecasting system for B2B sales pipelines under uncertainty.

Constellation is not a CRM, a generic dashboard, or a sales chatbot. It turns a B2B pipeline into deal risk, adjusted close probability, Monte Carlo forecast ranges, executive recommendations, and an audit trail.

The central product rule is:

> The LLM does not decide. The probabilistic engine decides. The LLM explains and recommends from system outputs.

## Demo Flow

1. Load a synthetic scenario.
2. Set quarterly target revenue.
3. Run analysis.
4. Inspect probabilistic forecast and target hit probability.
5. Open a critical deal.
6. Review risk drivers, AI recommendation, and audit trail.

## Project Layout

```txt
apps/web                  Product UI
packages/core             Domain model, risk engine, probability engine, Monte Carlo
packages/synthetic-data   Seeded synthetic pipeline scenarios
packages/ai               Structured recommendation layer with deterministic fallback
docs                      Architecture and algorithm notes
```

## Local Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Current MVP Scope

- Synthetic datasets for five scenarios.
- Risk score and risk drivers per deal.
- Adjusted probability using stage/source/owner/CRM priors with risk penalty.
- Expected revenue and Monte Carlo forecast distribution.
- Executive dashboard, deals table, deal detail, recommendation, audit trail.
- Focused tests for the core risk and forecast engines.

Deferred on purpose: auth, billing, multi-tenancy, Salesforce/HubSpot integrations, Slack/email alerts, autonomous agents, vector DB, RAG, and complex workflow builders.
