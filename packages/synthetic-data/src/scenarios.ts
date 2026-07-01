export type ScenarioKey =
  | "healthy"
  | "inflated"
  | "stale"
  | "enterprise"
  | "target_pressure";

export type ScenarioBias = "healthy" | "inflated" | "stale" | "enterprise" | "pressure";

export type ScenarioConfig = {
  readonly key: ScenarioKey;
  readonly name: string;
  readonly description: string;
  readonly targetRevenue: number;
  readonly seed: number;
  readonly count: number;
  readonly bias: ScenarioBias;
};

export const scenarioConfigs: readonly ScenarioConfig[] = [
  {
    key: "healthy",
    name: "Healthy pipeline",
    description: "Good activity, clear next steps, and distributed risk.",
    targetRevenue: 850000,
    seed: 101,
    count: 32,
    bias: "healthy"
  },
  {
    key: "inflated",
    name: "Inflated forecast",
    description: "CRM probabilities are optimistic while operating signals are weak.",
    targetRevenue: 1100000,
    seed: 202,
    count: 34,
    bias: "inflated"
  },
  {
    key: "stale",
    name: "Stale pipeline",
    description: "Many old deals have missing activity and unclear next steps.",
    targetRevenue: 900000,
    seed: 303,
    count: 30,
    bias: "stale"
  },
  {
    key: "enterprise",
    name: "Enterprise-heavy",
    description: "A few large deals drive volatility and concentration.",
    targetRevenue: 1500000,
    seed: 404,
    count: 24,
    bias: "enterprise"
  },
  {
    key: "target_pressure",
    name: "High target pressure",
    description: "The target is aggressive relative to adjusted probability.",
    targetRevenue: 1750000,
    seed: 505,
    count: 36,
    bias: "pressure"
  }
];
