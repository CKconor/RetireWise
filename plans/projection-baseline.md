# Projection Baseline Feature

## Context
When users update account balances/contributions, all projections recalculate from the new values, making it impossible to compare actual portfolio growth against what was originally expected. Need a "locked" baseline projection that persists across edits, enabling actual vs. expected tracking.

## Approach
Save a snapshot of the projection at a user-chosen point in time. All future comparisons reference that frozen baseline. Visible in: summary card (£ ahead/behind), net worth chart (overlay line), and account cards (per-account delta).

---

## Files to Modify

### 1. `src/types/index.ts`
Add two new interfaces:
```typescript
interface BaselineYearPoint {
  calendarYear: number;   // e.g. 2026 (matches generateProjection's `year` field)
  age: number;
  expectedTotal: number;
  expectedTotalReal: number;
  expectedAccountBalances: Record<string, number>; // accountId → nominal balance
}

interface ProjectionBaseline {
  setDate: string;          // ISO YYYY-MM-DD
  setTimestamp: number;
  yearlyPoints: BaselineYearPoint[];
  accountMeta: Record<string, { name: string; type: AccountType }>;
}
```
Add `projectionBaseline?: ProjectionBaseline` to `AppState`.

### 2. `src/lib/calculations.ts`
Add export function `buildBaselinePoints(accounts, profile, lumpSumWithdrawals)`:
- Calls existing `generateProjection()` (already returns calendar-year-keyed points)
- Maps each `ProjectionDataPoint` → `BaselineYearPoint`, extracting `point[accountId]` for all account IDs
- Returns `{ yearlyPoints, accountMeta }` where `accountMeta` maps id → `{ name, type }`

### 3. `src/lib/storage.ts`
In `loadState()`, add `projectionBaseline: parsed.projectionBaseline` to returned state (undefined if not present — no default needed).

### 4. `src/hooks/use-retirement-data.ts`
- Expose `projectionBaseline: state.projectionBaseline` in return
- Add `setProjectionBaseline()` callback: calls `buildBaselinePoints(state.accounts, state.profile, state.lumpSumWithdrawals)`, saves to `state.projectionBaseline` with `setDate: today, setTimestamp: Date.now()`
- Add `clearProjectionBaseline()` callback: sets `state.projectionBaseline = undefined`

### 5. `src/app/page.tsx`
Destructure `projectionBaseline`, `setProjectionBaseline`, `clearProjectionBaseline` from `useRetirementData`. Pass to `AccountList`, `SummaryCard`, `NetWorthChart`.

### 6. `src/components/account-list.tsx`
- Add props: `projectionBaseline?`, `onSetBaseline`, `onClearBaseline`
- Add a "Set Baseline" button (alongside existing actions) that calls `onSetBaseline`
- When baseline is set, show a small badge with the set date + "Clear" button
- Compute `baselineCurrentYear` point from `projectionBaseline.yearlyPoints` matching current calendar year
- Pass `baselineExpectedBalance={baselineCurrentYear?.expectedAccountBalances[account.id]}` to each `AccountCard`

### 7. `src/components/account-card.tsx`
- Add prop `baselineExpectedBalance?: number`
- When set, show a small row below the Balance field: `"Baseline: £X  (+/-£Y)"` in muted style with green/red delta

### 8. `src/components/summary-card.tsx`
- Add prop `projectionBaseline?: ProjectionBaseline`
- Find `yearlyPoints` entry where `calendarYear === new Date().getFullYear()`
- When found, add a stat row inside the status box: `"vs. baseline: £X ahead"` / `"£X behind"` using current `totalBalance` (sum of `accounts.currentBalance`) vs `expectedTotal`

### 9. `src/components/net-worth-chart.tsx`
- Add prop `projectionBaseline?: ProjectionBaseline`
- In `chartData` useMemo: for each snapshot row, look up `projectionBaseline.yearlyPoints` by matching calendar year from `snap.date` → add `baselineExpected` key
- Render a new `<Line>` with `dataKey="baselineExpected"`, dashed amber stroke (`#f59e0b`), `connectNulls`
- Add baseline entry to legend

---

## Key Reuse
- `generateProjection()` in `calculations.ts:156` — reused inside `buildBaselinePoints`, no duplication
- Existing dashed `<Line>` pattern in net-worth-chart (the "Forecast" line) — follow same pattern for baseline line

---

## Verification
1. Add accounts → "Set Baseline" → note current balances
2. Update an account balance → summary card should show £ ahead/behind vs baseline
3. Add net worth snapshots → baseline dashed line should appear on chart at expected levels
4. Account cards show expected vs actual balance delta
5. "Clear" baseline removes all comparison indicators
6. Reload page → baseline persists (stored in localStorage via `AppState`)

---

## Unresolved Questions
None.
