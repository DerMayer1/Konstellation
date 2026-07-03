import type { DealAnalysis, ForecastResult } from "@constellation/core";

export type RecommendationContext = {
  readonly deal: {
    readonly id: string;
    readonly accountName: string;
    readonly ownerName: string;
    readonly segment: string;
    readonly amount: number;
    readonly stage: string;
    readonly closeDate: string;
    readonly nextStep: string | null;
  };
  readonly risk: {
    readonly score: number;
    readonly level: string;
    readonly topDrivers: readonly {
      readonly key: string;
      readonly label: string;
      readonly contribution: number;
      readonly explanation: string;
    }[];
  };
  readonly probability: {
    readonly crmProbability: number;
    readonly baseProbability: number;
    readonly adjustedProbability: number;
    readonly expectedRevenue: number;
  };
  readonly forecast: {
    readonly targetRevenue: number;
    readonly expectedRevenue: number;
    readonly p10: number;
    readonly p50: number;
    readonly p90: number;
    readonly probabilityOfHittingTarget: number;
    readonly confidence: string;
  };
  readonly missingData: readonly string[];
  readonly policy: {
    readonly highRiskThreshold: number;
    readonly highValueShareOfForecast: number;
    readonly tone: string;
    readonly detailLevel: string;
    readonly maxActions: number;
  };
};

export function buildRecommendationContext(
  analysis: DealAnalysis,
  forecast: ForecastResult,
  options: {
    readonly tone?: string;
    readonly detailLevel?: string;
    readonly maxActions?: number;
  } = {}
): RecommendationContext {
  return {
    deal: {
      id: analysis.deal.id,
      accountName: analysis.deal.accountName,
      ownerName: analysis.deal.ownerName,
      segment: analysis.deal.segment,
      amount: analysis.deal.amount,
      stage: analysis.deal.stage,
      closeDate: analysis.deal.closeDate,
      nextStep: analysis.deal.nextStep
    },
    risk: {
      score: analysis.riskScore,
      level: analysis.riskLevel,
      topDrivers: analysis.riskDrivers.slice(0, 5).map((driver) => ({
        key: driver.key,
        label: driver.label,
        contribution: driver.contribution,
        explanation: driver.explanation
      }))
    },
    probability: {
      crmProbability: analysis.deal.crmProbability,
      baseProbability: analysis.baseProbability,
      adjustedProbability: analysis.adjustedProbability,
      expectedRevenue: analysis.expectedRevenue
    },
    forecast: {
      targetRevenue: forecast.targetRevenue,
      expectedRevenue: forecast.expectedRevenue,
      p10: forecast.p10,
      p50: forecast.p50,
      p90: forecast.p90,
      probabilityOfHittingTarget: forecast.probabilityOfHittingTarget,
      confidence: forecast.confidence
    },
    missingData: analysis.missingData,
    policy: {
      highRiskThreshold: 75,
      highValueShareOfForecast: 0.18,
      tone: options.tone ?? "executive",
      detailLevel: options.detailLevel ?? "standard",
      maxActions: options.maxActions ?? 4
    }
  };
}

export function shouldEscalateToHuman(context: RecommendationContext): boolean {
  const isHighRisk = context.risk.score >= context.policy.highRiskThreshold;
  const isHighValue = context.deal.amount >= context.forecast.expectedRevenue * context.policy.highValueShareOfForecast;
  return isHighRisk && isHighValue;
}
