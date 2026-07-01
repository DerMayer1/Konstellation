import { z } from "zod";
import { createDeal, dealSources, dealStages, segments, type Deal, type DealInput } from "../domain/deal";

const isoDateSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Expected a valid ISO date string")
  .transform((value) => new Date(value).toISOString());

const optionalIsoDateSchema = z
  .union([isoDateSchema, z.literal(""), z.null()])
  .transform((value) => (value === "" ? null : value));

export const dealInputSchema = z.object({
  id: z.string().trim().min(1),
  accountName: z.string().trim().min(1),
  ownerName: z.string().trim().min(1),
  segment: z.enum(segments),
  amount: z.number().finite().positive(),
  stage: z.enum(dealStages),
  createdAt: isoDateSchema,
  closeDate: isoDateSchema,
  stageEnteredAt: isoDateSchema,
  lastActivityAt: optionalIsoDateSchema,
  nextStep: z
    .union([z.string().trim().min(1), z.literal(""), z.null()])
    .transform((value) => (value === "" ? null : value)),
  crmProbability: z.number().finite().min(0).max(1),
  ownerHistoricalWinRate: z.number().finite().min(0).max(1),
  averageSalesCycleDays: z.number().int().positive(),
  source: z.enum(dealSources),
  syntheticOutcome: z.enum(["won", "lost"]).optional(),
  syntheticTrueProbability: z.number().finite().min(0).max(1).optional()
}) satisfies z.ZodType<DealInput>;

export const dealsInputSchema = z.array(dealInputSchema).min(1);

export type DealValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type DealValidationResult =
  | { readonly success: true; readonly deal: Deal }
  | { readonly success: false; readonly issues: readonly DealValidationIssue[] };

export type DealsValidationResult =
  | { readonly success: true; readonly deals: readonly Deal[] }
  | { readonly success: false; readonly issues: readonly DealValidationIssue[] };

export function parseDeal(input: unknown): Deal {
  return createDeal(dealInputSchema.parse(input));
}

export function parseDeals(input: unknown): Deal[] {
  return dealsInputSchema.parse(input).map((deal) => createDeal(deal));
}

export function safeParseDeal(input: unknown): DealValidationResult {
  const parsed = dealInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, issues: formatZodIssues(parsed.error) };
  }

  return { success: true, deal: createDeal(parsed.data) };
}

export function safeParseDeals(input: unknown): DealsValidationResult {
  const parsed = dealsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, issues: formatZodIssues(parsed.error) };
  }

  return { success: true, deals: parsed.data.map((deal) => createDeal(deal)) };
}

function formatZodIssues(error: z.ZodError): DealValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}
