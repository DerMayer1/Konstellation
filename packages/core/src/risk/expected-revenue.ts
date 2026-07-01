export function expectedRevenue(amount: number, adjustedProbability: number): number {
  return amount * adjustedProbability;
}
