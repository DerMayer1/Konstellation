import { createDeal, type Deal, type DealInput, type DealSource, type DealStage, type Segment } from "@constellation/core";
import { amountForSegment } from "./amount-distribution";
import { scenarioConfigs, type ScenarioBias, type ScenarioConfig, type ScenarioKey } from "./scenarios";
import { seededRandom } from "./seeded-rng";
import { clampProbability, stagePrior, syntheticTrueProbability } from "./true-probability";

export type Scenario = {
  key: ScenarioKey;
  name: string;
  description: string;
  targetRevenue: number;
  deals: Deal[];
};

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
  return scenarioConfigs.map(generateScenario);
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
  const ownerHistoricalWinRate = clampProbability(
    0.32 + random() * 0.34 - (config.bias === "stale" ? 0.08 : 0) + (source === "referral" ? 0.06 : 0)
  );
  const optimism = config.bias === "inflated" ? 0.28 : config.bias === "healthy" ? 0.04 : 0.12;
  const crmProbability = clampProbability(stagePrior(stage) + optimism + (random() - 0.5) * 0.18);
  const trueProbability = syntheticTrueProbability({
    stage,
    ownerHistoricalWinRate,
    source,
    inactiveDays,
    averageSalesCycleDays,
    hasNextStep
  });

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

function pickSegment(bias: ScenarioBias, random: () => number): Segment {
  if (bias === "enterprise") return random() < 0.7 ? "enterprise" : "mid_market";
  const roll = random();
  if (roll < 0.38) return "smb";
  if (roll < 0.78) return "mid_market";
  return "enterprise";
}

function pickStage(bias: ScenarioBias, random: () => number): DealStage {
  if (bias === "healthy" && random() > 0.62) return "negotiation";
  if (bias === "inflated" && random() > 0.7) return "proposal";
  return stages[Math.floor(random() * stages.length)]!;
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
