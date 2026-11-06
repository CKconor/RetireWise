import { describe, it, expect } from 'vitest';
import { calculateWithdrawalTax, runMonteCarloSimulation, simulateDrawdown, type WithdrawalTaxInput } from '@/lib/drawdown';
import type { Account, DrawdownConfig, UserProfile } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'acc-1',
    name: 'Account',
    type: 'isa',
    currentBalance: 0,
    monthlyContribution: 0,
    annualReturnRate: 7,
    annualContributionIncrease: 0,
    ...overrides,
  };
}

function makeTaxInput(overrides: Partial<WithdrawalTaxInput> = {}): WithdrawalTaxInput {
  return {
    withdrawals: {},
    accounts: [],
    accountRetirementBalances: {},
    accountTotalContributed: {},
    sippTaxFreeUsed: {},
    statePensionIncome: 0,
    taxModeling: true,
    ...overrides,
  };
}

// ─── calculateWithdrawalTax ───────────────────────────────────────────────────

describe('calculateWithdrawalTax', () => {
  describe('taxModeling disabled', () => {
    it('returns zero taxes and passes through sippTaxFreeUsed unchanged', () => {
      const sippUsed = { 'acc-1': 5_000 };
      const result = calculateWithdrawalTax(
        makeTaxInput({ taxModeling: false, sippTaxFreeUsed: sippUsed })
      );
      expect(result.totalTax).toBe(0);
      expect(result.withdrawalTax).toBe(0);
      expect(result.updatedSippTaxFreeUsed).toBe(sippUsed);
    });
  });

  describe('ISA / savings withdrawals', () => {
    it('are completely tax-free', () => {
      const isa = makeAccount({ id: 'isa-1', type: 'isa' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'isa-1': 20_000 },
          accounts: [isa],
        })
      );
      expect(result.totalTax).toBe(0);
      expect(result.withdrawalTax).toBe(0);
    });

    it('savings account withdrawals are tax-free', () => {
      const sav = makeAccount({ id: 'sav-1', type: 'savings' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'sav-1': 15_000 },
          accounts: [sav],
        })
      );
      expect(result.totalTax).toBe(0);
    });
  });

  describe('GIA withdrawals (CGT)', () => {
    it('applies CGT only to the gain portion', () => {
      // GIA: retirement balance £100k, contributed £60k → 40% gain
      // Withdrawal: £10k → gains = £4k
      // After £3k CGT allowance: taxable = £1k → CGT at 18% = £180
      const gia = makeAccount({ id: 'gia-1', type: 'gia' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'gia-1': 10_000 },
          accounts: [gia],
          accountRetirementBalances: { 'gia-1': 100_000 },
          accountTotalContributed: { 'gia-1': 60_000 },
        })
      );
      expect(result.totalTax).toBeCloseTo(180, 0);
      expect(result.withdrawalTax).toBeCloseTo(180, 0);
    });

    it('applies the CGT annual allowance across the full withdrawal', () => {
      // GIA: 100% gain (contributed 0). Withdrawal: £3 000 exactly
      // Gains = £3k — equals allowance exactly → CGT = 0
      const gia = makeAccount({ id: 'gia-1', type: 'gia' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'gia-1': 3_000 },
          accounts: [gia],
          accountRetirementBalances: { 'gia-1': 50_000 },
          accountTotalContributed: { 'gia-1': 0 },
        })
      );
      expect(result.totalTax).toBe(0);
    });

    it('charges 18% on gains within the unused basic rate band', () => {
      // 100% gain, withdrawal £13k → gains £13k, after £3k allowance = £10k taxable → £1.8k CGT
      const gia = makeAccount({ id: 'gia-1', type: 'gia' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'gia-1': 13_000 },
          accounts: [gia],
          accountRetirementBalances: { 'gia-1': 50_000 },
          accountTotalContributed: { 'gia-1': 0 },
        })
      );
      expect(result.totalTax).toBeCloseTo(1_800, 2);
    });

    it('charges 24% on gains above the basic rate band', () => {
      // Income of £60k has used the whole basic rate band: £10k taxable gains → £2.4k CGT
      const gia = makeAccount({ id: 'gia-1', type: 'gia' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'gia-1': 13_000 },
          accounts: [gia],
          accountRetirementBalances: { 'gia-1': 50_000 },
          accountTotalContributed: { 'gia-1': 0 },
          statePensionIncome: 60_000,
        })
      );
      expect(result.withdrawalTax).toBeCloseTo(2_400, 2);
    });

    it('splits gains that straddle the basic rate band', () => {
      // £40k income → £27,430 taxable, £10,270 of band unused. £20k taxable gains:
      // £10,270 at 18% + £9,730 at 24% = £4,183.80
      const gia = makeAccount({ id: 'gia-1', type: 'gia' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'gia-1': 23_000 },
          accounts: [gia],
          accountRetirementBalances: { 'gia-1': 50_000 },
          accountTotalContributed: { 'gia-1': 0 },
          statePensionIncome: 40_000,
        })
      );
      expect(result.withdrawalTax).toBeCloseTo(4_183.8, 2);
    });
  });

  describe('Income tax bands', () => {
    // Statutory figures from the 2026/27 bands, England, Wales and Northern Ireland
    it.each([
      [100_000, 27_432],
      [116_760, 37_488],
      [120_000, 39_432],
      [125_140, 42_516],
      [150_000, 53_703],
    ])('charges the statutory tax on £%i of income', (income, tax) => {
      const pension = makeAccount({ id: 'pen-1', type: 'pension' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'pen-1': income },
          accounts: [pension],
          accountRetirementBalances: { 'pen-1': 0 },
        })
      );
      expect(result.totalTax).toBeCloseTo(tax, 2);
    });
  });

  describe('Lump sum allowance', () => {
    it('caps tax-free pension cash at £268,275 across all pensions', () => {
      const first = makeAccount({ id: 'pen-1', type: 'pension' });
      const second = makeAccount({ id: 'pen-2', type: 'sipp' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'pen-1': 300_000, 'pen-2': 300_000 },
          accounts: [first, second],
          accountRetirementBalances: { 'pen-1': 1_200_000, 'pen-2': 1_200_000 },
        })
      );
      const taxFree = Object.values(result.updatedSippTaxFreeUsed).reduce((sum, used) => sum + used, 0);
      expect(taxFree).toBe(268_275);
    });
  });

  describe('Pension / SIPP withdrawals', () => {
    it('allows 25% of the pot tax-free', () => {
      // Pot: £100k → tax-free allowance = £25k
      // Withdrawal: £20k — fully within tax-free allowance → no taxable income
      const pension = makeAccount({ id: 'pen-1', type: 'pension' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'pen-1': 20_000 },
          accounts: [pension],
          accountRetirementBalances: { 'pen-1': 100_000 },
        })
      );
      expect(result.withdrawalTax).toBe(0);
    });

    it('taxes the portion above the 25% tax-free lump sum', () => {
      // Pot: £100k → tax-free = £25k.  Withdrawal: £50k → taxable = £25k
      // Income tax on £25k: (25 000 - 12 570) * 20% = £2 486
      const pension = makeAccount({ id: 'pen-1', type: 'pension' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'pen-1': 50_000 },
          accounts: [pension],
          accountRetirementBalances: { 'pen-1': 100_000 },
        })
      );
      const expectedTax = (25_000 - 12_570) * 0.2;
      expect(result.withdrawalTax).toBeCloseTo(expectedTax, 0);
    });

    it('tracks previously used tax-free amount and does not double-count it', () => {
      // Pot: £100k → tax-free = £25k. Already used £20k. Remaining: £5k.
      // Withdrawal: £10k → first £5k tax-free, remaining £5k taxable
      // Income tax on £5k: (5 000 - 12 570) → below PA → £0
      const pension = makeAccount({ id: 'pen-1', type: 'pension' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'pen-1': 10_000 },
          accounts: [pension],
          accountRetirementBalances: { 'pen-1': 100_000 },
          sippTaxFreeUsed: { 'pen-1': 20_000 },
        })
      );
      expect(result.withdrawalTax).toBe(0);
      expect(result.updatedSippTaxFreeUsed['pen-1']).toBe(25_000);
    });

    it('updates updatedSippTaxFreeUsed after withdrawal', () => {
      const pension = makeAccount({ id: 'pen-1', type: 'pension' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'pen-1': 10_000 },
          accounts: [pension],
          accountRetirementBalances: { 'pen-1': 100_000 },
          sippTaxFreeUsed: {},
        })
      );
      // First £10k is within the £25k allowance
      expect(result.updatedSippTaxFreeUsed['pen-1']).toBe(10_000);
    });
  });

  describe('State pension interaction', () => {
    it('state pension below personal allowance leaves full allowance for withdrawals', () => {
      // State pension: £11 502 (below £12 570 PA) → no tax consumed by state pension
      // Pension withdrawal: £30k from £100k pot → tax-free = £25k → taxable = £5k
      // Combined taxable income: 11 502 + 5 000 = £16 502
      // Income tax: (16 502 - 12 570) * 20% = 3 932 * 20% = £786.40
      // State pension tax alone: £0 (below PA)
      // withdrawalTax = 786.40 - 0 = £786.40
      const pension = makeAccount({ id: 'pen-1', type: 'pension' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'pen-1': 30_000 },
          accounts: [pension],
          accountRetirementBalances: { 'pen-1': 100_000 },
          statePensionIncome: 11_502,
        })
      );
      const expectedWithdrawalTax = (11_502 + 5_000 - 12_570) * 0.2;
      expect(result.withdrawalTax).toBeCloseTo(expectedWithdrawalTax, 0);
    });

    it('ISA withdrawal is still tax-free even with high state pension income', () => {
      const isa = makeAccount({ id: 'isa-1', type: 'isa' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'isa-1': 20_000 },
          accounts: [isa],
          statePensionIncome: 15_000,
        })
      );
      expect(result.withdrawalTax).toBe(0);
    });

    it('applies personal allowance taper for high combined income', () => {
      const pension = makeAccount({ id: 'pen-1', type: 'pension' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'pen-1': 115_000 },
          accounts: [pension],
          accountRetirementBalances: { 'pen-1': 100_000 },
          statePensionIncome: 20_000,
        })
      );

      // Combined taxable income = £110k, so PA tapers from £12,570 to £7,570.
      // Total tax at £110k with tapered PA = £33,432.
      // State pension-only tax (£20k) = (£20,000 - £12,570) * 20% = £1,486.
      // Withdrawal tax should be the incremental amount.
      expect(result.totalTax).toBeCloseTo(33_432, 0);
      expect(result.withdrawalTax).toBeCloseTo(31_946, 0);
    });
  });
});

// ─── Reporting shortfalls ────────────────────────────────────────────────────

describe('simulateDrawdown shortfalls', () => {
  const profile: UserProfile = {
    birthday: '1976-01-01',
    currentAge: 50,
    retirementAge: 50,
    targetAmount: 500_000,
    expectedInflation: 2.5,
    annualSalary: 0,
    statePensionAmount: 241.3,
    statePensionAge: 68,
    includeStatePension: false,
  };
  const config: DrawdownConfig = {
    strategy: 'fixed',
    fixedAnnualIncome: 20_000,
    withdrawalRate: 4,
    drawdownReturnRate: 0,
    accountOrder: [],
    planningHorizon: 52,
    taxModeling: false,
  };

  it('reports money running out in the final year of the plan', () => {
    const isa = makeAccount({ id: 'isa-1', type: 'isa', currentBalance: 30_000 });
    const result = simulateDrawdown([isa], profile, config);
    expect(result.depletionAge).toBe(51);
    expect(result.firstShortfallAge).toBe(51);
    expect(result.years[1].shortfall).toBeCloseTo(10_000, 2);
  });

  it('does not report a plan paid in full, even if it ends on exactly nothing', () => {
    const isa = makeAccount({ id: 'isa-1', type: 'isa', currentBalance: 40_000 });
    const result = simulateDrawdown([isa], profile, config);
    expect(result.depletionAge).toBeNull();
    expect(result.firstShortfallAge).toBeNull();
  });

  it('reports a shortfall while the pension is locked, without calling the money gone', () => {
    const isa = makeAccount({ id: 'isa-1', type: 'isa', currentBalance: 10_000 });
    const pension = makeAccount({ id: 'pen-1', type: 'pension', currentBalance: 500_000 });
    const result = simulateDrawdown([isa, pension], profile, config);
    expect(result.firstShortfallAge).toBe(50);
    expect(result.years[0].shortfall).toBeCloseTo(10_000, 2);
    expect(result.depletionAge).toBeNull();
  });

  it('does not count a plan with a locked-pension shortfall as a Monte Carlo success', () => {
    const isa = makeAccount({ id: 'isa-1', type: 'isa', currentBalance: 10_000 });
    const pension = makeAccount({ id: 'pen-1', type: 'pension', currentBalance: 500_000 });
    const result = runMonteCarloSimulation([isa, pension], profile, config, 20, 0);
    expect(result.successRate).toBe(0);
  });
});

// ─── Lump sums and the taxable gain ──────────────────────────────────────────

describe('simulateDrawdown lump sums', () => {
  const profile: UserProfile = {
    birthday: '1976-01-01',
    currentAge: 50,
    retirementAge: 50,
    targetAmount: 500_000,
    expectedInflation: 2.5,
    annualSalary: 0,
    statePensionAmount: 241.3,
    statePensionAge: 68,
    includeStatePension: false,
  };
  const config: DrawdownConfig = {
    strategy: 'fixed',
    fixedAnnualIncome: 10_000,
    withdrawalRate: 4,
    drawdownReturnRate: 0,
    accountOrder: [],
    planningHorizon: 53,
    taxModeling: false,
  };

  it('applies a withdrawal dated after retirement', () => {
    const isa = makeAccount({ id: 'isa-1', currentBalance: 100_000 });
    const roof = { id: 'w1', name: 'Roof', amount: 30_000, age: 51, accountId: 'isa-1' };
    const result = simulateDrawdown([isa], profile, config, undefined, [roof]);
    expect(result.years.map((year) => year.portfolioBalance)).toEqual([90_000, 50_000, 40_000]);
  });

  it('applies a deposit dated after retirement', () => {
    const isa = makeAccount({ id: 'isa-1', currentBalance: 100_000 });
    const gift = { id: 'w1', name: 'Gift', amount: 30_000, age: 51, accountId: 'isa-1', type: 'deposit' as const };
    const result = simulateDrawdown([isa], profile, config, undefined, [gift]);
    expect(result.years.at(-1)!.portfolioBalance).toBe(100_000);
  });
});

describe('simulateDrawdown taxable GIA gain', () => {
  const profile: UserProfile = {
    birthday: '1986-01-01',
    currentAge: 39,
    retirementAge: 41,
    targetAmount: 500_000,
    expectedInflation: 2.5,
    annualSalary: 0,
    statePensionAmount: 241.3,
    statePensionAge: 68,
    includeStatePension: false,
  };
  const config: DrawdownConfig = {
    strategy: 'percentage',
    fixedAnnualIncome: 0,
    withdrawalRate: 100,
    drawdownReturnRate: 0,
    accountOrder: [],
    planningHorizon: 42,
    taxModeling: true,
  };

  it('counts contribution changes as money paid in, not gain', () => {
    // No return after inflation, so everything withdrawn is money paid in
    const gia = makeAccount({
      id: 'gia-1',
      type: 'gia',
      monthlyContribution: 0,
      annualReturnRate: 2.5,
      contributionChanges: [{ id: 'c1', age: 40, monthlyContribution: 1_000 }],
    });
    expect(simulateDrawdown([gia], profile, config).totalTaxPaid).toBe(0);
  });

  it('counts a deposit as money paid in, not gain', () => {
    const gia = makeAccount({ id: 'gia-1', type: 'gia', annualReturnRate: 2.5 });
    const deposit = { id: 'w1', name: 'Gift', amount: 20_000, age: 40, accountId: 'gia-1', type: 'deposit' as const };
    expect(simulateDrawdown([gia], profile, config, undefined, [deposit]).totalTaxPaid).toBe(0);
  });

  it('keeps the share of gain the same after a withdrawal', () => {
    // Withdrawing half of a grown pot should leave half the money paid in, so the same
    // share of what remains is gain. CGT is then on that gain, less the £3k allowance, at 18%.
    const oneYear = { ...profile, currentAge: 40 };
    const growing = makeAccount({ id: 'gia-1', type: 'gia', currentBalance: 100_000, annualReturnRate: 15 });
    const half = { id: 'w1', name: 'Roof', amount: 0, age: 41, accountId: 'gia-1' };
    const balance = simulateDrawdown([growing], oneYear, config).years[0].grossWithdrawal;
    half.amount = balance / 2;
    const result = simulateDrawdown([growing], oneYear, config, undefined, [half]);
    const remaining = result.years[0].grossWithdrawal;
    const gain = remaining * (1 - 100_000 / balance);
    expect(result.totalTaxPaid).toBeCloseTo((gain - 3_000) * 0.18, 2);
  });
});

describe('runMonteCarloSimulation lowest income', () => {
  it('reports the lowest yearly income of a percentage strategy', () => {
    const profile: UserProfile = {
      birthday: '1976-01-01',
      currentAge: 60,
      retirementAge: 60,
      targetAmount: 500_000,
      expectedInflation: 2.5,
      annualSalary: 0,
      statePensionAmount: 241.3,
      statePensionAge: 68,
      includeStatePension: false,
    };
    const config: DrawdownConfig = {
      strategy: 'percentage',
      fixedAnnualIncome: 0,
      withdrawalRate: 10,
      drawdownReturnRate: 0,
      accountOrder: [],
      planningHorizon: 63,
      taxModeling: false,
    };
    const isa = makeAccount({ id: 'isa-1', currentBalance: 100_000 });
    // No volatility: 10k, then 9k, then 8.1k
    const result = runMonteCarloSimulation([isa], profile, config, 10, 0);
    expect(result.lowestYearlyIncome).toBeCloseTo(8_100, 2);
  });
});
