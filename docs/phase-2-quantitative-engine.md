# Phase 2: Quantitative Engine Hardening

## Scope

Phase 2 turns the quantitative core into an auditable engine.

It includes:

- feature engineering;
- risk scoring;
- risk driver attribution;
- probability adjustment;
- expected revenue;
- Monte Carlo forecasting;
- forecast confidence;
- evaluation metrics;
- edge case handling;
- quantitative tests.

It intentionally excludes:

- UI redesign;
- database persistence;
- OpenAI integration;
- prompt policy implementation;
- deploy work.

## Architecture Boundary

The quantitative engine lives inside `packages/core`.

React components, AI services and persistence adapters must consume the engine outputs. They must not recalculate risk, probability, confidence or forecast metrics.

## Module Map

| Concern | Module |
| --- | --- |
| Deal feature extraction | `packages/core/src/features/deal-features.ts` |
| Versioned quantitative policy | `packages/core/src/risk/risk-policy.ts` |
| Risk drivers and feature normalization | `packages/core/src/risk/risk-drivers.ts` |
| Probability engine | `packages/core/src/risk/probability-engine.ts` |
| Expected revenue | `packages/core/src/risk/expected-revenue.ts` |
| Risk analysis orchestration | `packages/core/src/risk/risk-engine.ts` |
| Monte Carlo simulation | `packages/core/src/forecast/monte-carlo.ts` |
| Percentiles | `packages/core/src/forecast/percentiles.ts` |
| Distribution helpers | `packages/core/src/forecast/distribution.ts` |
| Forecast confidence | `packages/core/src/forecast/forecast-confidence.ts` |
| Evaluation metrics | `packages/core/src/evaluation.ts` |

## Formula Mapping

| Specification | Implementation |
| --- | --- |
| `dealAgeDays = today - createdAt` | `extractDealFeatures` |
| `stageAgeDays = today - stageEnteredAt` | `extractDealFeatures` |
| `daysSinceLastActivity = today - lastActivityAt` | `extractDealFeatures` |
| `salesCycleRatio = dealAgeDays / averageSalesCycleDays` | `extractDealFeatures` |
| `inactivityRatio = daysSinceLastActivity / averageSalesCycleDays` | `extractDealFeatures` |
| `closePressure = 1 - min(daysUntilClose / 30, 1)` | `extractDealFeatures` |
| `amountRisk = log(1 + amount) / log(1 + maxAmount)` | `extractDealFeatures` |
| `ownerRisk = 1 - ownerHistoricalWinRate` | `extractDealFeatures` |
| weighted risk logit | `riskLogitFromDrivers` |
| `riskScore = 100 * sigmoid(z)` | `analyzeDeal` |
| risk levels | `riskLevel` |
| driver contribution `beta_j * x_ij` | `buildRiskDrivers` |
| logit probability blend | `calculateBaseProbability` |
| risk penalty `logit(p_base) - gamma * risk` | `adjustProbabilityForRisk` |
| expected revenue | `expectedRevenue` |
| Bernoulli Monte Carlo | `runMonteCarloForecast` |
| P10/P25/P50/P75/P90 | `summarizePercentiles` |
| probability of hitting target | `runMonteCarloForecast` |
| downside gap | `runMonteCarloForecast` |
| confidence score | `forecastConfidenceScore` |
| Brier Score | `brierScore` |
| calibration buckets | `calibrationBuckets` |
| forecast error and MAPE | `forecastError`, `meanAbsolutePercentageError` |

## Versioned Policy

The quantitative policy is centralized in `risk-policy.ts`.

It exports:

- `riskEngineVersion`;
- `riskWeights`;
- `riskPenaltyGamma`;
- `riskLevelThresholds`;
- `stageRisk`;
- `segmentRisk`;
- `stageProbability`;
- `sourceProbability`;
- `probabilityWeights`.

Forecast confidence weights are centralized in `forecast-confidence.ts`.

## Edge Case Decisions

| Case | Decision |
| --- | --- |
| `lastActivityAt = null` | `daysSinceLastActivity` stays `null`; inactivity uses a full sales cycle for risk. |
| close date in the past | `closePressure` is clamped to `1`. |
| sales cycle below 1 | domain validation rejects it before feature extraction. |
| probability exactly `0` or `1` | `logit` clamps internally to avoid infinities. |
| `closed_won` | terminal state: risk `0`, adjusted probability `1`. |
| `closed_lost` | terminal state: risk `100`, adjusted probability `0`. |
| empty forecast pipeline | zero revenue, low confidence, explicit distribution. |
| negative target revenue | rejected. |
| non-positive simulation count | rejected. |
| no labeled synthetic outcomes | Brier Score returns `null`. |
| MAPE with all actual values equal to zero | returns `null`. |

## Acceptance Criteria

Phase 2 is complete when:

- feature engineering matches the specification;
- risk weights and priors are centralized and versioned;
- risk drivers are calculated from model contributions, not LLM text;
- probability adjustment uses logit blending and risk penalty;
- expected revenue is calculated per deal;
- Monte Carlo outputs expected revenue, P10/P50/P90, hit probability, downside gap, upside potential and distribution;
- forecast confidence accounts for concentration, missing data and volatility;
- evaluation includes Brier Score, calibration buckets, forecast error and MAPE;
- edge cases are explicit;
- tests cover the mandatory quantitative behavior from the specification.

## Verification

The Phase 2 verification commands are:

```bash
npm test
npx tsc --noEmit
npm run build
```
