// Input types for the scheduler functions
export type SchedulerConfig = {
  days: number;
  nomination: number;
  unitSize: number;
  startingInventory: number;
  maxCapacity?: number;
};

export type LockedActual = {
  day: number;
  plannedDelivery?: number;
  actualDelivery: number;
  actualConsumption: number;
};

// Schedule table row type for the scheduler result
export type ScheduleDay = {
  day: number;
  plannedDelivery: number;
  actualDelivery?: number;
  actualConsumption?: number;
  endInventory: number;
  isLocked: boolean;
  capacityBreached?: boolean;
};

export type SchedulerWarning =
  | "NOMINATION_INFEASIBLE"
  | "NOMINATION_OVERSHOOT"
  | "HISTORICAL_STOCKOUT"
  | "CAPACITY_BREACH";

export type SchedulerResult = {
  schedule: ScheduleDay[];
  projectedEndInventory: number;
  currentInventory: number;
  expectedDailyConsumption: number;
  warnings: SchedulerWarning[];
  infeasible: boolean;
  explanation: string[];
};
