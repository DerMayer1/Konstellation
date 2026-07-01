import { safeParseDeal, type DealValidationIssue } from "../validation/deal-schema";
import type { Deal, DealInput } from "../domain/deal";

export type CsvImportIssue = {
  readonly row: number;
  readonly field?: string;
  readonly message: string;
};

export type CsvDealImportResult =
  | { readonly success: true; readonly deals: readonly Deal[] }
  | { readonly success: false; readonly issues: readonly CsvImportIssue[] };

const segmentOptions = ["smb", "mid_market", "enterprise"] as const;
const stageOptions = ["prospecting", "qualification", "demo", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
const sourceOptions = ["inbound", "outbound", "partner", "referral"] as const;

export function importDealsFromCsv(text: string, defaults: { readonly todayIso: string }): CsvDealImportResult {
  const parsed = parseCsv(text);
  if (!parsed.success) return parsed;

  const deals: Deal[] = [];
  const issues: CsvImportIssue[] = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const input = rowToDealInput(row, index, defaults.todayIso);
    const result = safeParseDeal(input);

    if (!result.success) {
      issues.push(...toCsvIssues(rowNumber, result.issues));
      return;
    }

    deals.push(result.deal);
  });

  if (issues.length > 0) return { success: false, issues };
  if (deals.length === 0) {
    return { success: false, issues: [{ row: 1, message: "CSV must contain at least one deal row" }] };
  }

  return { success: true, deals };
}

function parseCsv(text: string): { success: true; rows: Array<Record<string, string>> } | { success: false; issues: CsvImportIssue[] } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { success: false, issues: [{ row: 1, message: "CSV is empty" }] };
  }

  const [headerLine, ...lines] = trimmed.split(/\r?\n/);
  if (!headerLine) {
    return { success: false, issues: [{ row: 1, message: "CSV header is missing" }] };
  }

  const headers = parseCsvLine(headerLine).map((header) => header.trim());
  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    return { success: false, issues: [{ row: 1, message: "CSV header is empty" }] };
  }

  const rows = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCsvLine(line).map((value) => value.trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));

  return { success: true, rows };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function rowToDealInput(row: Record<string, string>, index: number, todayIso: string): DealInput {
  return {
    id: text(row.id) || `csv-${index + 1}`,
    accountName: text(row.accountName) || text(row.account) || `CSV Account ${index + 1}`,
    ownerName: text(row.ownerName) || text(row.owner) || "CSV Owner",
    segment: enumValue(row.segment, segmentOptions, "mid_market"),
    amount: numberValue(row.amount, NaN),
    stage: enumValue(row.stage, stageOptions, "proposal"),
    createdAt: text(row.createdAt) || todayIso,
    closeDate: text(row.closeDate) || todayIso,
    stageEnteredAt: text(row.stageEnteredAt) || text(row.createdAt) || todayIso,
    lastActivityAt: text(row.lastActivityAt) || null,
    nextStep: text(row.nextStep) || null,
    crmProbability: probabilityValue(row.crmProbability, 0.5),
    ownerHistoricalWinRate: probabilityValue(row.ownerHistoricalWinRate || row.ownerWinRate, 0.45),
    averageSalesCycleDays: numberValue(row.averageSalesCycleDays, 70),
    source: enumValue(row.source, sourceOptions, "inbound")
  };
}

function text(value: string | undefined): string {
  return value?.trim() ?? "";
}

function numberValue(value: string | undefined, fallback: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function probabilityValue(value: string | undefined, fallback: number): number {
  const raw = text(value);
  if (!raw) return fallback;
  const parsed = Number(raw.replace("%", ""));
  if (!Number.isFinite(parsed)) return fallback;
  return raw.includes("%") ? parsed / 100 : parsed;
}

function enumValue<const T extends readonly string[]>(value: string | undefined, options: T, fallback: T[number]): T[number] {
  const normalized = text(value);
  return (options as readonly string[]).includes(normalized) ? (normalized as T[number]) : fallback;
}

function toCsvIssues(row: number, issues: readonly DealValidationIssue[]): CsvImportIssue[] {
  return issues.map((issue) => ({
    row,
    field: issue.path || undefined,
    message: issue.message
  }));
}
