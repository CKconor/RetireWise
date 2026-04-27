import { describe, it, expect } from 'vitest';
import {
  calculateFutureValue,
  adjustForInflation,
  calculateAverageReturnRate,
  calculateProgress,
  calculateRequiredContribution,
  calculateCoastFireNumber,
} from '@/lib/calculations';
import type { Account } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'ISA',
    type: 'isa',
    currentBalance: 0,
    monthlyContribution: 0,
    annualReturnRate: 7,
    annualContributionIncrease: 0,
    ...overrides,
  };
}

// ─── calculateFutureValue ─────────────────────────────────────────────────────

describe('calculateFutureValue', () => {
  it('returns the starting balance unchanged when rate and contribution are both zero', () => {
    expect(calculateFutureValue(10_000, 0, 0, 12)).toBe(10_000);
  });

  it('compounds a lump sum with no contributions', () => {
    // 10 000 @ 12% annual (1%/month) for 12 months
    const expected = 10_000 * Math.pow(1.01, 12);
    expect(calculateFutureValue(10_000, 0, 12, 12)).toBeCloseTo(expected, 0);
  });

  it('accumulates monthly contributions from zero balance', () => {
    // £500/month @ 6% annual (0.5%/month) for 12 months
    // Standard annuity-due: each contribution compounds for the remaining months
    const r = 0.06 / 12;
    let expected = 0;
    for (let i = 0; i < 12; i++) {
      expected = (expected + 500) * (1 + r);
    }
    expect(calculateFutureValue(0, 500, 6, 12)).toBeCloseTo(expected, 0);
  });

  it('increases contributions annually when annualContributionIncrease is set', () => {
    // Without increase, 24 months at £1 000/month should give less than with 5% annual increase
    const withoutIncrease = calculateFutureValue(0, 1_000, 7, 24, 0);
    const withIncrease    = calculateFutureValue(0, 1_000, 7, 24, 5);
    expect(withIncrease).toBeGreaterThan(withoutIncrease);
  });

  it('returns 0 for 0 months', () => {
    expect(calculateFutureValue(50_000, 500, 7, 0)).toBe(50_000);
  });
});

// ─── adjustForInflation ───────────────────────────────────────────────────────

describe('adjustForInflation', () => {
  it('returns the value unchanged when inflation is zero', () => {
    expect(adjustForInflation(100_000, 20, 0)).toBe(100_000);
  });

  it('deflates a future value by the correct factor', () => {
    // £100k in 10 years at 2.5% inflation => real value = 100 000 / 1.025^10
    const expected = 100_000 / Math.pow(1.025, 10);
    expect(adjustForInflation(100_000, 10, 2.5)).toBeCloseTo(expected, 0);
  });

  it('returns the value unchanged when years is zero', () => {
    expect(adjustForInflation(50_000, 0, 3)).toBe(50_000);
  });
});

// ─── calculateAverageReturnRate ───────────────────────────────────────────────

describe('calculateAverageReturnRate', () => {
  it('returns the default rate when there are no accounts', () => {
    expect(calculateAverageReturnRate([], 7)).toBe(7);
  });

  it('returns the sole account rate when there is one account', () => {
    const acc = makeAccount({ currentBalance: 10_000, annualReturnRate: 8 });
    expect(calculateAverageReturnRate([acc])).toBeCloseTo(8, 5);
  });

  it('weights by balance, not by count', () => {
    const large  = makeAccount({ id: 'a', currentBalance: 90_000, annualReturnRate: 10 });
    const small  = makeAccount({ id: 'b', currentBalance: 10_000, annualReturnRate: 4 });
    // Expected: (90 000 * 10 + 10 000 * 4) / 100 000 = 9.4
    expect(calculateAverageReturnRate([large, small])).toBeCloseTo(9.4, 5);
  });

  it('falls back to simple average when all balances are zero', () => {
    const a = makeAccount({ id: 'a', currentBalance: 0, annualReturnRate: 6 });
    const b = makeAccount({ id: 'b', currentBalance: 0, annualReturnRate: 10 });
    expect(calculateAverageReturnRate([a, b])).toBeCloseTo(8, 5);
  });
});

// ─── calculateProgress ───────────────────────────────────────────────────────

describe('calculateProgress', () => {
  it('returns 0 when target is 0', () => {
    expect(calculateProgress(500_000, 0)).toBe(0);
  });

  it('returns the correct percentage', () => {
    expect(calculateProgress(250_000, 1_000_000)).toBeCloseTo(25, 5);
  });

  it('caps at 100 even when projected exceeds target', () => {
    expect(calculateProgress(1_200_000, 1_000_000)).toBe(100);
  });
});

// ─── calculateRequiredContribution ───────────────────────────────────────────

describe('calculateRequiredContribution', () => {
  it('returns 0 when already on track to hit target', () => {
    // £800k now, target £500k — already ahead
    const result = calculateRequiredContribution(800_000, 500_000, 10, 7, 2.5);
    expect(result).toBe(0);
  });

  it('returns 0 when years to retirement is 0', () => {
    expect(calculateRequiredContribution(0, 1_000_000, 0, 7, 2.5)).toBe(0);
  });

  it('returns a positive monthly amount when below target', () => {
    const result = calculateRequiredContribution(0, 500_000, 20, 7, 2.5);
    expect(result).toBeGreaterThan(0);
  });

  it('requires more contribution with less time', () => {
    const shortTime = calculateRequiredContribution(10_000, 500_000, 10, 7, 2.5);
    const longTime  = calculateRequiredContribution(10_000, 500_000, 30, 7, 2.5);
    expect(shortTime).toBeGreaterThan(longTime);
  });

  it('handles a zero real return rate (straight-line division)', () => {
    // real return = 7% - 7% = 0. Target 120k, 10 years = 120 months.
    // FV of 0 balance at 0% = 0. Need £120k / 120 months = £1000/month
    const result = calculateRequiredContribution(0, 120_000, 10, 7, 7);
    expect(result).toBeCloseTo(1_000, 0);
  });
});

// ─── calculateCoastFireNumber ─────────────────────────────────────────────────

describe('calculateCoastFireNumber', () => {
  it('returns a positive number', () => {
    const profile = {
      currentAge: 35,
      retirementAge: 65,
      targetAmount: 1_000_000,
      expectedInflation: 2.5,
      statePensionEnabled: false,
      statePensionAge: 67,
      statePensionAmount: 11502,
    };
    const result = calculateCoastFireNumber(profile, 4.5);
    expect(result).toBeGreaterThan(0);
  });

  it('is smaller than the target amount (compound growth does the work)', () => {
    const profile = {
      currentAge: 35,
      retirementAge: 65,
      targetAmount: 1_000_000,
      expectedInflation: 2.5,
      statePensionEnabled: false,
      statePensionAge: 67,
      statePensionAmount: 11502,
    };
    const coastNumber = calculateCoastFireNumber(profile, 4.5);
    expect(coastNumber).toBeLessThan(1_000_000);
  });

  it('decreases as years to retirement increase (more compounding time needed)', () => {
    const base = {
      targetAmount: 1_000_000,
      expectedInflation: 2.5,
      statePensionEnabled: false as const,
      statePensionAge: 67,
      statePensionAmount: 11502,
    };
    const younger = calculateCoastFireNumber({ ...base, currentAge: 25, retirementAge: 65 }, 4.5);
    const older   = calculateCoastFireNumber({ ...base, currentAge: 45, retirementAge: 65 }, 4.5);
    expect(younger).toBeLessThan(older);
  });
});
