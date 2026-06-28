export function generateNoisyConsumption(
  expectedConsumption: number,
  unitSize: number,
  rng: () => number = Math.random,
) {
  if (!Number.isFinite(expectedConsumption) || expectedConsumption < 0) {
    throw new Error("Expected consumption must be non-negative.");
  }
  if (!Number.isFinite(unitSize) || unitSize <= 0) {
    throw new Error("Unit size must be positive.");
  }

  const noise = (rng() * 2 - 1) * unitSize;
  return Math.round(Math.max(0, expectedConsumption + noise) * 10) / 10;
}
