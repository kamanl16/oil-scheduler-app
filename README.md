# Oil Delivery Scheduler

A lightweight web application designed to generate and continuously recalculate a daily oil delivery schedule based on variable real-world consumption rates.

The core objective of this app is to maintain a non-negative inventory while striving to spread deliveries evenly and hit a monthly nomination target. The scheduling logic is built as a cleanly separated, highly testable module independent of the UI.

## Live Demo
Check out the live application here: https://oil-scheduler-app.vercel.app/

## How to Run It

1. Install dependencies:
   ```bash
   npm install
2. Start the development server:
   ```bash
   npm run dev
3. Open your browser to http://localhost:5173 (or the port provided in your terminal).

## Key Assumptions & Design Decisions

To resolve the inherent tension between the assignment's objectives, the scheduling engine relies on the following logic and assumptions:
- The system prioritizes operational safety (preventing a negative inventory) over capital efficiency (ending near zero). If forced to choose, **the algorithm always rounds deliveries up**, actively accepting a positive end-of-month surplus to mathematically guarantee the tank never runs dry.
- The algorithm assumes the **expected daily consumption remains a constant**, unchanging average for all unplanned future days.
  - Trade-off: Sacrifice the ability to react to ongoing trends.
- When distributing "extra" delivery blocks across the remaining days, the algorithm **centers them proportionally** across the interval rather than arbitrarily front-loading or back-loading them.
- If a historical actual causes a future projected stockout, the scheduler repairs the baseline by pulling a delivery block backward in time. It assumes **pulling from the farthest available future date** is the optimal move to preserve near-term schedule balance.
  - Trade-off: Sacrifice late-month flexibility.
- If inventory drops below zero and no future blocks are available to pull forward, the logic **spawns a new block "out of thin air" for that day**. This mathematically guarantees the "never negative" hard constraint is never breached.
- The logic drives the future schedule against the expectedDailyConsumption as a proxy for targeting the total Nomination. If historical actuals result in overshooting the total nomination, **future deliveries are clamped to 0**, and an overshoot warning is flagged rather than breaking the schedule.
- To prevent floating-point calculation errors, all inputs (which may have up to 1 decimal place) are **scaled by a factor of 10** into whole integers for the internal mathematical operations, then scaled back down for the UI.

## What I'd Do With More Time (Extensions)

- I would update the UI to treat historical stockouts or capacity breaches as hard data-entry errors, blocking schedule generation until the user corrects physically impossible historical data.
- I would implement a fail-fast pattern that halts the scheduling loop entirely and renders a dedicated error state if a scenario is determined to be globally infeasible.
- I would replace the current "emergency spawn" logic with explicit logistics parameters (e.g., maxDailyDeliveries) to better reflect physical dispatch limitations.
- I would implement time-series models (e.g., weighted moving averages) to allow the system to react to momentum like seasonal weather shifts.
- I would add interactive tooltips to help users understand why the schedule shifted, transforming the tool into an intuitive dispatcher dashboard.

