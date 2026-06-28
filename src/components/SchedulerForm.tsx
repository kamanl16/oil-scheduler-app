import type { SchedulerConfig } from "../lib/scheduler/types";

type SchedulerFormProps = {
  config: SchedulerConfig;
  onChange: (config: SchedulerConfig) => void;
  onGenerate: () => void;
  onReset: () => void;
};

export function SchedulerForm({
  config,
  onChange,
  onGenerate,
  onReset,
}: SchedulerFormProps) {
  function updateField(field: keyof SchedulerConfig, value: string) {
    let parsedValue: number | undefined;
    
    if (value === "") {
      parsedValue = undefined; // Allow the optional field to be completely cleared
    } else if (field === "days") {
      parsedValue = Number.parseInt(value, 10);
    } else {
      parsedValue = Number(value);
    }

    onChange({
      ...config,
      [field]: parsedValue,
    });
  }

  return (
    <section className="panel">
      <h2>Monthly inputs</h2>
      <div className="field-grid">
        <NumberField
          label="Number of days"
          value={config.days}
          min={1}
          step={1}
          max={31}
          onChange={(value) => updateField("days", value)}
        />
        <NumberField
          label="Nomination"
          value={config.nomination}
          min={0}
          step={0.1}
          onChange={(value) => updateField("nomination", value)}
        />
        <NumberField
          label="Unit size"
          value={config.unitSize}
          min={35}
          step={5}
          max={50}
          onChange={(value) => updateField("unitSize", value)}
        />
        <NumberField
          label="Starting inventory"
          value={config.startingInventory}
          min={0}
          step={0.1}
          onChange={(value) => updateField("startingInventory", value)}
        />
        <NumberField
          label="Expected daily consumption"
          value={config.expectedDailyConsumption}
          min={0}
          step={0.1}
          onChange={(value) => updateField("expectedDailyConsumption", value)}
        />
        <NumberField
          label="Maximum capacity (optional)"
          value={config.maxCapacity}
          min={0}
          step={0.1}
          onChange={(value) => updateField("maxCapacity", value)}
        />
      </div>
      
      <div className="button-row">
        <button type="button" onClick={onGenerate}>
          Generate Schedule
        </button>
        <button type="button" className="secondary" onClick={onReset}>
          Reset
        </button>
      </div>
      <p className="helper-text">
        Defaults use the worked example from the assignment.
      </p>
    </section>
  );
}

type NumberFieldProps = {
  label: string;
  value?: number;
  min: number;
  step: number;
  max?: number;
  onChange: (value: string) => void;
};

function NumberField({ label, value, min, step, max, onChange }: NumberFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        max={max}
        value={value !== undefined && !Number.isNaN(value) ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
