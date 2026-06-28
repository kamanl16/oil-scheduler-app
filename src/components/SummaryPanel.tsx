import type {
  LockedActual,
  SchedulerResult,
  SchedulerWarning,
} from "../lib/scheduler/types";

type SummaryPanelProps = {
  result: SchedulerResult | null;
  lockedActuals: LockedActual[];
};

export function SummaryPanel({ result, lockedActuals }: SummaryPanelProps) {
  const totalLockedActualDeliveries = lockedActuals.reduce(
    (total, actual) => total + actual.actualDelivery,
    0,
  );
  const totalPlannedFutureDeliveries =
    result?.schedule.reduce(
      (total, day) => total + (day.isLocked ? 0 : day.plannedDelivery),
      0,
    ) ?? 0;
  const totalProjectedDeliveries =
    totalLockedActualDeliveries + totalPlannedFutureDeliveries;

  return (
    <section className="panel">
      <h2>Summary</h2>
      <div className="summary-grid">
        <Metric
          label="Current actual inventory"
          value={result ? formatVolume(result.currentInventory) : "-"}
        />
        <Metric
          label="Projected end inventory"
          value={result ? formatVolume(result.projectedEndInventory) : "-"}
        />
        <Metric
          label="Locked actual deliveries"
          value={formatVolume(totalLockedActualDeliveries)}
        />
        <Metric
          label="Planned future deliveries"
          value={formatVolume(totalPlannedFutureDeliveries)}
        />
        <Metric
          label="Total projected deliveries"
          value={formatVolume(totalProjectedDeliveries)}
        />
        <Metric
          label="Schedule status"
          value={result?.infeasible ? "Infeasible" : result ? "Planned" : "-"}
        />
      </div>

      <div className="warnings">
        {result?.warnings.map((warning) => (
          <div className="warning" key={warning}>
            {warningLabel[warning]}
          </div>
        ))}
        {result?.explanation.map((line) => (
          <div className="note" key={line}>
            {line}
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const warningLabel: Record<SchedulerWarning, string> = {
  NOMINATION_INFEASIBLE:
    "Nomination cannot cover forecast demand under the chosen planning target.",
  NOMINATION_OVERSHOOT:
    "Locked actuals and forecast demand require deliveries outside the nominal target.",
  HISTORICAL_STOCKOUT:
    "Recorded actuals already produced a negative end-of-day inventory.",
  POSITIVE_END_INVENTORY:
    "Projected end inventory is positive because deliveries are quantized by unit size.",
  CAPACITY_BREACH:
    "Projected or historical inventory exceeded the maximum tank capacity.",
};

function formatVolume(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
