// Input types for the scheduler functions
export type SchedulerConfig = {
  days: number;
  nomination: number;
  unitSize: number;
  startingInventory: number;
  expectedDailyConsumption: number;
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
};

export type SchedulerWarning =
  | "NOMINATION_INFEASIBLE"
  | "NOMINATION_OVERSHOOT"
  | "HISTORICAL_STOCKOUT"
  | "POSITIVE_END_INVENTORY";

export type SchedulerResult = {
  schedule: ScheduleDay[];
  projectedEndInventory: number;
  currentInventory: number;
  warnings: SchedulerWarning[];
  infeasible: boolean;
  explanation: string[];
};
