import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer
} from "recharts";
import type { ScheduleDay } from "../lib/scheduler/types";

type ScheduleChartProps = {
  schedule: ScheduleDay[];
  maxCapacity?: number;
};

export function ScheduleChart({ schedule, maxCapacity }: ScheduleChartProps) {
  if (!schedule || schedule.length === 0) {
    return null;
  }

  return (
    <section className="panel">
      <h2>Inventory Projection</h2>
      
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart 
            data={schedule} 
            margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="day" 
              tickMargin={10}
              label={{ value: "Day", position: "insideBottom", offset: -10 }} 
            />
            <YAxis 
              tickMargin={10}
              label={{ value: "Inventory", angle: -90, position: "insideLeft", offset: 10 }} 
            />
            <Tooltip 
              formatter={(value: any) => [`${value} units`, "End Inventory"]}
              labelFormatter={(label) => `Day ${label}`}
            />
            
            {/* Draws the physical tank limit if maxCapacity is provided */}
            {maxCapacity !== undefined && (
              <ReferenceLine 
                y={maxCapacity} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
                label={{ position: "top", value: "Max Capacity", fill: "#ef4444", fontSize: 12 }} 
              />
            )}
            
            <Line 
              type="linear" 
              dataKey="endInventory" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isLocked = payload.isLocked;
                // Green for locked past/present, Blue for planned future
                return (
                  <circle 
                    key={`dot-${payload.day}`}
                    cx={cx} 
                    cy={cy} 
                    r={5} 
                    fill={isLocked ? "#16a34a" : "#2563eb"} 
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", justifyContent: "center", fontSize: "0.875rem", color: "#4b5563" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#16a34a" }}></span>
          <span>Locked Actuals</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#2563eb" }}></span>
          <span>Projected Future</span>
        </div>
      </div>
    </section>
  );
}