import { Account } from '@/types';
import { calculateAverageReturnRate } from '@/lib/calculations';
import {
  ENOUGH_END_AGE,
  findSmallestPassing,
  simulateRetirement,
  type RetirementPlan,
  type RetirementRun,
} from '@/lib/retirement-simulator';

export const DEFAULT_LONG_LIFE_AGE = 98;

export type EnoughLevel = 'essentials' | 'lifestyle';
export type VerdictCaseId = 'expected' | 'crash' | 'poorReturns' | 'longLife';
export type VerdictLine = 'secure' | 'strict';

export const VERDICT_CASES: { id: VerdictCaseId; label: string }[] = [
  { id: 'expected', label: 'Expected' },
  { id: 'crash', label: 'Crash' },
  { id: 'poorReturns', label: 'Poor returns' },
  { id: 'longLife', label: 'Long life' },
];

export const ENOUGH_LEVELS: { id: EnoughLevel; label: string }[] = [
  { id: 'essentials', label: 'Essentials' },
  { id: 'lifestyle', label: 'Lifestyle' },
];

/** "Living to 98", using the age the person has set */
export function getCaseLabel(id: VerdictCaseId, longLifeAge: number | undefined): string {
  if (id === 'longLife') return `Living to ${longLifeAge ?? DEFAULT_LONG_LIFE_AGE}`;
  return VERDICT_CASES.find((verdictCase) => verdictCase.id === id)!.label;
}

export const CRASH_FALL_PERCENT = 50;
export const CRASH_RECOVERY_YEARS = 10;
export const POOR_RETURNS_YEARS = 25;
export const HISTORIC_WORST_FALL_PERCENT = 74;
const HISTORIC_WORST_RECOVERY_YEARS = 10.5;

/** Savings accounts hold cash, so a market fall doesn't touch them. */
const isInvested = (account: Account) => account.type !== 'savings';

/** A fall just before retirement, then the return that restores the pre-fall real value. */
function crashRun(plan: RetirementPlan, fallPercent: number, recoveryYears: number): Partial<RetirementRun> {
  const remaining = 1 - fallPercent / 100;
  const recoveryReturn = (Math.pow(1 / remaining, 1 / recoveryYears) - 1) * 100;
  return {
    fallAtRetirement: { share: fallPercent / 100, appliesTo: isInvested },
    returnForYear: (yearIndex, account) =>
      isInvested(account) && yearIndex < recoveryYears ? recoveryReturn : plan.retirementReturn,
  };
}

function runForCase(plan: RetirementPlan, id: VerdictCaseId): Partial<RetirementRun> {
  switch (id) {
    case 'expected':
      return {};
    case 'crash':
      return crashRun(plan, CRASH_FALL_PERCENT, CRASH_RECOVERY_YEARS);
    case 'poorReturns':
      return { returnForYear: (yearIndex) => (yearIndex < POOR_RETURNS_YEARS ? 0 : plan.retirementReturn) };
    case 'longLife':
      return { endAge: plan.profile.longLifeAge ?? DEFAULT_LONG_LIFE_AGE };
  }
}

export interface VerdictCell {
  passed: boolean;
  firstFailAge: number | null;
  /** The worst year, since the first year to fall short may only be partly short */
  yearlyShortfall: number;
}

export type Verdict = Record<EnoughLevel, Record<VerdictCaseId, VerdictCell>>;

function monthlySpendingFor(plan: RetirementPlan, level: EnoughLevel): number {
  const essentials = plan.profile.essentialsMonthly ?? 0;
  return level === 'essentials' ? essentials : essentials + (plan.profile.niceToHavesMonthly ?? 0);
}

function evaluateRun(plan: RetirementPlan, level: EnoughLevel, run: Partial<RetirementRun>): VerdictCell {
  const { years, firstShortfallAge } = simulateRetirement(plan, {
    endAge: ENOUGH_END_AGE,
    ...run,
    monthlySpending: monthlySpendingFor(plan, level),
  });
  return {
    passed: firstShortfallAge === null,
    firstFailAge: firstShortfallAge,
    yearlyShortfall: Math.max(0, ...years.map((year) => year.shortfall)),
  };
}

function evaluateLevel(plan: RetirementPlan, level: EnoughLevel): Record<VerdictCaseId, VerdictCell> {
  const cells = {} as Record<VerdictCaseId, VerdictCell>;
  for (const { id } of VERDICT_CASES) cells[id] = evaluateRun(plan, level, runForCase(plan, id));
  return cells;
}

export function evaluateVerdict(plan: RetirementPlan): Verdict {
  return { essentials: evaluateLevel(plan, 'essentials'), lifestyle: evaluateLevel(plan, 'lifestyle') };
}

/** The 1972–74 style fall, shown for information. It never counts towards the Verdict. */
export function evaluateHistoricWorst(plan: RetirementPlan): Record<EnoughLevel, VerdictCell> {
  const run = crashRun(plan, HISTORIC_WORST_FALL_PERCENT, HISTORIC_WORST_RECOVERY_YEARS);
  return { essentials: evaluateRun(plan, 'essentials', run), lifestyle: evaluateRun(plan, 'lifestyle', run) };
}

export function failingCases(verdict: Verdict, level: EnoughLevel): VerdictCaseId[] {
  return VERDICT_CASES.map(({ id }) => id).filter((id) => !verdict[level][id].passed);
}

/**
 * Secure: Essentials pass every case and Lifestyle passes on expected returns.
 * Strict: both levels pass every case.
 */
export function isOnLine(verdict: Verdict, line: VerdictLine): boolean {
  if (failingCases(verdict, 'essentials').length > 0) return false;
  return line === 'strict' ? failingCases(verdict, 'lifestyle').length === 0 : verdict.lifestyle.expected.passed;
}

/** The whole Verdict in a sentence, such as "Essentials pass every test. Lifestyle fails Crash at 84." */
export function describeVerdict(verdict: Verdict, longLifeAge?: number): string {
  return ENOUGH_LEVELS.map(({ id: level, label }) => {
    const failing = failingCases(verdict, level);
    const verb = (plural: string, singular: string) => (level === 'essentials' ? plural : singular);
    if (failing.length === 0) return `${label} ${verb('pass', 'passes')} every test.`;
    const fails = failing.map((id) => `${getCaseLabel(id, longLifeAge)} at ${verdict[level][id].firstFailAge}`);
    return `${label} ${verb('fail', 'fails')} ${fails.join(', ')}.`;
  }).join(' ');
}

export interface VerdictFixes {
  saveMoreMonthly: number | null;
  retireLaterYears: number | null;
  /** How far Nice-to-haves, or Essentials at that level, would need to fall each month */
  cutMonthly: number | null;
}

const SAVE_MORE_LIMIT = 50_000;
const FIX_PRECISION = 1;

/** Extra monthly saving goes into a new ISA, since a locked pension wouldn't fix an early shortfall. */
function withExtraSaving(plan: RetirementPlan, monthly: number): RetirementPlan {
  const extraSaving: Account = {
    id: 'extra-saving',
    name: 'Extra saving',
    type: 'isa',
    currentBalance: 0,
    monthlyContribution: monthly,
    annualReturnRate: calculateAverageReturnRate(plan.accounts),
    annualContributionIncrease: 0,
  };
  return { ...plan, accounts: [...plan.accounts, extraSaving] };
}

/** Three separate changes, each enough on its own to clear all of a level's fails. */
export function calculateFixes(plan: RetirementPlan, level: EnoughLevel): VerdictFixes | null {
  const failing = failingCases(evaluateVerdict(plan), level);
  if (failing.length === 0) return null;

  const clears = (changed: RetirementPlan) =>
    failing.every((id) => evaluateRun(changed, level, runForCase(changed, id)).passed);
  const roundedUp = (value: number | null) => (value === null ? null : Math.ceil(value));

  const { currentAge, retirementAge, essentialsMonthly = 0, niceToHavesMonthly = 0 } = plan.profile;

  const saveMoreMonthly = currentAge < retirementAge
    ? roundedUp(findSmallestPassing((extra) => clears(withExtraSaving(plan, extra)), { limit: SAVE_MORE_LIMIT, precision: FIX_PRECISION }))
    : null;

  let retireLaterYears: number | null = null;
  for (let years = 1; retirementAge + years < ENOUGH_END_AGE; years++) {
    if (clears({ ...plan, profile: { ...plan.profile, retirementAge: retirementAge + years } })) {
      retireLaterYears = years;
      break;
    }
  }

  const cuttable = level === 'essentials' ? essentialsMonthly : niceToHavesMonthly;
  const withCut = (cut: number): RetirementPlan => ({
    ...plan,
    profile: {
      ...plan.profile,
      ...(level === 'essentials'
        ? { essentialsMonthly: essentialsMonthly - cut }
        : { niceToHavesMonthly: niceToHavesMonthly - cut }),
    },
  });
  const cutMonthly = cuttable > 0
    ? roundedUp(findSmallestPassing((cut) => clears(withCut(cut)), { limit: cuttable, precision: FIX_PRECISION }))
    : null;

  return { saveMoreMonthly, retireLaterYears, cutMonthly };
}
