import { describe, it, expect } from 'vitest';
import { calculateAnnualRetirementExpenses, calculateReducedTarget, getRetirementAccounts } from '@/lib/calculations';
import { calculateEnough, findSmallestPassing, resolvePlanningProfile, simulateRetirement, type RetirementPlan } from '@/lib/retirement-simulator';
import { computeRetirement } from '@/lib/retirement-engine';
import type { Account, UserProfile } from '@/types';

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'isa-1',
    name: 'Account',
    type: 'isa',
    currentBalance: 0,
    monthlyContribution: 0,
    annualReturnRate: 2.5,
    annualContributionIncrease: 0,
    ...overrides,
  };
}

function makePlan(accounts: Account[], profile: Partial<UserProfile> = {}): RetirementPlan {
  return {
    accounts,
    profile: {
      birthday: '1961-01-01',
      currentAge: 65,
      retirementAge: 65,
      targetAmount: 500_000,
      expectedInflation: 2.5,
      annualSalary: 0,
      statePensionAmount: 241.3,
      statePensionAge: 67,
      includeStatePension: false,
      ...profile,
    },
    withdrawals: [],
    retirementReturn: 0,
    accountOrder: [],
  };
}

describe('simulateRetirement', () => {
  it('pays spending in full, then reports the year it falls short', () => {
    const isa = makeAccount({ currentBalance: 18_000 });
    const result = simulateRetirement(makePlan([isa]), { monthlySpending: 1_000, endAge: 67 });
    expect(result.years[0]).toMatchObject({ age: 65, spendingPaid: 12_000, shortfall: 0 });
    expect(result.years[1].shortfall).toBeCloseTo(6_000, 1);
    expect(result.firstShortfallAge).toBe(66);
  });

  it('withdraws enough from a pension to leave the spending after tax', () => {
    // £60k from a large pension: tax-free cash covers 25% of the pot, so make the pot small enough
    // to use it up, then check the spending still arrives in full once withdrawals are taxed
    const pension = makeAccount({ id: 'pen-1', type: 'pension', currentBalance: 400_000 });
    const result = simulateRetirement(makePlan([pension]), { monthlySpending: 5_000, endAge: 70 });
    expect(result.firstShortfallAge).toBeNull();
    for (const year of result.years) expect(year.spendingPaid).toBe(60_000);
    // More than £60k a year has to leave the pot once the tax-free cash has gone
    const drawnInFinalYear = result.years[3].endBalance - result.years[4].endBalance;
    expect(drawnInFinalYear).toBeGreaterThan(60_000);
  });

  it('counts a pension still locked as money it cannot pay from', () => {
    const pension = makeAccount({ id: 'pen-1', type: 'pension', currentBalance: 500_000 });
    const plan = makePlan([pension], { currentAge: 50, retirementAge: 50, birthday: '1976-01-01' });
    const result = simulateRetirement(plan, { monthlySpending: 1_000, endAge: 52 });
    expect(result.firstShortfallAge).toBe(50);
  });

  it('grows what remains by the return for that year', () => {
    const isa = makeAccount({ currentBalance: 100_000 });
    const result = simulateRetirement(makePlan([isa]), {
      monthlySpending: 0,
      endAge: 67,
      returnForYear: (yearIndex) => (yearIndex === 0 ? -50 : 100),
    });
    expect(result.years.map((year) => year.endBalance)).toEqual([50_000, 100_000]);
  });
});

describe('findSmallestPassing', () => {
  it('finds the point where a rule starts to pass', () => {
    expect(findSmallestPassing((value) => value >= 1_234, { limit: 10_000 })).toBeCloseTo(1_234, -1);
  });

  it('returns zero when nothing is needed', () => {
    expect(findSmallestPassing(() => true, { limit: 10_000 })).toBe(0);
  });

  it('returns null when nothing within the limit passes', () => {
    expect(findSmallestPassing(() => false, { limit: 10_000 })).toBeNull();
  });
});

describe('calculateEnough', () => {
  const isa = makeAccount({ currentBalance: 10_000 });
  const toEnd = { retirementAge: 86, currentAge: 86 };

  it('is the spending for each year when an ISA earns nothing after inflation', () => {
    // Ages 86–89 at £12k a year, no tax on ISA withdrawals
    expect(calculateEnough(makePlan([isa], toEnd), 1_000)).toBeCloseTo(48_000, -1);
  });

  it('allows for the wait until state pension', () => {
    // Ages 65–66 at £20k, then the £12,547.60 state pension leaves £7,452.40 a year to age 90.
    // The pension is under the personal allowance, so it carries no tax.
    const plan = makePlan([isa], { includeStatePension: true });
    const expected = 2 * 20_000 + 23 * (20_000 - 12_547.6);
    expect(calculateEnough(plan, 20_000 / 12)).toBeCloseTo(expected, -1);
  });

  it('is nothing when state pension already covers the spending', () => {
    const plan = makePlan([isa], { includeStatePension: true, retirementAge: 67, currentAge: 67 });
    expect(calculateEnough(plan, 1_000)).toBe(0);
  });

  it('is smaller when the pot keeps growing', () => {
    const noGrowth = calculateEnough(makePlan([isa]), 1_000)!;
    const growing = calculateEnough({ ...makePlan([isa]), retirementReturn: 2 }, 1_000)!;
    expect(growing).toBeLessThan(noGrowth);
  });

  it('needs more than the spending when it comes from a taxed pension', () => {
    const pension = makeAccount({ id: 'pen-1', type: 'pension', currentBalance: 10_000 });
    const fromIsa = calculateEnough(makePlan([isa], toEnd), 3_000)!;
    const fromPension = calculateEnough(makePlan([pension], toEnd), 3_000)!;
    expect(fromPension).toBeGreaterThan(fromIsa);
  });

  it('cannot be solved when all the money is in a pension that is still locked', () => {
    const pension = makeAccount({ id: 'pen-1', type: 'pension', currentBalance: 10_000 });
    const plan = makePlan([pension], { currentAge: 50, retirementAge: 50, birthday: '1976-01-01' });
    expect(calculateEnough(plan, 1_000)).toBeNull();
  });

  it('still gives an answer before any money is saved', () => {
    expect(calculateEnough(makePlan([], toEnd), 1_000)).toBeCloseTo(48_000, -1);
  });
});

describe('resolvePlanningProfile', () => {
  const isa = makeAccount({ currentBalance: 10_000 });
  const plan = makePlan([isa], { targetAmount: 777_000, includeStatePension: true });
  const resolve = (spending: Partial<UserProfile>) =>
    resolvePlanningProfile({ ...plan, profile: { ...plan.profile, ...spending } });

  it('keeps the saved target until both spending totals are entered', () => {
    expect(resolve({}).targetAmount).toBe(777_000);
    expect(resolve({ essentialsMonthly: 1_000 }).targetAmount).toBe(777_000);
    expect(resolve({}).targetIsEnough).toBeFalsy();
  });

  it('uses Lifestyle Enough once spending is entered', () => {
    const profile = resolve({ essentialsMonthly: 1_500, niceToHavesMonthly: 500 });
    const expected = calculateEnough({ ...plan, profile: { ...plan.profile, essentialsMonthly: 1_500, niceToHavesMonthly: 500 } }, 2_000);
    expect(profile.targetAmount).toBe(expected);
    expect(profile.targetIsEnough).toBe(true);
  });

  it('does not take state pension off Enough a second time', () => {
    const profile = resolve({ essentialsMonthly: 1_500, niceToHavesMonthly: 500 });
    expect(calculateReducedTarget(profile)).toBe(profile.targetAmount);
  });

  it('uses the actual spending for yearly retirement expenses', () => {
    const profile = resolve({ essentialsMonthly: 1_500, niceToHavesMonthly: 500 });
    expect(calculateAnnualRetirementExpenses(profile)).toBe(24_000);
  });

  it('keeps the saved target when Enough cannot be solved', () => {
    const pension = makeAccount({ id: 'pen-1', type: 'pension', currentBalance: 10_000 });
    const locked = makePlan([pension], { targetAmount: 777_000, currentAge: 50, retirementAge: 50, birthday: '1976-01-01', essentialsMonthly: 1_000, niceToHavesMonthly: 0 });
    const profile = resolvePlanningProfile(locked);
    expect(profile.targetAmount).toBe(777_000);
    expect(profile.targetIsEnough).toBeFalsy();
  });
});

describe('getRetirementAccounts', () => {
  it('leaves Emergency cash out of the retirement pot', () => {
    const cash = makeAccount({ id: 'cash', type: 'savings', isEmergencyCash: true });
    const isa = makeAccount({ id: 'isa' });
    expect(getRetirementAccounts([cash, isa])).toEqual([isa]);
  });
});

describe('dashboard figures once Enough is the target', () => {
  it('measures the plan against Enough itself, without taking off state pension again', () => {
    const isa = makeAccount({ currentBalance: 200_000 });
    const plan = makePlan([isa], {
      currentAge: 40,
      retirementAge: 65,
      includeStatePension: true,
      essentialsMonthly: 1_500,
      niceToHavesMonthly: 500,
    });
    const profile = resolvePlanningProfile(plan);
    const result = computeRetirement([isa], profile);
    expect(result.effectiveTarget).toBe(profile.targetAmount);
    expect(result.statePensionEquivalent).toBe(0);
  });
});
