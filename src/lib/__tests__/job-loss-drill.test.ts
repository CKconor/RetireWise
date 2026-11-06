import { describe, it, expect } from 'vitest';
import { calculateRunway, DEFAULT_DRILL_INPUTS, runJobLossDrill } from '@/lib/job-loss-drill';
import type { RetirementPlan } from '@/lib/retirement-simulator';
import type { Account, UserProfile } from '@/types';

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'acc',
    name: 'Account',
    type: 'isa',
    currentBalance: 0,
    monthlyContribution: 0,
    annualReturnRate: 5,
    annualContributionIncrease: 0,
    ...overrides,
  };
}

const profile: UserProfile = {
  birthday: '1986-01-01',
  currentAge: 40,
  retirementAge: 65,
  targetAmount: 500_000,
  expectedInflation: 2.5,
  annualSalary: 50_000,
  statePensionAmount: 241.3,
  statePensionAge: 68,
  includeStatePension: true,
};

const emergency = makeAccount({ id: 'em', type: 'savings', currentBalance: 12_000, isEmergencyCash: true });
const savings = makeAccount({ id: 'sv', type: 'savings', currentBalance: 4_000 });
const isa = makeAccount({ id: 'is', type: 'isa', currentBalance: 6_000 });
const gia = makeAccount({ id: 'gi', type: 'gia', currentBalance: 2_000 });
const pension = makeAccount({ id: 'pe', type: 'pension', currentBalance: 200_000 });

describe('calculateRunway', () => {
  it('shows how long Emergency cash lasts and how long all accessible money lasts', () => {
    const runway = calculateRunway({ accounts: [emergency, savings, isa, gia, pension], profile, livingCostsMonthly: 2_000 });
    expect(runway.emergencyCashMonths).toBe(6);
    expect(runway.accessibleMonths).toBe(12);
  });

  it('spends in order: Emergency cash, other savings, ISAs, GIAs', () => {
    const runway = calculateRunway({ accounts: [gia, isa, pension, savings, emergency], profile, livingCostsMonthly: 2_000 });
    expect(runway.steps.map((step) => step.label)).toEqual(['Emergency cash', 'Other savings', 'ISAs', 'GIAs']);
    expect(runway.steps.map((step) => step.coversThroughMonth)).toEqual([6, 8, 11, 12]);
  });

  it('spends money expected to be received first', () => {
    const runway = calculateRunway({ accounts: [emergency], profile, livingCostsMonthly: 2_000, moneyReceived: 4_000 });
    expect(runway.steps[0].label).toBe('Money you expect to receive');
    expect(runway.emergencyCashMonths).toBe(8);
  });

  it('reports when money runs out and the monthly shortfall', () => {
    const runway = calculateRunway({ accounts: [emergency], profile, livingCostsMonthly: 2_000 });
    expect(runway.runsOutInMonth).toBe(7);
    expect(runway.monthlyShortfall).toBe(2_000);
  });

  it('treats a pension as locked before the access age', () => {
    const runway = calculateRunway({ accounts: [emergency, pension], profile, livingCostsMonthly: 2_000 });
    expect(runway.accessibleMonths).toBe(6);
    expect(runway.pensionIsLocked).toBe(true);
    expect(runway.lockedPensionBalance).toBe(200_000);
    expect(runway.pensionLastResort).toBeNull();
  });

  it('shows a pension as a last resort with the tax after the access age', () => {
    // £24k a year from a £200k pot: £50k of tax-free cash covers the whole first year, so no tax
    const older = { ...profile, currentAge: 60 };
    const small = calculateRunway({ accounts: [emergency, pension], profile: older, livingCostsMonthly: 2_000 });
    expect(small.pensionIsLocked).toBe(false);
    expect(small.accessibleMonths).toBe(6);
    expect(small.pensionLastResort?.monthlyTax).toBeCloseTo(0, 1);
    expect(small.pensionLastResort?.extraMonths).toBe(100);

    // £60k a year from a £100k pot: £25k tax-free, so £35k is taxed with the allowance
    // Tax: (35,000 - 12,570) × 20% is about £4.5k, so it costs more than the £60k needed
    const tighter = makeAccount({ id: 'pe', type: 'pension', currentBalance: 100_000 });
    const big = calculateRunway({ accounts: [tighter], profile: older, livingCostsMonthly: 5_000 });
    expect(big.pensionLastResort!.monthlyTax).toBeGreaterThan(0);
    expect(big.pensionLastResort!.monthlyWithdrawal).toBeGreaterThan(5_000);
    expect(big.pensionLastResort!.monthlyWithdrawal - big.pensionLastResort!.monthlyTax).toBeCloseTo(5_000, 0);
  });

  it('says so when no Emergency cash is marked', () => {
    const runway = calculateRunway({ accounts: [savings], profile, livingCostsMonthly: 2_000 });
    expect(runway.hasEmergencyCash).toBe(false);
    expect(runway.emergencyCashMonths).toBe(0);
    expect(runway.accessibleMonths).toBe(2);
  });
});

describe('runJobLossDrill', () => {
  // Returns are 2.5% with 2.5% inflation, so nothing grows after inflation and the sums are simple
  const flat = (overrides: Partial<Account>) => makeAccount({ annualReturnRate: 2.5, ...overrides });
  const flatEmergency = flat({ id: 'em', type: 'savings', currentBalance: 12_000, isEmergencyCash: true });
  const flatIsa = flat({ id: 'is', type: 'isa', currentBalance: 50_000, monthlyContribution: 500 });
  const allAccounts = [flatEmergency, flatIsa];
  const plan: RetirementPlan = {
    accounts: [flatIsa],
    profile: { ...profile, essentialsMonthly: 500, niceToHavesMonthly: 500 },
    withdrawals: [],
    retirementReturn: 0,
    accountOrder: [],
  };
  const inputs = { ...DEFAULT_DRILL_INPUTS, monthsOutOfWork: 12 };

  it('costs the missed saving when Emergency cash covers the Living costs', () => {
    // 6 months of £2k from Emergency cash, the other 6 from the ISA (£12k), and 12 missed months at £500 (£6k)
    const drill = runJobLossDrill(plan, allAccounts, 2_000, inputs);
    expect(drill.potBefore - drill.potAfter).toBeCloseTo(18_000, 2);
  });

  it('spends money received before anything else', () => {
    const drill = runJobLossDrill(plan, allAccounts, 2_000, { ...inputs, moneyReceived: 12_000 });
    expect(drill.potBefore - drill.potAfter).toBeCloseTo(6_000, 2);
  });

  it('includes lost growth in the cost', () => {
    const growing = flat({ id: 'is', type: 'isa', currentBalance: 50_000, monthlyContribution: 500, annualReturnRate: 7.5 });
    const drill = runJobLossDrill({ ...plan, accounts: [growing] }, [flatEmergency, growing], 2_000, inputs);
    expect(drill.potBefore - drill.potAfter).toBeGreaterThan(18_000);
  });

  it('lowers saving after returning to work', () => {
    // 25 years at £500 is £150k; at 50% it's £75k. One year of the lower saving is missed too
    const drill = runJobLossDrill(plan, [flatIsa], 0, { ...inputs, restartPercent: 50 });
    expect(drill.potBefore - drill.potAfter).toBeCloseTo(75_000 + 3_000, 2);
  });

  it('reports Living costs that nothing can pay', () => {
    const tight = flat({ id: 'is', type: 'isa', currentBalance: 1_000 });
    const drill = runJobLossDrill({ ...plan, accounts: [tight] }, [tight], 2_000, { ...inputs, monthsOutOfWork: 1 });
    expect(drill.unfundedLivingCosts).toBeCloseTo(1_000, 2);
  });

  it('does not take Living costs from a pension', () => {
    const pot = flat({ id: 'pe', type: 'pension', currentBalance: 100_000 });
    const drill = runJobLossDrill({ ...plan, accounts: [pot] }, [pot], 2_000, inputs);
    expect(drill.potAfter).toBeCloseTo(100_000, 2);
    expect(drill.unfundedLivingCosts).toBeCloseTo(24_000, 2);
  });

  it('splits a long time out of work across the years it falls in', () => {
    const drill = runJobLossDrill(plan, [flatIsa], 0, { ...inputs, monthsOutOfWork: 18 });
    expect(drill.potBefore - drill.potAfter).toBeCloseTo(9_000, 2);
    expect(drill.planAfter.withdrawals.map((lump) => lump.age)).toEqual([41, 42]);
  });

  it('leaves the real plan unchanged', () => {
    const before = JSON.stringify(plan);
    runJobLossDrill(plan, allAccounts, 2_000, inputs);
    expect(JSON.stringify(plan)).toBe(before);
  });
});
