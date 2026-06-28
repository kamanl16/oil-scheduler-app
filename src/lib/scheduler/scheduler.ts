import type {
  LockedActual,
  ScheduleDay,
  SchedulerConfig,
  SchedulerResult,
  SchedulerWarning,
} from "./types";

type InternalConfig = {
  days: number;
  nomination: number;
  unitSize: number;
  startingInventory: number;
  expectedDailyConsumption: number;
  maxCapacity?: number;
};

type InternalLockedActual = {
  day: number;
  plannedDelivery: number;
  actualDelivery: number;
  actualConsumption: number;
};

// Multiplier to convert 1-decimal inputs to integers for safe math. 80.5 -> 805, 0.1 -> 1, etc.
// Avoid floating point math issues.
const SCALE = 10;

/**
 * Generates a delivery schedule based on the provided configuration and locked actuals.
 * @param config - The core monthly parameters (see {@link SchedulerConfig}).
 * @param lockedActuals - List of locked actual values (see {@link LockedActual}).
 * @returns SchedulerResult containing schedule, projectedEndInventory, currentInventory, warnings, infeasible, explanation (see {@link SchedulerResult}).
 */
export function generateSchedule(
  config: SchedulerConfig | undefined,
  lockedActuals: LockedActual[] = [],
): SchedulerResult {
  const internalConfig = validateConfig(config);
  const internalActuals = validateLockedActuals(
    lockedActuals,
    internalConfig.days,
  );
  const warnings = new Set<SchedulerWarning>();
  const explanation: string[] = [];
  const schedule: ScheduleDay[] = [];

  // Check the initial feasibility of the nomination and starting inventory against the expected demand.
  const initialDemand =
    internalConfig.expectedDailyConsumption * internalConfig.days;
  let infeasible = false;
  if (internalConfig.startingInventory + internalConfig.nomination < initialDemand) {
    warnings.add("NOMINATION_INFEASIBLE");
    infeasible = true;
    explanation.push(
      "The nomination target plus starting inventory cannot cover forecast demand.",
    );
  }

  let currentInventory = internalConfig.startingInventory;
  let totalActualDelivery = 0;

  // Check the locked actuals for stockouts and update the schedule.
  for (const actual of internalActuals) {
    currentInventory =
      currentInventory + actual.actualDelivery - actual.actualConsumption;
    totalActualDelivery += actual.actualDelivery;
    if (currentInventory < 0) {
      warnings.add("HISTORICAL_STOCKOUT");
    }

    if (internalConfig.maxCapacity !== undefined && currentInventory > internalConfig.maxCapacity) {
      warnings.add("CAPACITY_BREACH");
      infeasible = true;
      explanation.push(
        `Day ${actual.day}: Inventory (${fromTenths(currentInventory)}) exceeded maximum tank capacity (${fromTenths(internalConfig.maxCapacity)}).`
      );
    }

    schedule.push({
      day: actual.day,
      plannedDelivery: fromTenths(actual.plannedDelivery),
      actualDelivery: fromTenths(actual.actualDelivery),
      actualConsumption: fromTenths(actual.actualConsumption),
      endInventory: fromTenths(currentInventory),
      isLocked: true,
    });
  }

  // Plan future deliveries based on the remaining days and current inventory.
  const lockedCount = internalActuals.length;
  const remainingDays = internalConfig.days - lockedCount;
  const futurePlan =
    remainingDays > 0
      ? planFutureDeliveries(internalConfig, currentInventory, remainingDays)
      : [];

  let projectedInventory = currentInventory;
  for (let index = 0; index < futurePlan.length; index += 1) {
    projectedInventory =
      projectedInventory + futurePlan[index] - internalConfig.expectedDailyConsumption;
    schedule.push({
      day: lockedCount + index + 1,
      plannedDelivery: fromTenths(futurePlan[index]),
      endInventory: fromTenths(projectedInventory),
      isLocked: false,
    });
  }

  const futureDeliveryTotal = futurePlan.reduce((total, value) => total + value, 0);
  const projectedEndInventory = currentInventory + futureDeliveryTotal -
    internalConfig.expectedDailyConsumption * remainingDays;

  if (projectedEndInventory > 0) {
    warnings.add("POSITIVE_END_INVENTORY");
  }

  const nominalRemainingTarget = Math.max(
    0,
    internalConfig.nomination - totalActualDelivery,
  );
  if (
    lockedCount > 0 &&
    (totalActualDelivery > internalConfig.nomination ||
      futureDeliveryTotal > nominalRemainingTarget)
  ) {
    warnings.add("NOMINATION_OVERSHOOT");
  }

  if (remainingDays > 0 && futureDeliveryTotal === 0 && projectedEndInventory > 0) {
    explanation.push(
      "Current inventory already covers the remaining forecast, so future deliveries are zero.",
    );
  }

  return {
    schedule,
    projectedEndInventory: fromTenths(projectedEndInventory),
    currentInventory: fromTenths(currentInventory),
    warnings: [...warnings],
    infeasible,
    explanation,
  };
}

function planFutureDeliveries(
  config: InternalConfig,
  currentInventory: number,
  remainingDays: number,
) {
  const remainingDemand = config.expectedDailyConsumption * remainingDays;
  const idealRemainingDelivery = remainingDemand - currentInventory;

  // Current inventory can cover the remaining demand, no future deliveries are needed.
  if (idealRemainingDelivery <= 0) {
    return Array.from<number>({ length: remainingDays }).fill(0);
  }

  // Since we can never end the month below zero, we must ALWAYS round up to the next truck size.
  // Multiple of unitSize
  const totalBlocks = Math.ceil(idealRemainingDelivery / config.unitSize);

  const blocks = spreadBlocksEvenly(totalBlocks, remainingDays);
  return repairInventoryFloor(
    blocks,
    currentInventory,
    config.expectedDailyConsumption,
    config.unitSize,
  ).map((blockCount) => blockCount * config.unitSize);
}

/**
 * 
 * Logic for distributing a number of delivery blocks across a number of days.
 * 
 * @param totalBlocks - The total number of delivery blocks to distribute. (e.g., 5 blocks of 50 units each)
 * @param days - The number of days to distribute the blocks across.
 * @returns An array of block counts for each day.
 */
export function spreadBlocksEvenly(totalBlocks: number, days: number) {
  if (days <= 0) {
    return [];
  }

  const baseBlocks = Math.floor(totalBlocks / days);
  const extraBlocks = totalBlocks % days;

  // Assign the base number of blocks to each day
  const blocks = Array.from<number>({ length: days }).fill(baseBlocks);

  // Distribute the extra blocks evenly across the days, centering them as much as possible
  for (let i = 0; i < extraBlocks; i += 1) {
    const targetDay = Math.floor(((i + 0.5) * days) / extraBlocks);
    blocks[targetDay] += 1;
  }

  return blocks;
}

/**
 * Repairs a baseline delivery schedule to guarantee that daily inventory never drops below zero.
 *
 * If a stockout is detected on any given day, it pulls the furthest available future delivery backward in time to resolve the deficit.
 * If the schedule is completely empty, it spawns an emergency delivery block.
 *
 * @param blocks - The mathematically balanced baseline delivery schedule array.
 * @param startingInventory - The actual inventory level at the beginning of the scheduled period.
 * @param dailyConsumption - The expected volume of oil consumed each day.
 * @param unitSize - The fixed volume size of a single delivery truck/block.
 * @returns A repaired schedule array guaranteed to maintain a non-negative inventory floor.
 */
function repairInventoryFloor(
  blocks: number[],
  startingInventory: number,
  dailyConsumption: number,
  unitSize: number,
) {
  const repaired = [...blocks];
  let currentInventory = startingInventory;

  for (let i = 0; i < repaired.length; i += 1) {
    currentInventory += repaired[i] * unitSize - dailyConsumption;

    // If the tank drops below zero today, repair it immediately
    while (currentInventory < 0) {
      const donorIndex = findLatestDonorAfter(repaired, i);

      if (donorIndex === -1) {
        // Emergency Override: Spawn a block out of thin air
        repaired[i] += 1;
        currentInventory += unitSize;
      } else {
        // The Time Jump: Steal from the future, give to today
        repaired[donorIndex] -= 1;
        repaired[i] += 1;
        currentInventory += unitSize;
      }
    }
  }

  return repaired;
}

function findLatestDonorAfter(blocks: number[], index: number) {
  for (let donorIndex = blocks.length - 1; donorIndex > index; donorIndex -= 1) {
    if (blocks[donorIndex] > 0) {
      return donorIndex;
    }
  }
  return -1;
}

/**
 * 
 * @param config 
 * @returns (see {@link InternalConfig} for details)
 */
function validateConfig(config: SchedulerConfig | undefined): InternalConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Missing scheduler configuration.");
  }
  if (!Number.isInteger(config.days) || config.days <= 0) {
    throw new Error("Days must be a positive integer.");
  }

  return {
    days: config.days,
    nomination: toNonNegativeTenths(config.nomination, "Nomination"),
    unitSize: toPositiveTenths(config.unitSize, "Unit size"),
    startingInventory: toNonNegativeTenths(
      config.startingInventory,
      "Starting inventory",
    ),
    expectedDailyConsumption: toNonNegativeTenths(
      config.expectedDailyConsumption,
      "Expected daily consumption",
    ),
    maxCapacity: config.maxCapacity !== undefined ? toNonNegativeTenths(config.maxCapacity, "Maximum capacity") : undefined
  };
}

/**
 * Validates historical locked days and scales the decimal values into integers for safe calculation.
 *
 * @param lockedActuals - The raw array of historical days provided by the UI.
 * @param days - The total number of days in the current scheduling period.
 * @returns An array of safely scaled, validated internal history objects.
 * @throws Error if the history has gaps, skips days, or contains invalid numbers.
 */
function validateLockedActuals(
  lockedActuals: LockedActual[],
  days: number,
): InternalLockedActual[] {
  if (!Array.isArray(lockedActuals)) {
    throw new Error("Locked actuals must be an array.");
  }

  return lockedActuals.map((actual, index) => {
    const expectedDay = index + 1;
    // Ensure no missing days in the locked actuals.
    if (actual.day !== expectedDay) {
      throw new Error("Locked actuals must form a contiguous prefix.");
    }
    if (actual.day > days) {
      throw new Error("Locked actual day is outside the configured month.");
    }

    return {
      day: actual.day,
      // if plannedDelivery is missing/undefined, fallback to using actualDelivery
      plannedDelivery: toNonNegativeTenths(
        actual.plannedDelivery ?? actual.actualDelivery,
        `Day ${actual.day} planned delivery`,
      ),
      actualDelivery: toNonNegativeTenths(
        actual.actualDelivery,
        `Day ${actual.day} actual delivery`,
      ),
      actualConsumption: toNonNegativeTenths(
        actual.actualConsumption,
        `Day ${actual.day} actual consumption`,
      ),
    };
  });
}

/**
 * Validates and converts it into tenths (an integer) for accurate math.
 * * @param value - The raw number input from the user or configuration.
 * @param label - A human-readable name for the value (e.g., "Nomination") used to generate a helpful error message if validation fails.
 * @returns The validated number converted into tenths (e.g., 80.5 becomes 805).
 * @throws Error if the value is negative, NaN, or Infinity.
 */
function toNonNegativeTenths(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative.`);
  }
  return toTenths(value);
}

/**
 * Validates that a number is strictly greater than zero, 
 * and converts it into tenths for safe integer math.
 * * Note: Unlike `toNonNegativeTenths`, this function strictly rejects 0. 
 * It is used for parameters like Unit Size, where a size of 0 would break the algorithm.
 *
 * @param value - The raw decimal number input.
 * @param label - The human-readable name used to generate a precise error message.
 * @returns The validated integer converted into tenths.
 * @throws Error if the value is zero, negative, NaN, or Infinity.
 */
function toPositiveTenths(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be positive.`);
  }
  return toTenths(value);
}

function toTenths(value: number) {
  return Math.round(value * SCALE);
}

function fromTenths(value: number) {
  return Math.round(value) / SCALE;
}
