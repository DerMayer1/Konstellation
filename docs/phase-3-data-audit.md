# Phase 3: Data, Persistence and Audit

## Scope

Phase 3 adds data and audit infrastructure around the validated domain and quantitative engine.

It includes:

- synthetic scenario modules;
- deterministic seeded generation;
- lognormal deal amount distribution;
- hidden synthetic true probability;
- CSV import outside React;
- concrete repositories;
- JSON file persistence;
- stable input hashing;
- seed script;
- infrastructure tests.

It intentionally excludes:

- OpenAI integration;
- prompt orchestration;
- authentication;
- multi-tenant storage;
- Salesforce or HubSpot integration;
- SQLite/Drizzle native setup.

## Architecture Boundary

The dependency direction remains:

1. `packages/core`: domain, validation, quantitative engine and contracts;
2. `packages/synthetic-data`: deterministic data generation;
3. `packages/db`: repository adapters, file persistence, hashing and seed;
4. `apps/web`: presentation only.

React components no longer parse CSV into deals directly. They call the core importer.

## Module Map

| Concern | Module |
| --- | --- |
| CSV import | `packages/core/src/import/csv-deal-importer.ts` |
| Scenario configuration | `packages/synthetic-data/src/scenarios.ts` |
| Seeded RNG | `packages/synthetic-data/src/seeded-rng.ts` |
| Amount distribution | `packages/synthetic-data/src/amount-distribution.ts` |
| Synthetic true probability | `packages/synthetic-data/src/true-probability.ts` |
| Scenario generator | `packages/synthetic-data/src/generator.ts` |
| In-memory repositories | `packages/db/src/in-memory-repositories.ts` |
| JSON file repositories | `packages/db/src/json-file-store.ts` |
| Stable input hashing | `packages/db/src/stable-input-hasher.ts` |
| Seed script | `packages/db/src/seed.ts` |

## Persistence Decision

Phase 3 uses JSON file persistence instead of SQLite.

Reason:

- it avoids native dependency friction on Windows;
- it keeps the repository boundary easy to inspect;
- it proves persistence, auditability and seed flow;
- it remains replaceable by SQLite/Drizzle because the app depends on `DealRepository` and `AuditRepository` contracts.

The JSON store shape is:

```ts
type StoreShape = {
  deals: unknown[];
  auditRecords: AuditRecord[];
};
```

Deals are revalidated through `parseDeals` when read back from disk.

## CSV Import

External CSV data enters as text and returns a structured result:

```ts
type CsvDealImportResult =
  | { success: true; deals: readonly Deal[] }
  | { success: false; issues: readonly CsvImportIssue[] };
```

The importer supports:

- required and optional columns;
- simple quoted comma values;
- probability values as `0.6` or `60%`;
- row-level validation issues.

## Synthetic Data

Synthetic data is now split by responsibility:

- scenarios define business behavior;
- seeded RNG guarantees deterministic datasets;
- amount generation uses lognormal distribution;
- hidden true probability supports evaluation metrics.

Required scenarios:

- healthy;
- inflated;
- stale;
- enterprise-heavy;
- high target pressure.

## Audit Infrastructure

Phase 3 implements:

- `InMemoryAuditRepository`;
- `JsonFileAuditRepository`;
- stable SHA-256 hashing through `StableInputHasher`.

The hash is independent of object key order because inputs are normalized before hashing.

## Seed

The seed command is:

```bash
npm run seed
```

By default it writes:

```text
data/constellation-store.json
```

The `data/` directory is ignored by Git.

## Acceptance Criteria

Phase 3 is complete when:

- synthetic scenarios are split and deterministic;
- generated deals are valid domain deals;
- CSV parsing is outside React;
- valid CSV returns `Deal[]`;
- invalid CSV returns structured issues;
- repositories implement `DealRepository` and `AuditRepository`;
- audit records can be persisted and listed by deal;
- stable input hashing is available;
- seed writes synthetic deals into local persistence;
- tests cover synthetic data, CSV, repositories, audit, hash and seed;
- `npm test`, `npx tsc --noEmit`, `npm run seed` and `npm run build` pass.
