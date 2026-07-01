# Phase 1: Domain and Contracts

## Scope

Phase 1 defines the stable core boundary for Constellation.

It includes:

- domain primitives and invariants;
- the validated `Deal` entity;
- raw `DealInput` records for CSV, API, database and synthetic data boundaries;
- recommendation and audit domain types;
- application contracts and ports;
- Zod validation for incoming deal records;
- unit tests for domain invariants and validation behavior.

It intentionally excludes:

- React UI behavior;
- database implementation;
- OpenAI integration;
- Monte Carlo algorithm changes;
- risk model tuning;
- deploy concerns.

## Boundary Rule

External data enters as `DealInput`.

The core engine must operate on `Deal`.

`Deal` instances are created through `createDeal` or validation helpers such as `parseDeal` and `parseDeals`.

## Clean Architecture Direction

The current dependency direction is:

1. domain primitives and entities;
2. validation at the input boundary;
3. application contracts;
4. later use case implementations;
5. infrastructure and UI adapters.

Domain code does not depend on React, Next.js, database clients, OpenAI clients or UI state.

## Acceptance Criteria

Phase 1 is complete when:

- invalid money, probability, dates and empty required strings are rejected;
- `DealInput` and `Deal` are separate types;
- validated deals are immutable at runtime;
- application ports exist for repositories, audit, model gateway and use cases;
- CSV and synthetic data paths create domain deals through the same factory;
- tests cover domain primitives, deal creation and validation errors.
