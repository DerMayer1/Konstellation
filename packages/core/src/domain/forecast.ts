import type { ForecastResult } from "./deal";

export type { ForecastResult };

export type ForecastConfidence = "low" | "medium" | "high";

export type ForecastTarget = {
  readonly revenue: number;
  readonly periodLabel: string;
};
