import { Account, UserProfile, ProjectionDataPoint, AccountProjection } from '@/types';

/**
 * Calculate the future value of an account with monthly compounding
 */
export function calculateFutureValue(
  currentBalance: number,
  monthlyContribution: number,
  annualReturnRate: number,
  months: number
): number {
  const monthlyRate = annualReturnRate / 100 / 12;
  let balance = currentBalance;

  for (let i = 0; i < months; i++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
  }

  return balance;
}

/**
 * Adjust a future value to today's money using inflation
 */
export function adjustForInflation(
  futureValue: number,
  years: number,
  inflationRate: number
): number {
  if (inflationRate <= 0 || years <= 0) return futureValue;
  return futureValue / Math.pow(1 + inflationRate / 100, years);
}

/**
 * Calculate real return rate (nominal - inflation)
 */
export function calculateRealReturn(
  nominalRate: number,
  inflationRate: number
): number {
  // Fisher equation approximation: real ≈ nominal - inflation
  return nominalRate - inflationRate;
}

/**
 * Generate projection data points for charting
 */
export function generateProjection(
  accounts: Account[],
  profile: UserProfile
): ProjectionDataPoint[] {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return [];

  const currentYear = new Date().getFullYear();
  const dataPoints: ProjectionDataPoint[] = [];

  for (let year = 0; year <= yearsToRetirement; year++) {
    const months = year * 12;
    const age = profile.currentAge + year;

    let total = 0;
    const dataPoint: ProjectionDataPoint = {
      year: currentYear + year,
      age,
      label: `Y${year}`,
      total: 0,
      totalReal: 0,
    };

    for (const account of accounts) {
      const value = calculateFutureValue(
        account.currentBalance,
        account.monthlyContribution,
        account.annualReturnRate,
        months
      );
      dataPoint[account.id] = Math.round(value);
      total += value;
    }

    dataPoint.total = Math.round(total);
    dataPoint.totalReal = Math.round(
      adjustForInflation(total, year, profile.expectedInflation)
    );
    dataPoints.push(dataPoint);
  }

  return dataPoints;
}

/**
 * Calculate projections for each account at retirement
 */
export function calculateAccountProjections(
  accounts: Account[],
  profile: UserProfile
): AccountProjection[] {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return [];

  const months = yearsToRetirement * 12;

  return accounts.map((account) => {
    const projectedValue = calculateFutureValue(
      account.currentBalance,
      account.monthlyContribution,
      account.annualReturnRate,
      months
    );
    const projectedValueReal = adjustForInflation(
      projectedValue,
      yearsToRetirement,
      profile.expectedInflation
    );
    const growth = projectedValueReal - account.currentBalance;
    const growthPercentage =
      account.currentBalance > 0
        ? ((projectedValueReal - account.currentBalance) / account.currentBalance) * 100
        : projectedValueReal > 0
        ? 100
        : 0;

    return {
      accountId: account.id,
      accountName: account.name,
      projectedValue: Math.round(projectedValue),
      projectedValueReal: Math.round(projectedValueReal),
      growth: Math.round(growth),
      growthPercentage: Math.round(growthPercentage),
    };
  });
}

/**
 * Calculate total current balance across all accounts
 */
export function calculateTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.currentBalance, 0);
}

/**
 * Calculate total monthly contributions across all accounts
 */
export function calculateTotalContributions(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.monthlyContribution, 0);
}

/**
 * Calculate projected total at retirement (nominal)
 */
export function calculateProjectedTotal(
  accounts: Account[],
  profile: UserProfile
): number {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return calculateTotalBalance(accounts);

  const months = yearsToRetirement * 12;
  let total = 0;

  for (const account of accounts) {
    total += calculateFutureValue(
      account.currentBalance,
      account.monthlyContribution,
      account.annualReturnRate,
      months
    );
  }

  return Math.round(total);
}

/**
 * Calculate projected total at retirement (inflation-adjusted / real terms)
 */
export function calculateProjectedTotalReal(
  accounts: Account[],
  profile: UserProfile
): number {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  const nominalTotal = calculateProjectedTotal(accounts, profile);
  return Math.round(adjustForInflation(nominalTotal, yearsToRetirement, profile.expectedInflation));
}

/**
 * Calculate progress percentage toward target
 */
export function calculateProgress(
  projectedTotalReal: number,
  targetAmount: number
): number {
  if (targetAmount <= 0) return 0;
  return Math.min(100, (projectedTotalReal / targetAmount) * 100);
}

/**
 * Calculate additional monthly contribution needed to reach target
 */
export function calculateRequiredContribution(
  currentTotal: number,
  targetAmount: number,
  yearsToRetirement: number,
  averageReturnRate: number,
  inflationRate: number
): number {
  if (yearsToRetirement <= 0) return 0;

  const months = yearsToRetirement * 12;
  const realReturn = averageReturnRate - inflationRate;
  const monthlyRate = realReturn / 100 / 12;

  // Future value of current balance
  const fvCurrent = currentTotal * Math.pow(1 + monthlyRate, months);

  // Amount still needed
  const amountNeeded = targetAmount - fvCurrent;
  if (amountNeeded <= 0) return 0;

  // Calculate required monthly contribution using annuity formula
  // FV = PMT * ((1 + r)^n - 1) / r
  // PMT = FV * r / ((1 + r)^n - 1)
  if (monthlyRate === 0) {
    return amountNeeded / months;
  }

  const factor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
  return Math.ceil(amountNeeded / factor);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large currency values compactly
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `£${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `£${(amount / 1000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
}
