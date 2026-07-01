# ADR 001: LLM Does Not Score Risk

## Status

Accepted.

## Decision

Numerical scores are produced by deterministic code, not by the language model.

## Rationale

Revenue forecasting needs traceability, repeatability, and numeric consistency. The LLM can summarize, explain, and recommend, but it must not invent or modify risk scores, adjusted probabilities, forecast percentiles, or target-hit probability.
