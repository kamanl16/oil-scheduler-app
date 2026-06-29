// src/hooks/useScheduler.ts
import { useState, useMemo } from "react";
import { generateSchedule } from "../lib/scheduler/scheduler";
import { generateNoisyConsumption } from "../lib/scheduler/noise";
import type { LockedActual, SchedulerConfig, SchedulerResult } from "../lib/scheduler/types";

const defaultConfig: SchedulerConfig = {
  days: 5,
  nomination: 295,
  unitSize: 50,
  startingInventory: 105,
};

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function useScheduler() {
  const [config, setConfig] = useState<SchedulerConfig>(defaultConfig);
  const [lockedActuals, setLockedActuals] = useState<LockedActual[]>([]);
  const [result, setResult] = useState<SchedulerResult | null>(null);
  const [actualDelivery, setActualDelivery] = useState("");
  const [actualConsumption, setActualConsumption] = useState("");
  const [error, setError] = useState("");

  const nextUnlocked = useMemo(
    () => result?.schedule.find((day) => !day.isLocked),
    [result]
  );

  function runSchedule(nextConfig: SchedulerConfig, nextLockedActuals: LockedActual[]) {
    try {
      setError("");
      const nextResult = generateSchedule(nextConfig, nextLockedActuals);
      
      setResult(nextResult);
      const nextDay = nextResult.schedule.find((day) => !day.isLocked);
      setActualDelivery(nextDay ? formatValue(nextDay.plannedDelivery) : "");
      setActualConsumption("");
      
      return nextResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate schedule.");
      return null;
    }
  }

  function handleGenerate() {
    setLockedActuals([]);
    runSchedule(config, []);
  }

  function handleReset() {
    setConfig(defaultConfig);
    setLockedActuals([]);
    setResult(null);
    setActualDelivery("");
    setActualConsumption("");
    setError("");
  }

  function handleGenerateNoise() {
    if (!result) {
      setError("Please generate a schedule first.");
      return;
    }

    setActualConsumption(
      formatValue(generateNoisyConsumption(result.expectedDailyConsumption, config.unitSize))
    );
  }

  function handleLockNextDay() {
    if (!nextUnlocked) {
      setError("Generate a schedule with an unlocked day first.");
      return;
    }

    const delivery = Number(actualDelivery);
    const consumption = Number(actualConsumption);
    
    if (!Number.isFinite(delivery) || !Number.isFinite(consumption)) {
      setError("Actual delivery and consumption must be valid numbers.");
      return;
    }

    const nextLockedActuals = [
      ...lockedActuals,
      {
        day: nextUnlocked.day,
        plannedDelivery: nextUnlocked.plannedDelivery,
        actualDelivery: delivery,
        actualConsumption: consumption,
      },
    ];

    const nextResult = runSchedule(config, nextLockedActuals);
    if (nextResult) {
      setLockedActuals(nextLockedActuals);
    }
  }

  return {
    config,
    setConfig,
    lockedActuals,
    result,
    actualDelivery,
    setActualDelivery,
    actualConsumption,
    setActualConsumption,
    error,
    nextUnlocked,
    handleGenerate,
    handleReset,
    handleGenerateNoise,
    handleLockNextDay,
  };
}