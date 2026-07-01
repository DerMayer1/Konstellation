# Architecture

Constellation uses layered ownership so the product does not become a chatbot wrapped around a dashboard.

## Layers

- Data layer: synthetic scenarios now, CSV import in the web app, database later.
- Domain layer: deal, stage, segment, source, risk level, and forecast result types.
- Quantitative engine: feature extraction, risk scoring, probability adjustment, Monte Carlo simulation, and evaluation metrics.
- AI layer: structured recommendation schema, deterministic fallback, and audit records.
- Presentation layer: executive forecast dashboard, critical deals table, deal detail, and audit trail.
- Audit layer: engine version, prompt version, provider, model name, input hash, numerical outputs, and structured recommendation.

## Decision Boundary

The LLM is not allowed to set risk score, adjusted probability, expected revenue, percentiles, or target-hit probability. It can only explain and recommend from provided outputs.

In the current MVP, the recommendation layer uses a deterministic fallback. That keeps the demo runnable without a secret while preserving the same schema an OpenAI-backed implementation would return.

## Why This Shape

The core engine lives outside React so it can be tested, audited, and reused from API routes or workers later. React owns interaction and presentation only.
