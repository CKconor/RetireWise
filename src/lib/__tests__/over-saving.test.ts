import { describe, it, expect } from 'vitest';
import { applyMonthlyCut, applyOneOffSpend, calculateOverSaving } from '@/lib/over-saving';
import { isOnLine, evaluateVerdict } from '@/lib/verdict';
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

function makePlan(accounts: Account[], profile: Partial<UserProfile> = {}): RetirementPlan {
  return {
    accounts,
    profile: {
      birthday: '1981-01-01',
      currentAge: 45,
      retirementAge: 65,
      targetAmount: 500_000,
      expectedInflation: 2.5,
      annualSalary: 0,
      statePensionAmount: 241.3,
      statePensionAge: 67,
      includeStatePension: false,
      essentialsMonthly: 400,
      niceToHavesMonthly: 200,
      ...profile,
    },
    withdrawals: [],
    retirementReturn: 0,
    accountOrder: [],
  };
}

const gia = makeAccount({ id: 'gia', type: 'gia', monthlyContribution: 100 });
const savings = makeAccount({ id: 'sv', type: 'savings', monthlyContribution: 100 });
const isa = makeAccount({ id: 'isa', type: 'isa', monthlyContribution: 100 });
const sipp = makeAccount({ id: 'sipp', type: 'sipp', monthlyContribution: 100 });
const pension = makeAccount({ id: 'pen', type: 'pension', monthlyContribution: 100 });

describe('applyMonthlyCut', () => {
  const contributions = (accounts: Account[]) => Object.fromEntries(accounts.map((a) => [a.id, a.monthlyContribution]));

  it('cuts GIAs, then savings, then ISAs, then SIPPs', () => {
    const { accounts } = applyMonthlyCut([sipp, isa, savings, gia], 250);
    expect(contributions(accounts)).toEqual({ sipp: 100, isa: 50, sv: 0, gia: 0 });
  });

  it('cuts a SIPP last, and says so', () => {
    const result = applyMonthlyCut([sipp, isa], 150);
    expect(contributions(result.accounts)).toEqual({ sipp: 50, isa: 0 });
    expect(result.cutsSipp).toBe(true);
  });

  it('never cuts a pension account unless it is unlocked', () => {
    expect(contributions(applyMonthlyCut([pension], 100).accounts)).toEqual({ pen: 100 });
    const unlocked = { ...pension, allowContributionCut: true };
    expect(contributions(applyMonthlyCut([unlocked], 100).accounts)).toEqual({ pen: 0 });
  });

  it('shrinks planned contribution changes in proportion', () => {
    const planned = { ...isa, contributionChanges: [{ id: 'c1', age: 50, monthlyContribution: 200 }] };
    const { accounts } = applyMonthlyCut([planned], 25);
    expect(accounts[0].monthlyContribution).toBe(75);
    expect(accounts[0].contributionChanges![0].monthlyContribution).toBe(150);
  });

  it('reports how much could be cut in total', () => {
    expect(applyMonthlyCut([gia, pension], 0).cuttable).toBe(100);
  });
});

describe('applyOneOffSpend', () => {
  const balances = (accounts: Account[]) => accounts.map((a) => a.currentBalance);

  it('spends from GIAs, then savings, then ISAs, and never pensions', () => {
    const accounts = [
      { ...gia, currentBalance: 100 },
      { ...savings, currentBalance: 100 },
      { ...isa, currentBalance: 100 },
      { ...sipp, currentBalance: 100 },
    ];
    expect(balances(applyOneOffSpend(accounts, 250).accounts)).toEqual([0, 0, 50, 100]);
    expect(applyOneOffSpend(accounts, 0).spendable).toBe(300);
  });
});

describe('calculateOverSaving', () => {
  // £900 a month for 20 years with no growth is £216k. Lifestyle to age 90 takes £180k
  const saver = makeAccount({ id: 'isa', monthlyContribution: 900 });

  it('finds a save-less figure that stays on the line, and the next £25 does not', () => {
    const plan = makePlan([saver]);
    const { secure } = calculateOverSaving(plan);
    expect(secure.onLine).toBe(true);
    expect(secure.saveLessMonthly % 25).toBe(0);
    const cutTo = (cut: number) => evaluateVerdict({ ...plan, accounts: applyMonthlyCut(plan.accounts, cut).accounts });
    expect(isOnLine(cutTo(secure.saveLessMonthly), 'secure')).toBe(true);
    expect(isOnLine(cutTo(secure.saveLessMonthly + 25), 'secure')).toBe(false);
  });

  it('leaves less room on the strict line than the secure line', () => {
    const roomy = makeAccount({ id: 'isa', monthlyContribution: 1_200 });
    const { secure, strict } = calculateOverSaving(makePlan([roomy]));
    expect(strict.onLine).toBe(true);
    expect(strict.saveLessMonthly).toBeLessThan(secure.saveLessMonthly);
  });

  it('names the test that limits the figure', () => {
    const { secure } = calculateOverSaving(makePlan([saver]));
    expect(secure.limitedBy).toEqual({ level: 'lifestyle', caseId: 'expected' });
  });

  it('says when it is limited only by there being nothing left to cut', () => {
    const rich = makeAccount({ id: 'sv', type: 'savings', currentBalance: 5_000_000, monthlyContribution: 100 });
    const { secure } = calculateOverSaving(makePlan([rich]));
    expect(secure.saveLessMonthly).toBe(100);
    expect(secure.limitedBy).toBeNull();
  });

  it('says there is no room when the plan is not on the line', () => {
    const { secure } = calculateOverSaving(makePlan([makeAccount({ id: 'isa', monthlyContribution: 10 })]));
    expect(secure).toMatchObject({ onLine: false, saveLessMonthly: 0, spendNow: 0, retireSoonerYears: 0 });
  });

  it('keeps spend-now within non-pension accounts, and on the line', () => {
    const plan = makePlan([
      makeAccount({ id: 'isa', currentBalance: 50_000, monthlyContribution: 700 }),
      makeAccount({ id: 'pen', type: 'pension', currentBalance: 500_000 }),
    ]);
    const { secure } = calculateOverSaving(plan);
    expect(secure.spendNow).toBeLessThanOrEqual(50_000);
    expect(secure.spendNow % 25).toBe(0);
  });

  it('finds how many years sooner the plan could retire', () => {
    const plan = makePlan([saver]);
    const { secure } = calculateOverSaving(plan);
    const sooner = (years: number) => evaluateVerdict({ ...plan, profile: { ...plan.profile, retirementAge: 65 - years } });
    expect(isOnLine(sooner(secure.retireSoonerYears), 'secure')).toBe(true);
    expect(isOnLine(sooner(secure.retireSoonerYears + 1), 'secure')).toBe(false);
  });

  it('flags when the save-less figure relies on cutting a SIPP', () => {
    const plan = makePlan([makeAccount({ id: 'sipp', type: 'sipp', monthlyContribution: 700, currentBalance: 500_000 })]);
    expect(calculateOverSaving(plan).secure.cutsSipp).toBe(true);
  });
});
