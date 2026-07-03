export type AiPipelineStep = "recommendation" | "analysis" | "report";

export type AiExecutionGuardSnapshot = {
  readonly maxCalls: number;
  readonly usedCalls: number;
  readonly reservedSteps: readonly AiPipelineStep[];
};

export class AiBudgetExceededError extends Error {
  constructor(step: AiPipelineStep, maxCalls: number) {
    super(`AI call budget exceeded before ${step}; maxCalls=${maxCalls}`);
    this.name = "AiBudgetExceededError";
  }
}

export class AiExecutionGuard {
  private usedCalls = 0;
  private readonly reservedSteps: AiPipelineStep[] = [];

  constructor(private readonly maxCalls: number) {}

  reserve(step: AiPipelineStep): AiExecutionGuardSnapshot {
    if (this.usedCalls >= this.maxCalls) {
      throw new AiBudgetExceededError(step, this.maxCalls);
    }

    this.usedCalls += 1;
    this.reservedSteps.push(step);
    return this.snapshot();
  }

  snapshot(): AiExecutionGuardSnapshot {
    return {
      maxCalls: this.maxCalls,
      usedCalls: this.usedCalls,
      reservedSteps: [...this.reservedSteps]
    };
  }
}
