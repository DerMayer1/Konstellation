import { createDeal, seededRandom, type Deal, type DealInput, type DealSource, type DealStage, type Segment } from "@constellation/core";

export type ScenarioKey =
  | "healthy"
  | "inflated"
  | "stale"
  | "enterprise"
  | "target_pressure";

export type Scenario = {
  key: ScenarioKey;
  name: string;
  description: string;
  targetRevenue: number;
  deals: Deal[];
};

type ScenarioConfig = {
  key: ScenarioKey;
  name: string;
  description: string;
  targetRevenue: number;
  seed: number;
  count: number;
  bias: "healthy" | "inflated" | "stale" | "enterprise" | "pressure";
};

const configs: ScenarioConfig[] = [
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

const accounts = [
  "Northstar Bank",
  "Apex Cloud",
  "Meridian Foods",
  "Vector Health",
  "Summit Grid",
  "Orbit Freight",
  "Acme Robotics",
  "Beacon Labs",
  "Helio Energy",
  "Atlas Retail",
  "Pioneer Bio",
  "Cobalt Systems"
];

const owners = ["Maya Chen", "Lucas Moore", "Priya Shah", "Daniel Kim", "Ava Martin"];
const stages: DealStage[] = ["qualification", "demo", "proposal", "negotiation", "prospecting"];
const sources: DealSource[] = ["inbound", "outbound", "partner", "referral"];
const segments: Segment[] = ["smb", "mid_market", "enterprise"];
const today = new Date("2026-07-01T12:00:00.000Z");

export function getScenarios(): Scenario[] {
  return configs.map(generateScenario);
}

export function getScenario(key: ScenarioKey): Scenario {
  return getScenarios().find((scenario) => scenario.key === key) ?? getScenarios()[0]!;
}

function generateScenario(config: ScenarioConfig): Scenario {
  const random = seededRandom(config.seed);
  const deals = Array.from({ length: config.count }, (_, index) => createSyntheticDeal(config, random, index));
  return {
    key: config.key,
    name: config.name,
    description: config.description,
    targetRevenue: config.targetRevenue,
    deals
  };
}

function createSyntheticDeal(config: ScenarioConfig, random: () => number, index: number): Deal {
  const segment = pickSegment(config.bias, random);
  const stage = pickStage(config.bias, random);
  const source = sources[Math.floor(random() * sources.length)]!;
  const ownerName = owners[Math.floor(random() * owners.length)]!;
  const amount = amountForSegment(segment, random, config.bias);
  const averageSalesCycleDays = segment === "enterprise" ? 110 : segment === "mid_market" ? 72 : 44;
  const ageBias = config.bias === "stale" ? 1.75 : config.bias === "healthy" ? 0.65 : 1;
  const dealAge = Math.round((20 + random() * averageSalesCycleDays * 1.8) * ageBias);
  const stageAge = Math.round(4 + random() * (config.bias === "stale" ? 55 : 28));
  const closeInDays = Math.round((config.bias === "pressure" || config.bias === "inflated" ? 4 : 12) + random() * 46);
  const inactiveDays =
    config.bias === "healthy"
      ? Math.round(random() * 9)
      : config.bias === "stale"
        ? Math.round(18 + random() * 48)
        : Math.round(random() * 28);
  const hasNextStep = config.bias === "healthy" ? random() > 0.08 : config.bias === "stale" ? random() > 0.55 : random() > 0.25;
  const ownerHistoricalWinRate = clamp(
    0.32 + random() * 0.34 - (config.bias === "stale" ? 0.08 : 0) + (source === "referral" ? 0.06 : 0)
  );
  const stagePrior = { prospecting: 0.08, qualification: 0.18, demo: 0.34, proposal: 0.52, negotiation: 0.72, closed_won: 1, closed_lost: 0 }[stage];
  const optimism = config.bias === "inflated" ? 0.28 : config.bias === "healthy" ? 0.04 : 0.12;
  const crmProbability = clamp(stagePrior + optimism + (random() - 0.5) * 0.18);
  const trueProbability = clamp(
    stagePrior * 0.45 +
      ownerHistoricalWinRate * 0.32 +
      (source === "referral" ? 0.12 : source === "partner" ? 0.08 : 0) -
      inactiveDays / averageSalesCycleDays * 0.22 -
      (hasNextStep ? 0 : 0.16)
  );

  const input: DealInput = {
    id: `${config.key}-${index + 1}`,
    accountName: `${accounts[index % accounts.length]} ${index > 11 ? index + 1 : ""}`.trim(),
    ownerName,
    segment,
    amount,
    stage,
    createdAt: isoDaysAgo(dealAge),
    closeDate: isoDaysFromNow(closeInDays),
    stageEnteredAt: isoDaysAgo(stageAge),
    lastActivityAt: random() > 0.08 ? isoDaysAgo(inactiveDays) : null,
    nextStep: hasNextStep ? nextStepFor(stage) : null,
    crmProbability,
    ownerHistoricalWinRate,
    averageSalesCycleDays,
    source,
    syntheticTrueProbability: trueProbability,
    syntheticOutcome: random() < trueProbability ? "won" : "lost"
  };

  return createDeal(input);
}

function pickSegment(bias: ScenarioConfig["bias"], random: () => number): Segment {
  if (bias === "enterprise") return random() < 0.7 ? "enterprise" : "mid_market";
  const roll = random();
  if (roll < 0.38) return "smb";
  if (roll < 0.78) return "mid_market";
  return "enterprise";
}

function pickStage(bias: ScenarioConfig["bias"], random: () => number): DealStage {
  if (bias === "healthy" && random() > 0.62) return "negotiation";
  if (bias === "inflated" && random() > 0.7) return "proposal";
  return stages[Math.floor(random() * stages.length)]!;
}

function amountForSegment(segment: Segment, random: () => number, bias: ScenarioConfig["bias"]): number {
  const base = segment === "enterprise" ? 150000 : segment === "mid_market" ? 56000 : 18000;
  const spread = segment === "enterprise" ? 180000 : segment === "mid_market" ? 62000 : 22000;
  const multiplier = bias === "enterprise" && segment === "enterprise" ? 1.35 : 1;
  return Math.round((base + random() ** 2 * spread) * multiplier / 1000) * 1000;
}

function nextStepFor(stage: DealStage): string {
  const map: Record<DealStage, string> = {
    prospecting: "Confirm discovery call",
    qualification: "Validate budget and timing",
    demo: "Send tailored demo recap",
    proposal: "Review commercial proposal",
    negotiation: "Schedule procurement call",
    closed_won: "Handoff to customer success",
    closed_lost: "Capture loss reason"
  };
  return map[stage];
}

function isoDaysAgo(days: number): string {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function isoDaysFromNow(days: number): string {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function clamp(value: number): number {
  return Math.min(0.98, Math.max(0.02, value));
}
