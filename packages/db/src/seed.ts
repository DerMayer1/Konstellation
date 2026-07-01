import { resolve } from "node:path";
import { getScenarios } from "@constellation/synthetic-data";
import { JsonFileDealRepository, resetJsonStore } from "./json-file-store";

const defaultStorePath = resolve(process.cwd(), "data", "constellation-store.json");

export async function seedSyntheticDeals(filePath = defaultStorePath): Promise<{
  readonly filePath: string;
  readonly scenarioCount: number;
  readonly dealCount: number;
}> {
  const scenarios = getScenarios();
  const deals = scenarios.flatMap((scenario) => scenario.deals);
  await resetJsonStore(filePath);
  await new JsonFileDealRepository(filePath).saveMany(deals);

  return {
    filePath,
    scenarioCount: scenarios.length,
    dealCount: deals.length
  };
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedSyntheticDeals()
    .then((result) => {
      console.log(`Seeded ${result.dealCount} deals from ${result.scenarioCount} scenarios into ${result.filePath}`);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
