import { describe, it, expect } from 'vitest';
import { calculateWithdrawalTax, type WithdrawalTaxInput } from '@/lib/drawdown';
import type { Account } from '@/types';

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
      // After £3k CGT allowance: taxable = £1k → CGT = £100
      const gia = makeAccount({ id: 'gia-1', type: 'gia' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'gia-1': 10_000 },
          accounts: [gia],
          accountRetirementBalances: { 'gia-1': 100_000 },
          accountTotalContributed: { 'gia-1': 60_000 },
        })
      );
      expect(result.totalTax).toBeCloseTo(100, 0);
      expect(result.withdrawalTax).toBeCloseTo(100, 0);
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

    it('uses 10% CGT rate on taxable gains', () => {
      // 100% gain, withdrawal £13k → gains £13k, after £3k allowance = £10k taxable → £1k CGT
      const gia = makeAccount({ id: 'gia-1', type: 'gia' });
      const result = calculateWithdrawalTax(
        makeTaxInput({
          withdrawals: { 'gia-1': 13_000 },
          accounts: [gia],
          accountRetirementBalances: { 'gia-1': 50_000 },
          accountTotalContributed: { 'gia-1': 0 },
        })
      );
      expect(result.totalTax).toBeCloseTo(1_000, 0);
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
  });
});
