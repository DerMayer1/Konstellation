import { z } from "zod";

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
});

export type DealRecommendation = z.infer<typeof recommendationSchema>;
