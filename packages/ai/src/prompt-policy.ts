import type { RecommendationContext } from "./recommendation-context";
import type { AiDealAssessment } from "./two-step-schema";

export const dealRecommendationPromptVersion = "deal-recommendation-v0.3.0";

export const dealRecommendationSystemPrompt = [
  "You generate executive recommendations for B2B revenue forecast risk.",
  "You are not allowed to change numerical scores.",
  "You must only explain the provided risk score, drivers, adjusted probability and forecast context.",
  "You must not invent CRM data, customer conversations, buyer names, objections, competitors or timeline facts.",
  "If important information is missing, include it in missingInformation.",
  "If the deal is high value and high risk, set shouldEscalateToHuman to true.",
  "Return valid JSON only."
].join("\n");

export function buildDealRecommendationUserPrompt(context: RecommendationContext): string {
  return JSON.stringify({
    task: "Explain the deterministic forecast outputs and recommend next best actions.",
    outputPreferences: {
      tone: context.policy.tone,
      detailLevel: context.policy.detailLevel,
      maxActions: context.policy.maxActions
    },
    context
  });
}

export const dealAssessmentSystemPrompt = [
  "You produce structured analysis for B2B revenue forecast risk.",
  "You must not calculate new probabilities, revenue values, risk scores or forecast percentiles.",
  "You must only interpret the provided deterministic forecast outputs and CRM fields.",
  "You must separate evidence from interpretation.",
  "You must not invent CRM data, customer conversations, buyer names, objections, competitors or timeline facts.",
  "Return valid JSON only."
].join("\n");

export function buildDealAssessmentUserPrompt(context: RecommendationContext): string {
  return JSON.stringify({
    task: "Create a structured deal assessment for the report writer.",
    outputPreferences: {
      tone: context.policy.tone,
      detailLevel: context.policy.detailLevel,
      maxActions: context.policy.maxActions
    },
    context
  });
}

export const dealReportSystemPrompt = [
  "You write detailed executive reports for B2B revenue forecast risk.",
  "You must base the report on the deterministic forecast context and the validated assessment.",
  "You are not allowed to change numerical scores, probabilities, revenue values or forecast percentiles.",
  "Explain each topic clearly enough for sales leadership to audit the reasoning.",
  "Recommendations must be actionable and grounded in the provided risk drivers, missing evidence and forecast context.",
  "You must not invent CRM data, customer conversations, buyer names, objections, competitors or timeline facts.",
  "Return valid JSON only."
].join("\n");

export function buildDealReportUserPrompt(context: RecommendationContext, assessment: AiDealAssessment): string {
  return JSON.stringify({
    task: "Write the final recommendation report from the deterministic forecast context and the validated assessment.",
    outputPreferences: {
      tone: context.policy.tone,
      detailLevel: context.policy.detailLevel,
      maxActions: context.policy.maxActions
    },
    context,
    assessment
  });
}
