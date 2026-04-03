## Problem

`calculations.ts` is a 900-line god module with 40+ exported functions and no internal structure. It is the primary dependency bottleneck in the codebase:

- **19 separate components** import directly from it, creating a flat, unstructured coupling surface
- `generateProjection` — an expensive year-by-year simulation — is called **independently** by 5 components (`projection-chart`, `peace-of-mind-card`, `milestone-tracker`, `summary-card`, `pdf-report`), each with its own `useMemo`, each paying the full simulation cost
- The file conflates five distinct concern clusters (core math, portfolio summary, projection/charting, what-if scenarios, state pension/income) with no enforced boundaries between them
- No concept of a computed result object — every component constructs its own view of the data by calling 3–9 functions and assembling derived values inline
- Changes to any concern (e.g. inflation adjustment, state pension rules) require tracing 19 import sites to find all affected callers

The integration risk is at the memoization seams: on a page with `SummaryCard`, `ProjectionChart`, `MilestoneTracker`, and `PeaceOfMindCard` simultaneously rendered, the year-by-year simulation runs 3–5 times per state change with identical inputs.

## Proposed Interface

**Two pure functions + a React context provider (Design A + C hybrid).**

```typescript
// lib/retirement-engine.ts

export interface RetirementProjection {
  points: ProjectionDataPoint[];
  summary: {
    totalBalance: number;
    totalContributions: number;
    averageReturnRate: number;
    progress: number;
    projectedTotal: number;
    projectedTotalReal: number;
    requiredContribution: number;
    confidenceScore: number;
    milestones: Milestone[];
    targetReachAge: number | null;
    coastFireNumber: number;
    coastFireReachYear: number | null;
  };
  income: {
    statePensionEquivalent: number;
    reducedTarget: number;
    annualStatePension: number;
    annualExpenses: number;
    totalRetirementIncome: number;
    bridgePeriodYears: number;
    isaBridgeRequired: boolean;
    isaBridgeProgress: number;
    accessibleBalance: number;
  };
  baseline?: ProjectionBaseline;
}

export interface WhatIfResult {
  baseline: RetirementProjection;
  scenario: RetirementProjection;
  delta: {
    projectedTotal: number;
    projectedTotalReal: number;
    targetReachAge: number | null;
    progressPercent: number;
  };
}

// Entry point 1 — pure function, fully testable
export function computeRetirement(
  profile: UserProfile,
  accounts: Account[],
  withdrawals?: LumpSumWithdrawal[]
): RetirementProjection;

// Entry point 2 — takes already-computed projection; structurally cannot re-trigger simulation
export function computeWhatIf(
  base: RetirementProjection,
  profile: UserProfile,
  accounts: Account[],
  withdrawals?: LumpSumWithdrawal[],
  overrides?: {
    additionalContribution?: number;
    retirementAgeOffset?: number;
    returnRateMultiplier?: number;
  }
): WhatIfResult;

// Escape hatch for one-off math (e.g. inline FV preview in an input field)
export const math: {
  futureValue(pv: number, rate: number, years: number): number;
  adjustForInflation(amount: number, rate: number, years: number): number;
  realReturn(nominal: number, inflation: number): number;
};
```

**Provider pattern enforces single computation per page:**

```tsx
// components/RetirementEngineProvider.tsx
const RetirementEngineContext = createContext<RetirementProjection | null>(null);

export function RetirementEngineProvider({ profile, accounts, withdrawals, children }) {
  const projection = useMemo(
    () => computeRetirement(profile, accounts, withdrawals),
    [profile, accounts, withdrawals]
  );
  return (
    <RetirementEngineContext.Provider value={projection}>
      {children}
    </RetirementEngineContext.Provider>
  );
}

export function useRetirementProjection(): RetirementProjection {
  const ctx = useContext(RetirementEngineContext);
  if (!ctx) throw new Error("useRetirementProjection must be used within RetirementEngineProvider");
  return ctx;
}
```

**Component usage — zero calculation imports:**

```tsx
// Before: SummaryCard calls 9 functions, pays projection cost independently
// After:
export function SummaryCard() {
  const { summary, income } = useRetirementProjection();
  return <div>{Math.round(summary.progress * 100)}% to goal</div>;
}

// ProjectionChart — same hook, zero extra simulation cost
export function ProjectionChart() {
  const { points, summary } = useRetirementProjection();
  return <Chart data={points} coastFireYear={summary.coastFireReachYear} />;
}
```

**What-if panel:**

```tsx
export function WhatIfPanel() {
  const baseProjection = useRetirementProjection();
  const { profile, accounts, withdrawals } = useRetirementData();
  const [extraContrib, setExtraContrib] = useState(0);

  const { scenario, delta } = useMemo(
    () => computeWhatIf(baseProjection, profile, accounts, withdrawals, {
      additionalContribution: extraContrib
    }),
    [baseProjection, profile, accounts, withdrawals, extraContrib]
  );

  return <div>+£{extraContrib}/mo adds £{delta.projectedTotal.toLocaleString()} at retirement</div>;
}
```

**What complexity it hides:**

- `generateProjection` is called exactly once; `summary` and `income` fields are derived from that single run
- Inflation-adjustment application order (pre- vs post-projection) is handled internally and consistently
- `calculateReducedTarget` -> `calculateStatePensionEquivalent` -> `calculateAnnualStatePension` dependency chain is invisible to callers
- `requiredContribution` inverse-solve returns a plain number
- `coastFireNumber` and `coastFireReachYear` are co-computed from projection points at no extra cost
- `computeWhatIf` structurally cannot re-trigger the base simulation — it takes `base: RetirementProjection` as data, not as an input to recompute

## Dependency Strategy

**Category: In-process.** All calculations are pure math — no I/O, no network, no external services. The module can be tested directly with plain TypeScript inputs and outputs. No adapters, mocks, or stand-ins required.

## Testing Strategy

**New boundary tests to write** (at the `computeRetirement` interface):

- Given zero accounts: `summary.projectedTotal === 0`, `summary.progress === 0`
- Given accounts with known balances and return rates: verify `summary.projectedTotalReal` matches hand-calculated expected value
- Given `includeStatePension = true`: `income.statePensionEquivalent > 0`, `income.reducedTarget < profile.targetAmount`
- Given a lump sum withdrawal at age N: verify account balance at year N is reduced, subsequent years compound from reduced base
- Given `computeWhatIf` with `additionalContribution: 500`: verify `delta.projectedTotal > 0` and scenario exceeds baseline
- Given `retirementAge <= currentAge`: verify `computeRetirement` returns empty `points` without throwing

**Old tests to delete:**

Any existing unit tests on individual exported functions (e.g. `calculateProjectedTotalReal`, `calculateStatePensionEquivalent`) that test internal implementation steps become redundant once boundary tests cover the same behaviors through `computeRetirement`. Delete them — they test internals, not the contract.

**Test environment:** None needed beyond a TypeScript test runner. All inputs are plain objects; no DOM, no React, no localStorage required.

## Implementation Recommendations

**What the module should own:**
- The single `generateProjection` call and all data derived from it
- The correct sequencing: core math -> projection -> summary fields -> income fields
- Inflation adjustment applied at the right stage for each field
- The `computeWhatIf` branch (create modified profile/accounts, call `computeRetirement` internally, diff the results)

**What it should hide:**
- The 40+ individual calculation functions (make them unexported internal helpers)
- The specific order in which derived values depend on each other
- The year-by-year simulation loop
- The ISA bridge, state pension, and Coast FIRE sub-computations

**What it should expose:**
- `computeRetirement` — the single pure function
- `computeWhatIf` — takes a completed projection, cannot re-trigger simulation
- `RetirementEngineProvider` + `useRetirementProjection` — the React integration layer
- `math.*` — escape hatch for one-off calculations that do not need a full projection

**Caller migration path:**
1. Add `RetirementEngineProvider` at each page root, wrapping existing content
2. Replace component-level `useMemo` + individual function calls with `useRetirementProjection()`
3. Delete individual imports from `calculations.ts` in each component
4. Move what-if panels to use `computeWhatIf(baseProjection, ...)` instead of calling scenario functions directly
5. Once all callers are migrated, remove `export` from the 40 individual functions (make them internal)
6. Delete shallow unit tests on individual functions; write new boundary tests on `computeRetirement`

**Enforcement:** Add an ESLint `no-restricted-imports` rule that flags direct imports of individual calculation functions from components, pointing callers to `useRetirementProjection` instead.
