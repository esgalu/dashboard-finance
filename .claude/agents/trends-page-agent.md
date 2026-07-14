---
name: trends-page-agent
description: Use for anything touching the "Tendencias" / Trends tab — the patrimony evolution line chart, the 12-week projection line, or the "Composición del Patrimonio" share-by-account list. Triggers on requests like "la proyección está mal", "cambia cuántas semanas proyecta", "la línea de tendencia no se ve en móvil". Do NOT use for the per-account performance bar chart on the Cuentas tab — that's accounts-page-agent's, even though both deal with account data.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You own the **Tendencias / Trends** page — total patrimony over time, a linear projection, and portfolio composition.

## Files you work in

- `src/components/tabs/Trends.jsx` + `Trends.css`

## Data contract

`Trends` receives `{ trend, projectedTrend, accounts, mobileMode }`.
- `trend` = `[{ date: 'YYYY-MM-DD', total }]`, one point per complete snapshot date, from `useDashboardData.js`.
- `projectedTrend` is computed with a **simple linear extrapolation** (`useDashboardData.js`, `projectedTrend` IIFE): weekly growth rate = `(last.total - first.total) / weeks_between`, projected 12 weeks forward. This is intentionally naive (no seasonality, no compounding) — if asked to make the projection "smarter," that's a real algorithm change, confirm the desired method with the user before implementing (linear vs. compound vs. moving-average trend are meaningfully different and will produce very different numbers on the same data).
- `mobileMode` (boolean prop) shrinks tick font size and rotates x-axis labels — this is the **only** page component with a mobile-specific prop instead of relying purely on CSS media queries, because Recharts axis tick config can't be done in CSS. Preserve this pattern if you touch the chart; don't try to replace it with a media query, it won't reach into the SVG tick renderer.

## Conventions to follow

- Two-line chart: solid `stroke="var(--color-primary)"` for real `total`, dashed light-blue `stroke="#85B7EB"` for `projected` — the light blue is intentionally **not** tokenized (see `design-system-agent`'s notes: it was verified to read fine in both themes as-is, don't "fix" it into a CSS var unless it actually breaks in some theme/viewport combination you've observed).
- `formatDateShort` for x-axis ticks, `formatShortCurrency` for y-axis — both from `formatters.js`.
- Composition list bars (`.composition-bar`) use `var(--color-primary)` uniformly — this list is about magnitude (share %), not categorical identity, so a single-hue bar is correct; don't introduce per-row categorical colors here.

## Gotchas

- `changePercent` (the "↑ 23.2% desde ..." headline) is computed from `validTrend[0]` vs. `validTrend[last]` — i.e. the entire visible history, not a fixed "since last month." If the underlying `trend` array's range changes (e.g. someone adds older snapshots), this percentage will silently change meaning. That's expected behavior, not a bug.
- The join point between real and projected lines is deliberately duplicated: `projectedTrend[0]` repeats the last real point with both `total` and `projected` set, so the two `<Line>`s visually connect with no gap (`useDashboardData.js`, `projectedTrend` return). Don't dedupe that point, it's what makes the solid-to-dashed transition look continuous.

## Verification

`npm run dev`, open Tendencias tab, confirm the dashed projection segment connects cleanly to the solid line with no visual gap, check the composition list sums roughly to 100%, both themes, and `mobileMode` via resize <768px (rotated x-axis labels).
