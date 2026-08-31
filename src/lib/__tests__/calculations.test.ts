import { describe, it, expect } from 'vitest';
import {
  calculateFutureValue,
  adjustForInflation,
  calculateAverageReturnRate,
  calculateProgress,
  calculateRequiredContribution,
  calculateCoastFireNumber,
  getContributionForYear,
  simulateAccountFinalBalance,
  generateProjection,
  generateMonthlyProjection,
} from '@/lib/calculations';
import type { Account, UserProfile } from '@/types';

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

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    birthday: '1990-01-01',
    currentAge: 35,
    retirementAge: 65,
    targetAmount: 1_000_000,
    expectedInflation: 2.5,
    annualSalary: 60_000,
    statePensionAmount: 11_502,
    statePensionAge: 67,
    includeStatePension: false,
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

  it('switches to the step-up amount at the configured age when account/startAge are provided', () => {
    // £500/mo, no growth %, steps up to £800/mo at age 47. Start age 45, run 3 years (36 months).
    // Years 0-1 (age 45, 46) at £500/mo, year 2 onward (age 47+) at £800/mo.
    const account = makeAccount({
      monthlyContribution: 500,
      annualReturnRate: 0,
      contributionChanges: [{ id: 'c1', age: 47, monthlyContribution: 800 }],
    });
    const withStepUp = calculateFutureValue(0, 500, 0, 36, 0, account, 45);
    const withoutStepUp = calculateFutureValue(0, 500, 0, 36, 0);
    expect(withStepUp).toBeGreaterThan(withoutStepUp);
    // Hand-computed: 12 months @ £500, 12 months @ £500, 12 months @ £800 (0% return, so simple sums)
    expect(withStepUp).toBeCloseTo(500 * 24 + 800 * 12, 5);
  });

  it('is unaffected by a step-up on the account when account/startAge are omitted (legacy behavior)', () => {
    const account = makeAccount({
      monthlyContribution: 500,
      contributionChanges: [{ id: 'c1', age: 47, monthlyContribution: 800 }],
    });
    const legacy = calculateFutureValue(0, 500, 6, 24, 0);
    const withAccountButNoStartAge = calculateFutureValue(0, 500, 6, 24, 0, account);
    expect(withAccountButNoStartAge).toBeCloseTo(legacy, 5);
  });
});

// ─── getContributionForYear ───────────────────────────────────────────────────

describe('getContributionForYear', () => {
  it('matches the legacy formula when no step-up is configured', () => {
    const account = makeAccount({ monthlyContribution: 500, annualContributionIncrease: 5 });
    const yearsSinceStart = 3;
    const expected = 500 * Math.pow(1.05, yearsSinceStart);
    expect(getContributionForYear(account, 38, yearsSinceStart)).toBeCloseTo(expected, 5);
  });

  it('uses the pre-step-up amount before the step-up age', () => {
    const account = makeAccount({
      monthlyContribution: 500,
      annualContributionIncrease: 0,
      contributionChanges: [{ id: 'c1', age: 47, monthlyContribution: 800 }],
    });
    expect(getContributionForYear(account, 46, 1)).toBe(500);
  });

  it('switches to the future amount unscaled exactly at the step-up age', () => {
    const account = makeAccount({
      monthlyContribution: 500,
      annualContributionIncrease: 5,
      contributionChanges: [{ id: 'c1', age: 47, monthlyContribution: 800 }],
    });
    expect(getContributionForYear(account, 47, 12)).toBe(800);
  });

  it('compounds the % increase on the new base with the exponent reset after the step-up', () => {
    const account = makeAccount({
      monthlyContribution: 500,
      annualContributionIncrease: 5,
      contributionChanges: [{ id: 'c1', age: 47, monthlyContribution: 800 }],
    });
    // Two years after the step-up age (age 49): exponent = 49 - 47 = 2
    const expected = 800 * Math.pow(1.05, 2);
    expect(getContributionForYear(account, 49, 14)).toBeCloseTo(expected, 5);
  });

  it('uses the most recent applicable change when multiple changes are configured', () => {
    const account = makeAccount({
      monthlyContribution: 500,
      annualContributionIncrease: 0,
      contributionChanges: [
        { id: 'c1', age: 40, monthlyContribution: 700 },
        { id: 'c2', age: 47, monthlyContribution: 800 },
        { id: 'c3', age: 55, monthlyContribution: 1000 },
      ],
    });
    expect(getContributionForYear(account, 38, 3)).toBe(500);
    expect(getContributionForYear(account, 45, 10)).toBe(700);
    expect(getContributionForYear(account, 50, 15)).toBe(800);
    expect(getContributionForYear(account, 60, 25)).toBe(1000);
  });

  it('ignores contribution changes that have not been reached yet, regardless of array order', () => {
    const account = makeAccount({
      monthlyContribution: 500,
      contributionChanges: [
        { id: 'c1', age: 55, monthlyContribution: 1000 },
        { id: 'c2', age: 47, monthlyContribution: 800 },
      ],
    });
    expect(getContributionForYear(account, 50, 15)).toBe(800);
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

// ─── Contribution Step-Up across the projection engines ───────────────────────

describe('Contribution Step-Up integration', () => {
  // "Mortgage ends at 47" scenario: £500/mo -> £800/mo at age 47, 0% return isolates the contribution effect.
  function stepUpAccount(): Account {
    return makeAccount({
      currentBalance: 0,
      monthlyContribution: 500,
      annualReturnRate: 0,
      annualContributionIncrease: 0,
      contributionChanges: [{ id: 'c1', age: 47, monthlyContribution: 800 }],
    });
  }

  it('simulateAccountFinalBalance reflects the higher contribution from the step-up age onward', () => {
    const profile = makeProfile({ currentAge: 45, retirementAge: 50 });
    const withStepUp = simulateAccountFinalBalance(stepUpAccount(), 5, profile.currentAge, 0, []);
    const withoutStepUp = simulateAccountFinalBalance(
      makeAccount({ monthlyContribution: 500, annualReturnRate: 0 }),
      5,
      profile.currentAge,
      0,
      []
    );
    expect(withStepUp).toBeGreaterThan(withoutStepUp);
    // Ages 46-50: years 1-2 at £500/mo (age 46,47 boundary happens at year 2 -> age 47), years 3-5 at £800/mo
    // year=1 -> age 46 (£500), year=2 -> age 47 (£800), year=3 -> age 48 (£800), year=4 -> age 49 (£800), year=5 -> age 50 (£800)
    const expected = 500 * 12 + 800 * 12 * 4;
    expect(withStepUp).toBeCloseTo(expected, 0);
  });

  it('generateProjection applies the step-up uniformly across all scenarios', () => {
    const profile = makeProfile({ currentAge: 45, retirementAge: 50 });
    const points = generateProjection([stepUpAccount()], profile, []);
    const lastPoint = points[points.length - 1];
    expect(lastPoint.age).toBe(50);

    const scenarioKeys: (keyof typeof lastPoint)[] = [
      'total', 'totalReal', 'overperformanceReal', 'underperformanceReal', 'p90Real', 'p10Real',
    ];
    // With 0% base return, all scenarios still get boosted equally by the higher contribution total,
    // so every scenario key should exceed what a flat £500/mo account would produce for the same span.
    const flatPoints = generateProjection(
      [makeAccount({ monthlyContribution: 500, annualReturnRate: 0 })],
      profile,
      []
    );
    const flatLastPoint = flatPoints[flatPoints.length - 1];
    for (const key of scenarioKeys) {
      expect(lastPoint[key] as number).toBeGreaterThan(flatLastPoint[key] as number);
    }
  });

  it('generateMonthlyProjection switches to the new contribution once the account holder reaches the step-up age', () => {
    const profile = makeProfile({
      birthday: `${new Date().getFullYear() - 45}-01-01`,
      currentAge: 45,
      retirementAge: 50,
    });
    const points = generateMonthlyProjection([stepUpAccount()], profile);
    const preStepUp = points.find((p) => p.age === 46);
    const postStepUp = points.find((p) => p.age === 47);
    expect(preStepUp).toBeDefined();
    expect(postStepUp).toBeDefined();
    // Balance growth per month should be higher once the step-up has taken effect.
    const idxPre = points.indexOf(preStepUp!);
    const idxPost = points.indexOf(postStepUp!);
    const preMonthlyDelta = points[idxPre + 1].total - points[idxPre].total;
    const postMonthlyDelta = points[idxPost + 1].total - points[idxPost].total;
    expect(postMonthlyDelta).toBeGreaterThan(preMonthlyDelta);
  });
});
