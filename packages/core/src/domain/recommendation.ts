export type RecommendationUrgency = "low" | "medium" | "high";
export type RecommendationConfidence = "low" | "medium" | "high";

export type DealRecommendationReport = {
  readonly forecastExplanation: string;
  readonly riskAnalysis: readonly {
    readonly title: string;
    readonly explanation: string;
    readonly evidence: readonly string[];
  }[];
  readonly opportunityAnalysis: readonly {
    readonly title: string;
    readonly explanation: string;
    readonly evidence: readonly string[];
  }[];
  readonly decisionSupport: string;
  readonly nextSteps: readonly string[];
};

export type DealRecommendation = {
  readonly executiveSummary: string;
  readonly riskExplanation: string;
  readonly nextBestActions: readonly {
    readonly action: string;
    readonly rationale: string;
    readonly urgency: RecommendationUrgency;
  }[];
  readonly missingInformation: readonly string[];
  readonly confidence: RecommendationConfidence;
  readonly shouldEscalateToHuman: boolean;
  readonly detailedReport?: DealRecommendationReport;
};
