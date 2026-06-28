import type { SchedulerResult, SchedulerWarning } from "../lib/scheduler/types";

const warningLabel: Record<SchedulerWarning, string> = {
  NOMINATION_INFEASIBLE:
    "Nomination cannot cover forecast demand under the chosen planning target.",
  NOMINATION_OVERSHOOT:
    "Locked actuals and forecast demand require deliveries outside the nominal target.",
  HISTORICAL_STOCKOUT:
    "Recorded actuals already produced a negative end-of-day inventory.",
  CAPACITY_BREACH:
    "Projected or historical inventory exceeded the maximum tank capacity.",
};

type WarningPanelProps = {
  result: SchedulerResult | null;
};

export function WarningPanel({ result }: WarningPanelProps) {
  // Hide the panel entirely if there's no result or no warnings
  if (!result) return null;

  const { infeasible, warnings, explanation } = result;
  if (warnings.length === 0 && !infeasible) return null;
  
  return (
    <div className="warnings">
      {Array.from(warnings).map((warning) => (
        <div className="warning" key={warning}>
          {warningLabel[warning]}
        </div>
      ))}
      {explanation.map((line) => (
        <div className="note" key={line}>
          {line}
        </div>
      ))}
    </div>
  );
}