type Brand<T, Name extends string> = T & { readonly __brand: Name };

export class DomainValidationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = [message]) {
    super(message);
    this.name = "DomainValidationError";
    this.issues = issues;
  }
}

export type NonEmptyString = Brand<string, "NonEmptyString">;
export type IsoDateString = Brand<string, "IsoDateString">;
export type MoneyAmount = Brand<number, "MoneyAmount">;
export type Probability = Brand<number, "Probability">;
export type PositiveInteger = Brand<number, "PositiveInteger">;
export type RiskScore = Brand<number, "RiskScore">;

export function createNonEmptyString(value: string, fieldName = "value"): NonEmptyString {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new DomainValidationError(`${fieldName} must be a non-empty string`);
  }
  return normalized as NonEmptyString;
}

export function createIsoDateString(value: string, fieldName = "date"): IsoDateString {
  const timestamp = Date.parse(value);
  if (!value || Number.isNaN(timestamp)) {
    throw new DomainValidationError(`${fieldName} must be a valid ISO date string`);
  }
  return new Date(timestamp).toISOString() as IsoDateString;
}

export function createMoneyAmount(value: number, fieldName = "amount"): MoneyAmount {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainValidationError(`${fieldName} must be a positive finite number`);
  }
  return value as MoneyAmount;
}

export function createProbability(value: number, fieldName = "probability"): Probability {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new DomainValidationError(`${fieldName} must be between 0 and 1`);
  }
  return value as Probability;
}

export function createPositiveInteger(value: number, fieldName = "value"): PositiveInteger {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainValidationError(`${fieldName} must be a positive integer`);
  }
  return value as PositiveInteger;
}

export function createRiskScore(value: number, fieldName = "riskScore"): RiskScore {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new DomainValidationError(`${fieldName} must be between 0 and 100`);
  }
  return value as RiskScore;
}
