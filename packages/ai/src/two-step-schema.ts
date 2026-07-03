import { z } from "zod";

const urgencySchema = z.enum(["low", "medium", "high"]);
const confidenceSchema = z.enum(["low", "medium", "high"]);
const dealHealthSchema = z.enum(["strong", "moderate", "weak"]);

export const assessmentRiskFactorSchema = z.object({
  label: z.string().min(1),
  severity: urgencySchema,
  evidence: z.string().min(1),
  impact: z.string().min(1)
});

export const assessmentSignalSchema = z.object({
  label: z.string().min(1),
  evidence: z.string().min(1)
});

export const aiDealAssessmentSchema = z.object({
  dealHealth: dealHealthSchema,
  forecastInterpretation: z.string().min(1),
  riskFactors: z.array(assessmentRiskFactorSchema),
  positiveSignals: z.array(assessmentSignalSchema),
  missingEvidence: z.array(z.string()),
  recommendedFocusAreas: z.array(z.string()),
  confidenceExplanation: z.string().min(1)
});

export const reportSectionSchema = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
  evidence: z.array(z.string())
});

export const reportActionSchema = z.object({
  action: z.string().min(1),
  rationale: z.string().min(1),
  urgency: urgencySchema
});

export const aiRecommendationReportSchema = z.object({
  executiveSummary: z.string().min(1),
  forecastExplanation: z.string().min(1),
  riskAnalysis: z.array(reportSectionSchema),
  opportunityAnalysis: z.array(reportSectionSchema),
  recommendedActions: z.array(reportActionSchema),
  nextSteps: z.array(z.string()),
  decisionSupport: z.string().min(1),
  missingInformation: z.array(z.string()),
  confidence: confidenceSchema,
  shouldEscalateToHuman: z.boolean()
});

export type AiDealAssessment = z.infer<typeof aiDealAssessmentSchema>;
export type AiRecommendationReport = z.infer<typeof aiRecommendationReportSchema>;

const reportSectionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "explanation", "evidence"],
  properties: {
    title: { type: "string", minLength: 1 },
    explanation: { type: "string", minLength: 1 },
    evidence: {
      type: "array",
      items: { type: "string" }
    }
  }
} as const;

export const aiDealAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "dealHealth",
    "forecastInterpretation",
    "riskFactors",
    "positiveSignals",
    "missingEvidence",
    "recommendedFocusAreas",
    "confidenceExplanation"
  ],
  properties: {
    dealHealth: { type: "string", enum: ["strong", "moderate", "weak"] },
    forecastInterpretation: { type: "string", minLength: 1 },
    riskFactors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "severity", "evidence", "impact"],
        properties: {
          label: { type: "string", minLength: 1 },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          evidence: { type: "string", minLength: 1 },
          impact: { type: "string", minLength: 1 }
        }
      }
    },
    positiveSignals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "evidence"],
        properties: {
          label: { type: "string", minLength: 1 },
          evidence: { type: "string", minLength: 1 }
        }
      }
    },
    missingEvidence: {
      type: "array",
      items: { type: "string" }
    },
    recommendedFocusAreas: {
      type: "array",
      items: { type: "string" }
    },
    confidenceExplanation: { type: "string", minLength: 1 }
  }
} as const;

export const aiRecommendationReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary",
    "forecastExplanation",
    "riskAnalysis",
    "opportunityAnalysis",
    "recommendedActions",
    "nextSteps",
    "decisionSupport",
    "missingInformation",
    "confidence",
    "shouldEscalateToHuman"
  ],
  properties: {
    executiveSummary: { type: "string", minLength: 1 },
    forecastExplanation: { type: "string", minLength: 1 },
    riskAnalysis: {
      type: "array",
      items: reportSectionJsonSchema
    },
    opportunityAnalysis: {
      type: "array",
      items: reportSectionJsonSchema
    },
    recommendedActions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["action", "rationale", "urgency"],
        properties: {
          action: { type: "string", minLength: 1 },
          rationale: { type: "string", minLength: 1 },
          urgency: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    },
    nextSteps: {
      type: "array",
      items: { type: "string" }
    },
    decisionSupport: { type: "string", minLength: 1 },
    missingInformation: {
      type: "array",
      items: { type: "string" }
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    shouldEscalateToHuman: { type: "boolean" }
  }
} as const;
