import type { DealRecommendation } from "@constellation/core";
import type {
  RecommendationGatewayInput,
  RecommendationModelGateway,
  ReportGatewayInput
} from "./model-gateway";
import { shouldEscalateToHuman } from "./recommendation-context";
import type { AiDealAssessment, AiRecommendationReport } from "./two-step-schema";

export class DeterministicRecommendationGateway implements RecommendationModelGateway {
  async generate(input: RecommendationGatewayInput) {
    return {
      output: buildDeterministicRecommendation(input),
      metadata: {
        provider: "deterministic-fallback",
        modelName: "rules-from-engine-output"
      }
    };
  }

  async generateAssessment(input: RecommendationGatewayInput) {
    return {
      output: buildDeterministicAssessment(input),
      metadata: {
        provider: "deterministic-fallback",
        modelName: "rules-from-engine-output"
      }
    };
  }

  async generateReport(input: ReportGatewayInput) {
    return {
      output: buildDeterministicReport(input),
      metadata: {
        provider: "deterministic-fallback",
        modelName: "rules-from-engine-output"
      }
    };
  }
}

export function buildDeterministicRecommendation(input: RecommendationGatewayInput): DealRecommendation {
  const { analysis, forecast, context } = input;
  const topDrivers = analysis.riskDrivers.slice(0, 3);
  const escalate = shouldEscalateToHuman(context);

  return {
    executiveSummary: `${analysis.deal.accountName} is a ${analysis.riskLevel} risk deal with ${(analysis.adjustedProbability * 100).toFixed(0)}% adjusted close probability and ${currency(analysis.expectedRevenue)} expected revenue.`,
    riskExplanation: topDrivers.length
      ? `The risk score is driven by ${topDrivers.map((driver) => driver.label.toLowerCase()).join(", ")}. These are deterministic model outputs, not invented CRM facts.`
      : "The deal is already closed, so the risk score is determined by the closed state.",
    nextBestActions: buildActions(input, escalate),
    missingInformation: analysis.missingData,
    confidence: analysis.missingData.length > 1 ? "low" : forecast.confidence,
    shouldEscalateToHuman: escalate
  };
}

export function buildDeterministicAssessment(input: RecommendationGatewayInput): AiDealAssessment {
  const { analysis, forecast } = input;
  const topDrivers = analysis.riskDrivers.slice(0, 5);

  return {
    dealHealth: analysis.riskLevel === "low" ? "strong" : analysis.riskLevel === "medium" ? "moderate" : "weak",
    forecastInterpretation: `${analysis.deal.accountName} contributes ${currency(analysis.expectedRevenue)} in expected revenue against a pipeline forecast of ${currency(forecast.expectedRevenue)}. The adjusted close probability is ${(analysis.adjustedProbability * 100).toFixed(0)}%, compared with CRM probability of ${(analysis.deal.crmProbability * 100).toFixed(0)}%.`,
    riskFactors: topDrivers.map((driver) => ({
      label: driver.label,
      severity: driver.contribution >= 20 ? "high" : driver.contribution >= 10 ? "medium" : "low",
      evidence: driver.explanation,
      impact: `This driver contributes ${driver.contribution.toFixed(1)} points to the deterministic risk score.`
    })),
    positiveSignals: buildPositiveSignals(input),
    missingEvidence: analysis.missingData,
    recommendedFocusAreas: buildFocusAreas(input),
    confidenceExplanation: `Forecast confidence is ${forecast.confidence}. Missing fields: ${analysis.missingData.length ? analysis.missingData.join(", ") : "none"}.`
  };
}

export function buildDeterministicReport(input: ReportGatewayInput): AiRecommendationReport {
  const { analysis, forecast, assessment } = input;
  const escalate = shouldEscalateToHuman(input.context);
  const actions = buildActions(input, escalate);

  return {
    executiveSummary: `${analysis.deal.accountName} requires ${assessment.dealHealth === "weak" ? "active intervention" : "structured follow-up"} because the deterministic forecast shows ${(analysis.adjustedProbability * 100).toFixed(0)}% adjusted close probability, ${currency(analysis.expectedRevenue)} expected revenue and ${analysis.riskLevel} risk.`,
    forecastExplanation: assessment.forecastInterpretation,
    riskAnalysis: assessment.riskFactors.map((factor) => ({
      title: factor.label,
      explanation: factor.impact,
      evidence: [factor.evidence]
    })),
    opportunityAnalysis: assessment.positiveSignals.length
      ? assessment.positiveSignals.map((signal) => ({
          title: signal.label,
          explanation: "This signal can support forecast confidence if the sales team maintains execution discipline.",
          evidence: [signal.evidence]
        }))
      : [
          {
            title: "No dominant positive signal",
            explanation: "The deterministic inputs do not show a positive signal strong enough to offset the main risk drivers.",
            evidence: [`Forecast confidence is ${forecast.confidence}.`]
          }
        ],
    recommendedActions: [...actions],
    nextSteps: actions.map((action) => action.action),
    decisionSupport: `Leadership should treat this deal as ${analysis.riskLevel} risk and prioritize the recommended actions before accepting the current close date in the forecast.`,
    missingInformation: assessment.missingEvidence,
    confidence: analysis.missingData.length > 1 ? "low" : forecast.confidence,
    shouldEscalateToHuman: escalate
  };
}

export function mapReportToRecommendation(
  report: AiRecommendationReport,
  maxActions: number
): DealRecommendation {
  return {
    executiveSummary: report.executiveSummary,
    riskExplanation: [
      report.forecastExplanation,
      ...report.riskAnalysis.map((section) => `${section.title}: ${section.explanation}`)
    ].join("\n\n"),
    nextBestActions: report.recommendedActions.slice(0, maxActions),
    missingInformation: report.missingInformation,
    confidence: report.confidence,
    shouldEscalateToHuman: report.shouldEscalateToHuman,
    detailedReport: {
      forecastExplanation: report.forecastExplanation,
      riskAnalysis: report.riskAnalysis,
      opportunityAnalysis: report.opportunityAnalysis,
      decisionSupport: report.decisionSupport,
      nextSteps: report.nextSteps
    }
  };
}

function buildActions(input: RecommendationGatewayInput, shouldEscalate: boolean): DealRecommendation["nextBestActions"] {
  const actions: Array<DealRecommendation["nextBestActions"][number]> = [];
  const { analysis } = input;

  if (analysis.missingData.includes("nextStep")) {
    actions.push({
      action: "Define a dated next step with the buyer",
      rationale: "Missing next step is one of the strongest operational risk signals.",
      urgency: "high"
    });
  }

  if (analysis.features.daysSinceLastActivity === null || analysis.features.daysSinceLastActivity > 14) {
    actions.push({
      action: "Create immediate buyer activity",
      rationale: "Inactivity is reducing the adjusted close probability.",
      urgency: "high"
    });
  }

  if (analysis.features.closePressure > 0.65) {
    actions.push({
      action: "Validate the close date against procurement reality",
      rationale: "The current close date is close enough to create forecast slippage risk.",
      urgency: "medium"
    });
  }

  if (shouldEscalate) {
    actions.push({
      action: "Escalate to sales leadership",
      rationale: "The deal combines high revenue impact with high forecast risk.",
      urgency: "high"
    });
  }

  if (actions.length === 0) {
    actions.push({
      action: "Monitor the deal against the current forecast",
      rationale: "No critical missing information or immediate operating risk driver dominates the current analysis.",
      urgency: "low"
    });
  }

  return actions.slice(0, input.context.policy.maxActions);
}

function buildPositiveSignals(input: RecommendationGatewayInput): AiDealAssessment["positiveSignals"] {
  const { analysis } = input;
  const signals: AiDealAssessment["positiveSignals"] = [];

  if (analysis.features.daysSinceLastActivity !== null && analysis.features.daysSinceLastActivity <= 7) {
    signals.push({
      label: "Recent buyer activity",
      evidence: `Last activity occurred ${analysis.features.daysSinceLastActivity} days ago.`
    });
  }

  if (analysis.deal.nextStep) {
    signals.push({
      label: "Next step exists",
      evidence: `The CRM next step is: ${analysis.deal.nextStep}.`
    });
  }

  if (analysis.adjustedProbability >= analysis.baseProbability) {
    signals.push({
      label: "Probability did not deteriorate",
      evidence: "The adjusted close probability is at or above the base probability."
    });
  }

  return signals;
}

function buildFocusAreas(input: RecommendationGatewayInput): string[] {
  const areas = buildActions(input, shouldEscalateToHuman(input.context)).map((action) => action.action);
  return Array.from(new Set(areas));
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
