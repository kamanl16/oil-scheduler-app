import type {
  LockedActual,
  SchedulerResult
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

function formatVolume(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
