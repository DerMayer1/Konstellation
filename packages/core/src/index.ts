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
export {
  importDealsFromCsv,
  type CsvDealImportResult,
  type CsvImportIssue
} from "./import/csv-deal-importer";
export {
  adjustProbabilityForRisk,
  analyzeDeal,
  analyzeDeals,
  buildRiskDrivers,
  calculateBaseProbability,
  expectedRevenue,
  normalizeRiskFeatures,
  probabilityWeights,
  riskEngineVersion,
  riskLevel,
  riskLevelThresholds,
  riskLogitFromDrivers,
  riskPenaltyGamma,
  riskWeights,
  segmentRisk,
  sourceProbability,
  stageProbability,
  stageRisk
} from "./risk/risk-engine";
export { runMonteCarloForecast } from "./forecast/monte-carlo";
export {
  coefficientOfVariation,
  confidenceLevel,
  forecastConfidenceScore,
  forecastConfidenceWeights,
  missingDataRatio,
  revenueConcentration
} from "./forecast/forecast-confidence";
export { bucketize, average, standardDeviation } from "./forecast/distribution";
export { percentile, summarizePercentiles } from "./forecast/percentiles";
export { brierScore, calibrationBuckets, forecastError, meanAbsolutePercentageError } from "./evaluation";
export { seededRandom } from "./math";
