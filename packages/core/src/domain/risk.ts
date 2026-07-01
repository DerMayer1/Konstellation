import type { DealAnalysis, DealFeatures, RiskDriver, RiskLevel } from "./deal";

export type { DealAnalysis, DealFeatures, RiskDriver, RiskLevel };

export type RiskEnginePolicy = {
  readonly version: string;
  readonly riskPenaltyGamma: number;
};
