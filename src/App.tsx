// src/App.tsx
import { useScheduler } from "./hooks/useScheduler";
import { SchedulerForm } from "./components/SchedulerForm";
import { ScheduleTable } from "./components/ScheduleTable";
import { SummaryPanel } from "./components/SummaryPanel";
import { ScheduleChart } from "./components/ScheduleChart";
import { WarningPanel } from "./components/WarningPanel";

export default function App() {
  const {
    config, setConfig, lockedActuals, result, 
    actualDelivery, setActualDelivery, actualConsumption, setActualConsumption,
    error, nextUnlocked, handleGenerate, handleReset, 
    handleGenerateNoise, handleLockNextDay
  } = useScheduler();

  return (
    <main>
      <header className="page-header">
        <div>
          <h1>Oil Delivery Scheduler</h1>
        </div>
      </header>
      <WarningPanel result={result} />

      <div className="layout-grid">
        <SchedulerForm
          config={config}
          onChange={setConfig}
          onGenerate={handleGenerate}
          onReset={handleReset}
        />

        <div className="stack">
          {error ? <div className="error">{error}</div> : null}
          <SummaryPanel result={result} lockedActuals={lockedActuals} />
          <ScheduleTable
            schedule={result?.schedule ?? []}
            nextUnlockedDay={nextUnlocked}
            actualDelivery={actualDelivery}
            actualConsumption={actualConsumption}
            onActualDeliveryChange={setActualDelivery}
            onActualConsumptionChange={setActualConsumption}
            onGenerateNoise={handleGenerateNoise}
            onLockNextDay={handleLockNextDay}
          />
          {result && (
            <ScheduleChart 
              schedule={result.schedule}
              maxCapacity={config.maxCapacity}
            />
          )}
        </div>
      </div>
    </main>
  );
}