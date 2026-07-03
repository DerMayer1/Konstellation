import { z } from "zod";
import type { DealRecommendation } from "@constellation/core";

export const recommendationSchema = z.object({
  executiveSummary: z.string().min(1),
  riskExplanation: z.string().min(1),
  nextBestActions: z.array(
    z.object({
      action: z.string().min(1),
      rationale: z.string().min(1),
      urgency: z.enum(["low", "medium", "high"])
    })
  ),
  missingInformation: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  shouldEscalateToHuman: z.boolean()
}) satisfies z.ZodType<DealRecommendation>;

export type { DealRecommendation };

export const recommendationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary",
    "riskExplanation",
    "nextBestActions",
    "missingInformation",
    "confidence",
    "shouldEscalateToHuman"
  ],
  properties: {
    executiveSummary: { type: "string", minLength: 1 },
    riskExplanation: { type: "string", minLength: 1 },
    nextBestActions: {
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
    missingInformation: {
      type: "array",
      items: { type: "string" }
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    shouldEscalateToHuman: { type: "boolean" }
  }
} as const;
