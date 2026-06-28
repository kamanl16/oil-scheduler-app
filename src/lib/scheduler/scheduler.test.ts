import { describe, expect, it } from "vitest";
import { generateNoisyConsumption } from "./noise";
import { generateSchedule, spreadBlocksEvenly } from "./scheduler";

describe("generateSchedule", () => {
  it("generates the clean worked example initial schedule", () => {
    const result = generateSchedule({
      days: 5,
      nomination: 295,
      unitSize: 50,
      startingInventory: 105,
      expectedDailyConsumption: 80,
    });

    expect(result.schedule.map((day) => day.plannedDelivery)).toEqual([
      50, 50, 100, 50, 50,
    ]);
    expect(result.projectedEndInventory).toBe(5);
  });

  it("replans after light Day 1 consumption", () => {
    const result = generateSchedule(
      {
        days: 5,
        nomination: 295,
        unitSize: 50,
        startingInventory: 105,
        expectedDailyConsumption: 80,
      },
      [{ day: 1, actualDelivery: 50, actualConsumption: 35 }],
    );

    expect(result.schedule.slice(1).map((day) => day.plannedDelivery)).toEqual([
      50, 50, 50, 50,
    ]);
  });

  it("replans after heavy Day 2 consumption with a non-negative future projection", () => {
    const result = generateSchedule(
      {
        days: 5,
        nomination: 295,
        unitSize: 50,
        startingInventory: 105,
        expectedDailyConsumption: 80,
      },
      [
        { day: 1, actualDelivery: 50, actualConsumption: 35 },
        { day: 2, actualDelivery: 50, actualConsumption: 100 },
      ],
    );

    const future = result.schedule.slice(2);
    expect(future.reduce((total, day) => total + day.plannedDelivery, 0)).toBe(
      200,
    );
    expect(future.every((day) => day.endInventory >= 0)).toBe(true);
  });

  it("front-loads only enough blocks to repair inventory-floor violations", () => {
    const result = generateSchedule({
      days: 5,
      nomination: 300,
      unitSize: 50,
      startingInventory: 0,
      expectedDailyConsumption: 60,
    });

    expect(result.infeasible).toBe(false);

    expect(result.schedule.map((day) => day.plannedDelivery)).toEqual([
      100, 50, 100, 50, 0
    ]);
    
    result.schedule.forEach(day => {expect(day.endInventory).toBeGreaterThanOrEqual(0);});
  });

  it("clamps future deliveries to zero on overshoot", () => {
    const result = generateSchedule(
      {
        days: 5,
        nomination: 150,
        unitSize: 50,
        startingInventory: 100,
        expectedDailyConsumption: 20,
      },
      [{ day: 1, actualDelivery: 200, actualConsumption: 20 }],
    );

    expect(result.schedule.slice(1).map((day) => day.plannedDelivery)).toEqual([
      0, 0, 0, 0,
    ]);
    expect(result.warnings).toContain("NOMINATION_OVERSHOOT");
  });
  
  it("flags CAPACITY_BREACH if a locked actual exceeds maximum tank capacity", () => {
    const result = generateSchedule(
      {
        days: 5,
        nomination: 100,
        unitSize: 50,
        startingInventory: 100,
        expectedDailyConsumption: 10,
        maxCapacity: 150,
      },
      [{ day: 1, actualDelivery: 100, actualConsumption: 10 }] 
    );

    // 100 (start) + 100 (actual delivery) - 10 (actual consumption) = 190
    // This breaches the maximum capacity of 150.
    expect(result.infeasible).toBe(true);
    expect(result.warnings).toContain("CAPACITY_BREACH");
    expect(result.explanation.some(e => e.includes("exceeded maximum tank capacity"))).toBe(true);
  });

  it("does not flag CAPACITY_BREACH if inventory stays exactly at or below max capacity", () => {
    const result = generateSchedule({
      days: 5,
      nomination: 100,
      unitSize: 50,
      startingInventory: 150,
      expectedDailyConsumption: 50,
      maxCapacity: 150,
    });

    // Day 1: 150 (start) + 50 (delivery) - 50 (consumption) = 150
    // Exactly at capacity, so it should not flag a breach.
    expect(result.warnings).not.toContain("CAPACITY_BREACH");
    expect(result.infeasible).toBe(false);
  });

  it("reports nomination infeasibility", () => {
    const result = generateSchedule({
      days: 5,
      nomination: 100,
      unitSize: 50,
      startingInventory: 50,
      expectedDailyConsumption: 80,
    });

    expect(result.infeasible).toBe(true);
    expect(result.warnings).toContain("NOMINATION_INFEASIBLE");
  });



  it("handles decimal actuals without floating-point residue", () => {
    const result = generateSchedule(
      {
        days: 2,
        nomination: 100,
        unitSize: 50,
        startingInventory: 80.1,
        expectedDailyConsumption: 50,
      },
      [{ day: 1, actualDelivery: 50.2, actualConsumption: 30.3 }],
    );

    expect(result.currentInventory).toBe(100);
    expect(result.schedule[0].endInventory).toBe(100);
  });

  it("keeps locked history immutable when replanning future days", () => {
    const initial = generateSchedule({
      days: 5,
      nomination: 295,
      unitSize: 50,
      startingInventory: 105,
      expectedDailyConsumption: 80,
    });
    const replanned = generateSchedule(
      {
        days: 5,
        nomination: 295,
        unitSize: 50,
        startingInventory: 105,
        expectedDailyConsumption: 80,
      },
      [
        {
          day: 1,
          plannedDelivery: initial.schedule[0].plannedDelivery,
          actualDelivery: initial.schedule[0].plannedDelivery,
          actualConsumption: 35,
        },
      ],
    );

    expect(replanned.schedule[0]).toMatchObject({
      day: 1,
      plannedDelivery: 50,
      actualDelivery: 50,
      actualConsumption: 35,
      endInventory: 120,
      isLocked: true,
    });
  });

  it("preserves locked planned delivery when actual delivery is overridden", () => {
    const result = generateSchedule(
      {
        days: 5,
        nomination: 295,
        unitSize: 50,
        startingInventory: 105,
        expectedDailyConsumption: 80,
      },
      [
        {
          day: 1,
          plannedDelivery: 50,
          actualDelivery: 42.5,
          actualConsumption: 35,
        },
      ],
    );

    expect(result.schedule[0].plannedDelivery).toBe(50);
    expect(result.schedule[0].actualDelivery).toBe(42.5);
    expect(result.schedule[0].endInventory).toBe(112.5);
  });

  it("rejects locked actual gaps", () => {
    expect(() =>
      generateSchedule(
        {
          days: 5,
          nomination: 295,
          unitSize: 50,
          startingInventory: 105,
          expectedDailyConsumption: 80,
        },
        [{ day: 2, actualDelivery: 50, actualConsumption: 80 }],
      ),
    ).toThrow("contiguous prefix");
  });
});

describe("spreadBlocksEvenly", () => {
  it("uses the required centered examples", () => {
    expect(spreadBlocksEvenly(1, 5)).toEqual([0, 0, 1, 0, 0]);
    expect(spreadBlocksEvenly(2, 5)).toEqual([0, 1, 0, 1, 0]);
    expect(spreadBlocksEvenly(3, 5)).toEqual([1, 0, 1, 0, 1]);
    expect(spreadBlocksEvenly(4, 5)).toEqual([1, 1, 0, 1, 1]);
    expect(spreadBlocksEvenly(1, 6)).toEqual([0, 0, 0, 1, 0, 0]);
    expect(spreadBlocksEvenly(2, 6)).toEqual([0, 1, 0, 0, 1, 0]);
    expect(spreadBlocksEvenly(3, 6)).toEqual([0, 1, 0, 1, 0, 1]);
    expect(spreadBlocksEvenly(4, 6)).toEqual([1, 0, 1, 1, 0, 1]);
    expect(spreadBlocksEvenly(5, 6)).toEqual([1, 1, 0, 1, 1, 1]);
  });
});

describe("generateNoisyConsumption", () => {
  it("samples noise, clamps at zero, and rounds to one decimal", () => {
    expect(generateNoisyConsumption(80, 50, () => 0.5)).toBe(80);
    expect(generateNoisyConsumption(10, 50, () => 0)).toBe(0);
    expect(generateNoisyConsumption(80, 50, () => 0.333)).toBe(63.3);
  });
});
