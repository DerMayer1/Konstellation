import { describe, expect, it } from "vitest";
import { getScenario, getScenarios, scenarioConfigs } from "../src";

describe("synthetic data generator", () => {
  it("creates every required scenario", () => {
    const scenarios = getScenarios();

    expect(scenarios.map((scenario) => scenario.key).sort()).toEqual(
      ["enterprise", "healthy", "inflated", "stale", "target_pressure"].sort()
    );
    expect(scenarios).toHaveLength(scenarioConfigs.length);
  });

  it("is deterministic for a given scenario key", () => {
    const first = getScenario("inflated");
    const second = getScenario("inflated");

    expect(first.deals.map((deal) => [deal.id, deal.amount, deal.syntheticTrueProbability])).toEqual(
      second.deals.map((deal) => [deal.id, deal.amount, deal.syntheticTrueProbability])
    );
  });

  it("creates valid labeled deals for evaluation", () => {
    const scenario = getScenario("healthy");

    expect(scenario.deals.length).toBeGreaterThan(0);
    expect(scenario.deals.every((deal) => deal.syntheticOutcome === "won" || deal.syntheticOutcome === "lost")).toBe(true);
    expect(scenario.deals.every((deal) => typeof deal.syntheticTrueProbability === "number")).toBe(true);
  });
});
