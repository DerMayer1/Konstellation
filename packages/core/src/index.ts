export type {
  Deal,
  DealAnalysis,
  DealFeatures,
  DealInput,
  DealSource,
  DealStage,
  ForecastResult,
  RiskDriver,
  RiskLevel,
  Segment,
  SyntheticOutcome
} from "./domain/deal";
export { createDeal, dealSources, dealStages, segments } from "./domain/deal";
export type {
  IsoDateString,
  MoneyAmount,
  NonEmptyString,
  PositiveInteger,
  Probability,
  RiskScore
} from "./domain/primitives";
export {
  createIsoDateString,
  createMoneyAmount,
  createNonEmptyString,
  createPositiveInteger,
  createProbability,
  createRiskScore,
  DomainValidationError
} from "./domain/primitives";
export type { AuditRecord } from "./domain/audit";
export type { DealRecommendation, RecommendationConfidence, RecommendationUrgency } from "./domain/recommendation";
export type {
  AnalyzeDealsInput,
  AnalyzeDealsOutput,
  AuditRepository,
  Clock,
  DealRepository,
  ForecastPipelineInput,
  ForecastPipelineOutput,
  GenerateDealRecommendationInput,
  GenerateDealRecommendationOutput,
  IdGenerator,
  ImportDealsInput,
  ImportDealsOutput,
  InputHasher,
  ModelGateway,
  UseCase
} from "./application/contracts";
export {
  dealInputSchema,
  dealsInputSchema,
  parseDeal,
  parseDeals,
  safeParseDeal,
  safeParseDeals,
  type DealValidationIssue,
  type DealValidationResult,
  type DealsValidationResult
} from "./validation/deal-schema";
export { analyzeDeal, analyzeDeals, riskEngineVersion, riskLevel } from "./risk/risk-engine";
export { runMonteCarloForecast } from "./forecast/monte-carlo";
export { brierScore, calibrationBuckets } from "./evaluation";
export { seededRandom } from "./math";
