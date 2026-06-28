import type { ScheduleDay } from "../lib/scheduler/types";

type ScheduleTableProps = {
  schedule: ScheduleDay[];
  nextUnlockedDay?: ScheduleDay;
  actualDelivery: string;
  actualConsumption: string;
  onActualDeliveryChange: (value: string) => void;
  onActualConsumptionChange: (value: string) => void;
  onGenerateNoise: () => void;
  onLockNextDay: () => void;
};

export function ScheduleTable({
  schedule,
  nextUnlockedDay,
  actualDelivery,
  actualConsumption,
  onActualDeliveryChange,
  onActualConsumptionChange,
  onGenerateNoise,
  onLockNextDay,
}: ScheduleTableProps) {
  return (
    <section className="panel">
      <h2>Schedule</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Status</th>
              <th>Planned delivery</th>
              <th>Actual delivery</th>
              <th>Actual consumption</th>
              <th>End inventory</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={6}>Generate a schedule to begin.</td>
              </tr>
            ) : (
              schedule.map((day) => {
                const isCurrent = nextUnlockedDay?.day === day.day;
                return (
                  <tr key={day.day}>
                    <td>{day.day}</td>
                    <td>
                      <span
                        className={`status ${
                          day.isLocked
                            ? "locked"
                            : isCurrent
                              ? "current"
                              : "future"
                        }`}
                      >
                        {day.isLocked
                          ? "Locked"
                          : isCurrent
                            ? "Next"
                            : "Future"}
                      </span>
                    </td>
                    <td>{formatVolume(day.plannedDelivery)}</td>
                    <td>
                      {isCurrent ? (
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={actualDelivery}
                          onChange={(event) =>
                            onActualDeliveryChange(event.target.value)
                          }
                        />
                      ) : (
                        formatOptional(day.actualDelivery)
                      )}
                    </td>
                    <td>
                      {isCurrent ? (
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={actualConsumption}
                          onChange={(event) =>
                            onActualConsumptionChange(event.target.value)
                          }
                        />
                      ) : (
                        formatOptional(day.actualConsumption)
                      )}
                    </td>
                    <td>{formatVolume(day.endInventory)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="secondary"
          disabled={!nextUnlockedDay}
          onClick={onGenerateNoise}
        >
          Generate Noisy Consumption
        </button>
        <button type="button" disabled={!nextUnlockedDay} onClick={onLockNextDay}>
          Lock Next Day Actuals
        </button>
      </div>
    </section>
  );
}

function formatOptional(value?: number) {
  return value === undefined ? "-" : formatVolume(value);
}

function formatVolume(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
