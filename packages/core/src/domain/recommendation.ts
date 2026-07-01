export type RecommendationUrgency = "low" | "medium" | "high";
export type RecommendationConfidence = "low" | "medium" | "high";

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
};
