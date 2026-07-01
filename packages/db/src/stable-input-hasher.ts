import { createHash } from "node:crypto";
import type { InputHasher } from "@constellation/core";

export class StableInputHasher implements InputHasher {
  hash(input: unknown): string {
    return createHash("sha256").update(stableStringify(input)).digest("hex");
  }
}

export function stableStringify(input: unknown): string {
  return JSON.stringify(normalize(input));
}

function normalize(input: unknown): unknown {
  if (input === null || typeof input !== "object") return input;

  if (Array.isArray(input)) {
    return input.map((item) => normalize(item));
  }

  const record = input as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      const value = record[key];
      if (value !== undefined) {
        accumulator[key] = normalize(value);
      }
      return accumulator;
    }, {});
}
