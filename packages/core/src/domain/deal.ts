import {
  createIsoDateString,
  createMoneyAmount,
  createNonEmptyString,
  createPositiveInteger,
  createProbability,
  type IsoDateString,
  type MoneyAmount,
  type NonEmptyString,
  type PositiveInteger,
  type Probability
} from "./primitives";

export const dealStages = [
  "prospecting",
  "qualification",
  "demo",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost"
] as const;

export const segments = ["smb", "mid_market", "enterprise"] as const;
export const dealSources = ["inbound", "outbound", "partner", "referral"] as const;

export type DealStage = (typeof dealStages)[number];
export type Segment = (typeof segments)[number];
export type DealSource = (typeof dealSources)[number];
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type SyntheticOutcome = "won" | "lost";

export type DealInput = {
  readonly id: string;
  readonly accountName: string;
  readonly ownerName: string;
  readonly segment: Segment;
  readonly amount: number;
  readonly stage: DealStage;
  readonly createdAt: string;
  readonly closeDate: string;
  readonly stageEnteredAt: string;
  readonly lastActivityAt: string | null;
  readonly nextStep: string | null;
  readonly crmProbability: number;
  readonly ownerHistoricalWinRate: number;
  readonly averageSalesCycleDays: number;
  readonly source: DealSource;
  readonly syntheticOutcome?: SyntheticOutcome;
  readonly syntheticTrueProbability?: number;
};

export type Deal = {
  readonly id: NonEmptyString;
  readonly accountName: NonEmptyString;
  readonly ownerName: NonEmptyString;
  readonly segment: Segment;
  readonly amount: MoneyAmount;
  readonly stage: DealStage;
  readonly createdAt: IsoDateString;
  readonly closeDate: IsoDateString;
  readonly stageEnteredAt: IsoDateString;
  readonly lastActivityAt: IsoDateString | null;
  readonly nextStep: NonEmptyString | null;
  readonly crmProbability: Probability;
  readonly ownerHistoricalWinRate: Probability;
  readonly averageSalesCycleDays: PositiveInteger;
  readonly source: DealSource;
  readonly syntheticOutcome?: SyntheticOutcome;
  readonly syntheticTrueProbability?: Probability;
};

export type DealFeatures = {
  dealAgeDays: number;
  stageAgeDays: number;
  daysSinceLastActivity: number | null;
  daysUntilClose: number;
  salesCycleRatio: number;
  inactivityRatio: number;
  closePressure: number;
  missingNextStep: boolean;
  stageRisk: number;
  segmentRisk: number;
  amountRisk: number;
  ownerRisk: number;
};

export type RiskDriver = {
  key: string;
  label: string;
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
};

export type DealAnalysis = {
  deal: Deal;
  features: DealFeatures;
  riskScore: number;
  riskLevel: RiskLevel;
  riskDrivers: RiskDriver[];
  baseProbability: number;
  adjustedProbability: number;
  expectedRevenue: number;
  missingData: string[];
};

export type ForecastResult = {
  simulationCount: number;
  targetRevenue: number;
  expectedRevenue: number;
  deterministicExpectedRevenue: number;
  medianRevenue: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  probabilityOfHittingTarget: number;
  downsideGap: number;
  upsidePotential: number;
  standardDeviation: number;
  confidence: "low" | "medium" | "high";
  confidenceScore: number;
  distribution: Array<{
    bucketStart: number;
    bucketEnd: number;
    count: number;
  }>;
};

export function createDeal(input: DealInput): Deal {
  const deal: Deal = {
    id: createNonEmptyString(input.id, "id"),
    accountName: createNonEmptyString(input.accountName, "accountName"),
    ownerName: createNonEmptyString(input.ownerName, "ownerName"),
    segment: input.segment,
    amount: createMoneyAmount(input.amount, "amount"),
    stage: input.stage,
    createdAt: createIsoDateString(input.createdAt, "createdAt"),
    closeDate: createIsoDateString(input.closeDate, "closeDate"),
    stageEnteredAt: createIsoDateString(input.stageEnteredAt, "stageEnteredAt"),
    lastActivityAt: input.lastActivityAt ? createIsoDateString(input.lastActivityAt, "lastActivityAt") : null,
    nextStep: input.nextStep ? createNonEmptyString(input.nextStep, "nextStep") : null,
    crmProbability: createProbability(input.crmProbability, "crmProbability"),
    ownerHistoricalWinRate: createProbability(input.ownerHistoricalWinRate, "ownerHistoricalWinRate"),
    averageSalesCycleDays: createPositiveInteger(input.averageSalesCycleDays, "averageSalesCycleDays"),
    source: input.source,
    syntheticOutcome: input.syntheticOutcome,
    syntheticTrueProbability:
      input.syntheticTrueProbability === undefined
        ? undefined
        : createProbability(input.syntheticTrueProbability, "syntheticTrueProbability")
  };

  return Object.freeze(deal);
}
