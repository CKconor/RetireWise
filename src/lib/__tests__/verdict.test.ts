import { describe, it, expect } from 'vitest';
import { calculateFixes, describeVerdict, evaluateHistoricWorst, evaluateVerdict, failingCases, isOnLine, type VerdictCaseId } from '@/lib/verdict';
import type { RetirementPlan } from '@/lib/retirement-simulator';
import type { Account, UserProfile } from '@/types';

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'isa-1',
    name: 'ISA',
    type: 'isa',
    currentBalance: 0,
    monthlyContribution: 0,
    annualReturnRate: 2.5,
    annualContributionIncrease: 0,
    ...overrides,
  };
}

function makePlan(accounts: Account[], profile: Partial<UserProfile> = {}, retirementReturn = 0): RetirementPlan {
  return {
    accounts,
    profile: {
      birthday: '1961-01-01',
      currentAge: 88,
      retirementAge: 88,
      targetAmount: 500_000,
      expectedInflation: 2.5,
      annualSalary: 0,
      statePensionAmount: 241.3,
      statePensionAge: 67,
      includeStatePension: false,
      essentialsMonthly: 1_000,
      niceToHavesMonthly: 1_000,
      ...profile,
    },
    withdrawals: [],
    retirementReturn,
    accountOrder: [],
  };
}

const cell = (plan: RetirementPlan, level: 'essentials' | 'lifestyle', id: VerdictCaseId) => evaluateVerdict(plan)[level][id];

describe('evaluateVerdict: Expected', () => {
  // Two years to age 90, no growth, no tax on ISA withdrawals
  it('passes when the money lasts to age 90', () => {
    const plan = makePlan([makeAccount({ currentBalance: 48_000 })]);
    expect(cell(plan, 'lifestyle', 'expected').passed).toBe(true);
  });

  it('fails with the age and yearly shortfall when it does not', () => {
    const plan = makePlan([makeAccount({ currentBalance: 30_000 })]);
    const result = cell(plan, 'lifestyle', 'expected');
    expect(result.passed).toBe(false);
    expect(result.firstFailAge).toBe(89);
    expect(result.yearlyShortfall).toBeCloseTo(18_000, 1);
    expect(cell(plan, 'essentials', 'expected').passed).toBe(true);
  });

  it('fails on a shortfall while the pension is locked, even with money in it', () => {
    const pension = makeAccount({ id: 'pen-1', type: 'pension', currentBalance: 500_000 });
    const plan = makePlan([pension], { currentAge: 50, retirementAge: 50, birthday: '1976-01-01' });
    expect(cell(plan, 'essentials', 'expected')).toMatchObject({ passed: false, firstFailAge: 50 });
  });
});

describe('evaluateVerdict: yearly shortfall', () => {
  it('reports the worst year, not a first year that was only partly short', () => {
    // £24k a year from £30k: age 87 is paid in full, 88 is £18k short, and 89 is the full £24k short
    const plan = makePlan([makeAccount({ currentBalance: 30_000 })], { currentAge: 87, retirementAge: 87 });
    const result = cell(plan, 'lifestyle', 'expected');
    expect(result.firstFailAge).toBe(88);
    expect(result.yearlyShortfall).toBeCloseTo(24_000, 1);
  });
});

describe('evaluateVerdict: Crash', () => {
  it('halves invested accounts just before retirement', () => {
    // £48k falls to £24k. Year one takes £24k, leaving nothing for year two
    const plan = makePlan([makeAccount({ currentBalance: 48_000 })]);
    expect(cell(plan, 'lifestyle', 'crash')).toMatchObject({ passed: false, firstFailAge: 89 });
  });

  it('spares accounts marked as savings', () => {
    const savings = makeAccount({ id: 'sv', type: 'savings', currentBalance: 48_000 });
    expect(cell(makePlan([savings]), 'lifestyle', 'crash').passed).toBe(true);
  });

  it('recovers to the pre-fall real value by year 10, then returns to expected', () => {
    // No spending: £100k falls to £50k, and is worth £100k again after 10 years,
    // then 2% for the two years after that. A pot that ends too low would fail spending of this size.
    const isa = makeAccount({ currentBalance: 100_000 });
    const profile = { currentAge: 78, retirementAge: 78, essentialsMonthly: 0, niceToHavesMonthly: 0 };
    const plan = makePlan([isa], profile, 2);
    // One large final-year need that only passes with the full recovered pot
    const passing = { ...plan, profile: { ...plan.profile, essentialsMonthly: 400 } };
    expect(cell(passing, 'essentials', 'crash').passed).toBe(true);
    expect(cell(passing, 'essentials', 'expected').passed).toBe(true);
    // Spending above what even the expected pot could fund must fail the crash too
    const failing = { ...plan, profile: { ...plan.profile, essentialsMonthly: 2_000 } };
    expect(cell(failing, 'essentials', 'crash').passed).toBe(false);
  });

  it('does not count the 74% outcome towards the Verdict, but reports it', () => {
    const plan = makePlan([makeAccount({ currentBalance: 60_000 })]);
    // £60k falls 50% to £30k, enough for Essentials at £24k. A 74% fall leaves £15.6k, which isn't.
    expect(cell(plan, 'essentials', 'crash').passed).toBe(true);
    expect(evaluateHistoricWorst(plan).essentials.passed).toBe(false);
  });
});

describe('evaluateVerdict: Poor returns', () => {
  it('earns nothing after inflation for 25 years, on every account including cash', () => {
    const savings = makeAccount({ id: 'sv', type: 'savings', currentBalance: 120_000 });
    const profile = { currentAge: 80, retirementAge: 80, essentialsMonthly: 1_000, niceToHavesMonthly: 0 };
    // £120k pays £12k for 10 years with no growth. It's an exact fit on 0%, and 10% growth would pass easily
    expect(cell(makePlan([savings], profile, 10), 'essentials', 'poorReturns').passed).toBe(true);
    const tooMuch = { ...profile, essentialsMonthly: 1_100 };
    expect(cell(makePlan([savings], tooMuch, 10), 'essentials', 'poorReturns').passed).toBe(false);
    expect(cell(makePlan([savings], tooMuch, 10), 'essentials', 'expected').passed).toBe(true);
  });

  it('returns to expected returns after 25 years', () => {
    const isa = makeAccount({ currentBalance: 700_000 });
    const profile = { currentAge: 50, retirementAge: 60, essentialsMonthly: 0, niceToHavesMonthly: 0, birthday: '1976-01-01' };
    const plan = makePlan([isa], profile, 10);
    // Spending of £20k a year for 25 years uses £500k of the £700k, then 10% growth covers the last 5 years
    const fits = { ...plan, profile: { ...plan.profile, essentialsMonthly: 20_000 / 12 } };
    expect(cell(fits, 'essentials', 'poorReturns').passed).toBe(true);
  });
});

describe('evaluateVerdict: Living to 98', () => {
  const isa = makeAccount({ currentBalance: 120_000 });
  const profile = { currentAge: 88, retirementAge: 88, essentialsMonthly: 1_000, niceToHavesMonthly: 0 };

  it('needs the money to last to 98 by default', () => {
    // 10 years at £12k
    expect(cell(makePlan([isa], profile), 'essentials', 'longLife').passed).toBe(true);
    const short = makeAccount({ currentBalance: 100_000 });
    expect(cell(makePlan([short], profile), 'essentials', 'longLife')).toMatchObject({ passed: false, firstFailAge: 96 });
  });

  it('uses the age the person sets', () => {
    const short = makeAccount({ currentBalance: 100_000 });
    expect(cell(makePlan([short], { ...profile, longLifeAge: 95 }), 'essentials', 'longLife').passed).toBe(true);
  });
});

describe('isOnLine', () => {
  const allPass = makePlan([makeAccount({ id: 'sv', type: 'savings', currentBalance: 1_000_000 })]);

  it('counts a plan passing everything as on both lines', () => {
    const verdict = evaluateVerdict(allPass);
    expect(isOnLine(verdict, 'secure')).toBe(true);
    expect(isOnLine(verdict, 'strict')).toBe(true);
  });

  it('allows Lifestyle to fail the bad outcomes on the secure line only', () => {
    // Enough for Lifestyle to age 90 and Essentials to 98, but not Lifestyle to 98
    const savings = makeAccount({ id: 'sv', type: 'savings', currentBalance: 120_000 });
    const verdict = evaluateVerdict(makePlan([savings]));
    expect(verdict.lifestyle.expected.passed).toBe(true);
    expect(verdict.essentials.longLife.passed).toBe(true);
    expect(verdict.lifestyle.longLife.passed).toBe(false);
    expect(isOnLine(verdict, 'secure')).toBe(true);
    expect(isOnLine(verdict, 'strict')).toBe(false);
  });

  it('is on neither line when Essentials fail any case', () => {
    const savings = makeAccount({ id: 'sv', type: 'savings', currentBalance: 60_000 });
    const verdict = evaluateVerdict(makePlan([savings]));
    expect(verdict.essentials.longLife.passed).toBe(false);
    expect(isOnLine(verdict, 'secure')).toBe(false);
  });
});

describe('describeVerdict', () => {
  it('says plainly when both levels pass', () => {
    const rich = makePlan([makeAccount({ id: 'sv', type: 'savings', currentBalance: 1_000_000 })]);
    expect(describeVerdict(evaluateVerdict(rich))).toBe('Essentials pass every test. Lifestyle passes every test.');
  });

  it('names each fail and its age', () => {
    const savings = makeAccount({ id: 'sv', type: 'savings', currentBalance: 120_000 });
    expect(describeVerdict(evaluateVerdict(makePlan([savings])))).toBe('Essentials pass every test. Lifestyle fails Living to 98 at 93.');
  });

  it('uses the age the person has set', () => {
    const savings = makeAccount({ id: 'sv', type: 'savings', currentBalance: 120_000 });
    expect(describeVerdict(evaluateVerdict(makePlan([savings], { longLifeAge: 95 })), 95)).toBe('Essentials pass every test. Lifestyle fails Living to 95 at 93.');
  });
});

describe('calculateFixes', () => {
  // Saving £700 a month for 20 years into an ISA that earns nothing after inflation
  const isa = makeAccount({ currentBalance: 0, monthlyContribution: 700 });
  const profile = { currentAge: 45, retirementAge: 65, essentialsMonthly: 400, niceToHavesMonthly: 800, birthday: '1981-01-01' };
  const plan = makePlan([isa], profile);

  const withExtraSaving = (extra: number): RetirementPlan => ({
    ...plan,
    accounts: [{ ...isa, monthlyContribution: 700 + extra }],
  });

  it('shows nothing when a level has no fails', () => {
    const rich = makePlan([makeAccount({ id: 'sv', type: 'savings', currentBalance: 5_000_000 })], profile);
    expect(calculateFixes(rich, 'lifestyle')).toBeNull();
  });

  it('finds the extra monthly saving that fixes a Lifestyle fail, and no less', () => {
    const fixes = calculateFixes(plan, 'lifestyle')!;
    expect(fixes.saveMoreMonthly).toBeGreaterThan(0);
    const fixed = evaluateVerdict(withExtraSaving(fixes.saveMoreMonthly!));
    expect(failingCases(fixed, 'lifestyle')).toEqual([]);
    const tooLittle = evaluateVerdict(withExtraSaving(fixes.saveMoreMonthly! - 5));
    expect(failingCases(tooLittle, 'lifestyle').length).toBeGreaterThan(0);
  });

  it('finds how many years later to retire', () => {
    const fixes = calculateFixes(plan, 'lifestyle')!;
    expect(fixes.retireLaterYears).toBeGreaterThan(0);
    const later = (years: number): RetirementPlan => ({ ...plan, profile: { ...plan.profile, retirementAge: 65 + years } });
    expect(failingCases(evaluateVerdict(later(fixes.retireLaterYears!)), 'lifestyle')).toEqual([]);
    expect(failingCases(evaluateVerdict(later(fixes.retireLaterYears! - 1)), 'lifestyle').length).toBeGreaterThan(0);
  });

  it('finds how far Nice-to-haves must fall for Lifestyle', () => {
    const fixes = calculateFixes(plan, 'lifestyle')!;
    expect(fixes.cutMonthly).toBeGreaterThan(0);
    expect(fixes.cutMonthly).toBeLessThanOrEqual(800);
    const cut = (amount: number): RetirementPlan => ({ ...plan, profile: { ...plan.profile, niceToHavesMonthly: 800 - amount } });
    expect(failingCases(evaluateVerdict(cut(fixes.cutMonthly!)), 'lifestyle')).toEqual([]);
    expect(failingCases(evaluateVerdict(cut(fixes.cutMonthly! - 5)), 'lifestyle').length).toBeGreaterThan(0);
  });

  it('cuts Essentials for an Essentials fail', () => {
    const poor = makePlan([makeAccount({ currentBalance: 0, monthlyContribution: 50 })], profile);
    const fixes = calculateFixes(poor, 'essentials')!;
    expect(fixes.cutMonthly).toBeGreaterThan(0);
    expect(fixes.cutMonthly).toBeLessThanOrEqual(400);
  });

  it('reports no cut when cutting all Nice-to-haves still would not be enough', () => {
    const poor = makePlan([makeAccount({ currentBalance: 0, monthlyContribution: 10 })], profile);
    expect(calculateFixes(poor, 'lifestyle')!.cutMonthly).toBeNull();
  });
});
