import { Account, UserProfile, ProjectionDataPoint, MonthlyProjectionDataPoint, AccountProjection, Milestone, StressTestResult, NetWorthSnapshot, LumpSumWithdrawal } from '@/types';
import { PRIVATE_PENSION_ACCESS_AGE } from '@/lib/constants';

/**
 * Calculate age in whole years from a birthday string (YYYY-MM-DD).
 * Returns the floor — age increments on the birthday each year.
 */
export function calculateAgeFromBirthday(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate the future value of an account with monthly compounding
 */
export function calculateFutureValue(
  currentBalance: number,
  monthlyContribution: number,
  annualReturnRate: number,
  months: number,
  annualContributionIncrease: number = 0
): number {
  const monthlyRate = annualReturnRate / 100 / 12;
  let balance = currentBalance;
  let currentContribution = monthlyContribution;

  for (let i = 0; i < months; i++) {
    if (i > 0 && i % 12 === 0 && annualContributionIncrease > 0) {
      currentContribution = monthlyContribution * Math.pow(1 + annualContributionIncrease / 100, i / 12);
    }
    balance = (balance + currentContribution) * (1 + monthlyRate);
  }

  return balance;
}

/**
 * Simulate an account's balance year-by-year, applying lump sum withdrawals at the correct age.
 * Returns the final balance at the end of the given number of years.
 * Uses the correct contribution for each year accounting for annualContributionIncrease.
 */
export function simulateAccountFinalBalance(
  account: Account,
  yearsToRetirement: number,
  currentAge: number,
  annualRate: number,
  withdrawals: LumpSumWithdrawal[]
): number {
  const increase = account.annualContributionIncrease ?? 0;
  let balance = account.currentBalance;

  for (let year = 1; year <= yearsToRetirement; year++) {
    const age = currentAge + year;
    // Contribution for this year — increases by annualContributionIncrease each year
    const yearlyContrib = account.monthlyContribution * Math.pow(1 + increase / 100, year - 1);
    balance = calculateFutureValue(balance, yearlyContrib, annualRate, 12, 0);

    // Apply any withdrawals scheduled at this age for this account
    for (const w of withdrawals) {
      if (w.age === age && w.accountId === account.id) {
        balance = Math.max(0, balance - w.amount);
      }
    }
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
 * Get years until retirement
 */
export function getYearsToRetirement(profile: UserProfile): number {
  return Math.max(0, profile.retirementAge - profile.currentAge);
}

/**
 * Get months until retirement
 */
export function getMonthsToRetirement(profile: UserProfile): number {
  return getYearsToRetirement(profile) * 12;
}

/**
 * Calculate average return rate across all accounts, weighted by balance
 */
export function calculateAverageReturnRate(accounts: Account[], defaultRate = 7): number {
  if (accounts.length === 0) return defaultRate;

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  // If no balance, fall back to simple average
  if (totalBalance <= 0) {
    return accounts.reduce((sum, acc) => sum + acc.annualReturnRate, 0) / accounts.length;
  }

  // Weighted average by balance
  return accounts.reduce((sum, acc) => {
    const weight = acc.currentBalance / totalBalance;
    return sum + acc.annualReturnRate * weight;
  }, 0);
}

/**
 * Calculate growth percentage between current and projected values
 */
export function calculateGrowthPercentage(currentBalance: number, projectedValue: number): number {
  if (currentBalance <= 0) {
    return projectedValue > 0 ? 100 : 0;
  }
  return Math.round(((projectedValue - currentBalance) / currentBalance) * 100);
}

/**
 * Calculate a value as a percentage of a target
 */
export function calculatePercentageOfTarget(value: number, target: number, round = true): number {
  if (target <= 0) return 0;
  const percentage = (value / target) * 100;
  return round ? Math.round(percentage) : percentage;
}

/**
 * Generate projection data points for charting.
 * Uses year-by-year simulation to correctly apply lump sum withdrawals.
 * Uses real returns (nominal - inflation) for real/scenario lines.
 */
export function generateProjection(
  accounts: Account[],
  profile: UserProfile,
  withdrawals: LumpSumWithdrawal[] = []
): ProjectionDataPoint[] {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return [];

  const currentYear = new Date().getFullYear();
  const performanceVariance = 2;

  // Track running balances for 4 scenarios per account
  const nominalBal: Record<string, number> = {};
  const realBal: Record<string, number> = {};
  const overBal: Record<string, number> = {};
  const underBal: Record<string, number> = {};

  for (const account of accounts) {
    nominalBal[account.id] = account.currentBalance;
    realBal[account.id] = account.currentBalance;
    overBal[account.id] = account.currentBalance;
    underBal[account.id] = account.currentBalance;
  }

  const dataPoints: ProjectionDataPoint[] = [];

  for (let year = 0; year <= yearsToRetirement; year++) {
    const age = profile.currentAge + year;

    if (year > 0) {
      // Advance each account by 1 year
      for (const account of accounts) {
        const increase = account.annualContributionIncrease ?? 0;
        const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
        // Contribution for this year (compounded by annualContributionIncrease)
        const yearlyContrib = account.monthlyContribution * Math.pow(1 + increase / 100, year - 1);

        nominalBal[account.id] = calculateFutureValue(nominalBal[account.id], yearlyContrib, account.annualReturnRate, 12, 0);
        realBal[account.id] = calculateFutureValue(realBal[account.id], yearlyContrib, realReturn, 12, 0);
        overBal[account.id] = calculateFutureValue(overBal[account.id], yearlyContrib, realReturn + performanceVariance, 12, 0);
        underBal[account.id] = calculateFutureValue(underBal[account.id], yearlyContrib, Math.max(0, realReturn - performanceVariance), 12, 0);
      }

      // Apply withdrawals for this age
      for (const w of withdrawals) {
        if (w.age === age && w.accountId in nominalBal) {
          nominalBal[w.accountId] = Math.max(0, nominalBal[w.accountId] - w.amount);
          realBal[w.accountId] = Math.max(0, realBal[w.accountId] - w.amount);
          overBal[w.accountId] = Math.max(0, overBal[w.accountId] - w.amount);
          underBal[w.accountId] = Math.max(0, underBal[w.accountId] - w.amount);
        }
      }
    }

    let total = 0, totalReal = 0, totalOver = 0, totalUnder = 0;
    const dataPoint: ProjectionDataPoint = {
      year: currentYear + year,
      age,
      label: `Y${year}`,
      total: 0,
      totalReal: 0,
      overperformanceReal: 0,
      underperformanceReal: 0,
    };

    for (const account of accounts) {
      dataPoint[account.id] = Math.round(nominalBal[account.id]);
      dataPoint[`${account.id}_real`] = Math.round(realBal[account.id]);
      total += nominalBal[account.id];
      totalReal += realBal[account.id];
      totalOver += overBal[account.id];
      totalUnder += underBal[account.id];
    }

    dataPoint.total = Math.round(total);
    dataPoint.totalReal = Math.round(totalReal);
    dataPoint.overperformanceReal = Math.round(totalOver);
    dataPoint.underperformanceReal = Math.round(totalUnder);
    dataPoints.push(dataPoint);
  }

  return dataPoints;
}

/**
 * Calculate projections for each account at retirement.
 * Uses year-by-year simulation to correctly apply lump sum withdrawals.
 */
export function calculateAccountProjections(
  accounts: Account[],
  profile: UserProfile,
  withdrawals: LumpSumWithdrawal[] = []
): AccountProjection[] {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return [];

  return accounts.map((account) => {
    const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
    const projectedValue = simulateAccountFinalBalance(account, yearsToRetirement, profile.currentAge, account.annualReturnRate, withdrawals);
    const projectedValueReal = simulateAccountFinalBalance(account, yearsToRetirement, profile.currentAge, realReturn, withdrawals);
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
  profile: UserProfile,
  withdrawals: LumpSumWithdrawal[] = []
): number {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return calculateTotalBalance(accounts);

  let total = 0;
  for (const account of accounts) {
    total += simulateAccountFinalBalance(account, yearsToRetirement, profile.currentAge, account.annualReturnRate, withdrawals);
  }
  return Math.round(total);
}

/**
 * Calculate projected total at retirement (inflation-adjusted / real terms)
 * Uses real returns (nominal - inflation) to properly account for contributions over time
 */
export function calculateProjectedTotalReal(
  accounts: Account[],
  profile: UserProfile,
  withdrawals: LumpSumWithdrawal[] = []
): number {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return calculateTotalBalance(accounts);

  let total = 0;
  for (const account of accounts) {
    const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
    total += simulateAccountFinalBalance(account, yearsToRetirement, profile.currentAge, realReturn, withdrawals);
  }
  return Math.round(total);
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

/**
 * Calculate a confidence score (1-10) based on how well positioned for retirement
 */
export function calculateConfidenceScore(
  accounts: Account[],
  profile: UserProfile
): number {
  if (accounts.length === 0) return 1;

  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return 5;

  const projectedReal = calculateProjectedTotalReal(accounts, profile);
  const target = profile.targetAmount;

  // Base score from progress (0-5 points)
  const progressRatio = projectedReal / target;
  let score = Math.min(5, progressRatio * 5);

  // Bonus for safety buffer (0-2 points)
  if (progressRatio > 1) {
    const bufferBonus = Math.min(2, (progressRatio - 1) * 4);
    score += bufferBonus;
  }

  // Bonus for time remaining (0-2 points) - more time = more opportunity
  const timeBonus = Math.min(2, yearsToRetirement / 20);
  score += timeBonus;

  // Bonus for conservative scenario still hitting target (0-1 point)
  const projection = generateProjection(accounts, profile);
  if (projection.length > 0) {
    const conservativeAtRetirement = projection[projection.length - 1].underperformanceReal;
    if (conservativeAtRetirement >= target) {
      score += 1;
    }
  }

  return Math.min(10, Math.max(1, Math.round(score)));
}

/**
 * Calculate milestone progress toward retirement goal
 */
export function calculateMilestones(
  accounts: Account[],
  profile: UserProfile
): Milestone[] {
  const milestonePercentages = [25, 50, 75, 100];
  const projectedReal = calculateProjectedTotalReal(accounts, profile);
  const projection = generateProjection(accounts, profile);

  return milestonePercentages.map(percentage => {
    const milestoneAmount = (profile.targetAmount * percentage) / 100;
    const reached = projectedReal >= milestoneAmount;

    // Find when this milestone will be reached
    let projectedReachAge: number | null = null;
    for (const point of projection) {
      if (point.totalReal >= milestoneAmount) {
        projectedReachAge = point.age;
        break;
      }
    }

    return {
      percentage,
      amount: milestoneAmount,
      reached,
      projectedReachAge,
    };
  });
}

/**
 * Calculate the required total balance right now to hit targetAmount at retirement,
 * given each account's current contributions and real return rates.
 *
 * Derivation: scale all balances by k so that
 *   k × fvBalanceOnly + fvContributionsOnly = targetAmount
 * requiredBalance = k × totalCurrentBalance
 *
 * Returns 0 if contributions alone exceed the target.
 */
export function calculateRequiredBalanceNow(
  accounts: Account[],
  profile: UserProfile,
  targetAmount: number,
): number {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return targetAmount;

  const months = yearsToRetirement * 12;
  let fvContributionsOnly = 0;
  let totalBalance = 0;
  let weightedGrowthFactor = 0;

  for (const account of accounts) {
    const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
    fvContributionsOnly += calculateFutureValue(0, account.monthlyContribution, realReturn, months, account.annualContributionIncrease ?? 0);
    // Growth factor for £1 invested in this account over the full period
    weightedGrowthFactor += calculateFutureValue(1, 0, realReturn, months, 0) * account.currentBalance;
    totalBalance += account.currentBalance;
  }

  if (totalBalance <= 0 || weightedGrowthFactor <= 0) return 0;

  const effectiveGrowthFactor = weightedGrowthFactor / totalBalance;
  const requiredFuture = targetAmount - fvContributionsOnly;
  if (requiredFuture <= 0) return 0;

  return requiredFuture / effectiveGrowthFactor;
}

/**
 * Calculate the age at which the portfolio will reach the target amount (in real terms).
 * Extends projection beyond retirement if needed, searching up to 50 years from now.
 * Returns null if the target is never reached within the search window.
 */
export function calculateTargetReachAge(
  accounts: Account[],
  profile: UserProfile,
): number | null {
  const maxSearchYears = 50;

  for (let year = 1; year <= maxSearchYears; year++) {
    const months = year * 12;
    let totalReal = 0;

    for (const account of accounts) {
      const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
      totalReal += calculateFutureValue(
        account.currentBalance,
        account.monthlyContribution,
        realReturn,
        months,
        account.annualContributionIncrease ?? 0
      );
    }

    if (totalReal >= profile.targetAmount) {
      return profile.currentAge + year;
    }
  }

  return null;
}

/**
 * Calculate projected total with different monthly contribution.
 * @param inflationAdjusted - true = today's money (real returns), false = future nominal value
 */
export function calculateWhatIfContribution(
  accounts: Account[],
  profile: UserProfile,
  extraMonthly: number,
  inflationAdjusted = true
): number {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return calculateTotalBalance(accounts);

  const months = yearsToRetirement * 12;
  let total = 0;

  const inflationRate = inflationAdjusted ? profile.expectedInflation : 0;
  const totalContributions = calculateTotalContributions(accounts);

  for (const account of accounts) {
    const contributionRatio = totalContributions > 0
      ? account.monthlyContribution / totalContributions
      : 1 / accounts.length;
    const extraForAccount = extraMonthly * contributionRatio;
    const effectiveReturn = Math.max(0, account.annualReturnRate - inflationRate);

    total += calculateFutureValue(
      account.currentBalance,
      account.monthlyContribution + extraForAccount,
      effectiveReturn,
      months,
      account.annualContributionIncrease ?? 0
    );
  }

  return Math.round(total);
}

/**
 * Calculate projected total with different retirement age.
 * @param inflationAdjusted - true = today's money (real returns), false = future nominal value
 */
export function calculateWhatIfRetirementAge(
  accounts: Account[],
  profile: UserProfile,
  newRetirementAge: number,
  inflationAdjusted = true
): number {
  const modifiedProfile = { ...profile, retirementAge: newRetirementAge };
  return inflationAdjusted
    ? calculateProjectedTotalReal(accounts, modifiedProfile)
    : calculateProjectedTotal(accounts, modifiedProfile);
}

/**
 * Calculate projected total with different return rates.
 * @param inflationAdjusted - true = today's money (real returns), false = future nominal value
 */
export function calculateWhatIfReturns(
  accounts: Account[],
  profile: UserProfile,
  returnAdjustment: number,
  inflationAdjusted = true
): number {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) return calculateTotalBalance(accounts);

  const months = yearsToRetirement * 12;
  let total = 0;

  const inflationRate = inflationAdjusted ? profile.expectedInflation : 0;

  for (const account of accounts) {
    const effectiveReturn = Math.max(0, account.annualReturnRate - inflationRate + returnAdjustment);
    total += calculateFutureValue(
      account.currentBalance,
      account.monthlyContribution,
      effectiveReturn,
      months,
      account.annualContributionIncrease ?? 0
    );
  }

  return Math.round(total);
}

/**
 * Calculate Coast FIRE number - the amount needed today such that
 * compound growth alone (no contributions) reaches the target by retirement
 */
export function calculateCoastFireNumber(
  profile: UserProfile,
  averageRealReturn: number
): number {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  const effectiveTarget = calculateReducedTarget(profile);
  if (yearsToRetirement <= 0) return effectiveTarget;

  // Coast FIRE = Target / (1 + realReturn)^years
  const realRate = averageRealReturn / 100;
  return effectiveTarget / Math.pow(1 + realRate, yearsToRetirement);
}

/**
 * Find the year when Coast FIRE is reached (if ever)
 * Returns the year index or null if not reached within the projection
 */
export function findCoastFireYear(
  projection: ProjectionDataPoint[],
  coastFireNumber: number
): number | null {
  for (let i = 0; i < projection.length; i++) {
    if (projection[i].totalReal >= coastFireNumber) {
      return i;
    }
  }
  return null;
}

/**
 * Calculate annual State Pension income
 */
export function calculateAnnualStatePension(weeklyAmount: number): number {
  return weeklyAmount * 52;
}

/**
 * Calculate the portfolio equivalent of State Pension income
 * Accounts for the gap between retirement age and State Pension start age
 * Uses life expectancy of 90 for planning purposes
 */
export function calculateStatePensionEquivalent(
  profile: UserProfile,
  withdrawalRate: number = 4,
  lifeExpectancy: number = 90
): number {
  if (!profile.includeStatePension || profile.statePensionAmount <= 0) {
    return 0;
  }

  const annualPension = calculateAnnualStatePension(profile.statePensionAmount);
  const fullEquivalent = annualPension / (withdrawalRate / 100);

  // Calculate retirement duration and years with State Pension
  const retirementYears = Math.max(0, lifeExpectancy - profile.retirementAge);
  const yearsWithStatePension = Math.max(0, lifeExpectancy - profile.statePensionAge);

  if (retirementYears <= 0) return 0;

  // Pro-rate the equivalent based on portion of retirement covered by State Pension
  const coverageRatio = yearsWithStatePension / retirementYears;

  return Math.round(fullEquivalent * coverageRatio);
}

/**
 * Calculate how much State Pension reduces the required portfolio target
 */
export function calculateReducedTarget(profile: UserProfile): number {
  const statePensionEquivalent = calculateStatePensionEquivalent(profile);
  return Math.max(0, profile.targetAmount - statePensionEquivalent);
}

/**
 * Calculate total retirement income from portfolio and State Pension
 * @param portfolioValue - the total portfolio value at retirement
 * @param profile - user profile with State Pension settings
 * @param withdrawalRate - annual withdrawal rate percentage (default 4%)
 */
export function calculateTotalRetirementIncome(
  portfolioValue: number,
  profile: UserProfile,
  withdrawalRate: number = 4
): { portfolioIncome: number; statePensionIncome: number; totalIncome: number } {
  const portfolioIncome = portfolioValue * (withdrawalRate / 100);
  const statePensionIncome = profile.includeStatePension
    ? calculateAnnualStatePension(profile.statePensionAmount)
    : 0;
  return {
    portfolioIncome,
    statePensionIncome,
    totalIncome: portfolioIncome + statePensionIncome,
  };
}

/**
 * Calculate impact of market drop and recovery time
 * Uses real returns for proper inflation adjustment
 */
export function calculateMarketDropImpact(
  accounts: Account[],
  profile: UserProfile,
  dropPercent: number
): StressTestResult {
  const currentTotal = calculateTotalBalance(accounts);

  // Apply drop to current balances
  const postDropBalance = currentTotal * (1 - dropPercent / 100);

  // Calculate new projection from reduced balances
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) {
    return {
      dropPercent,
      postDropTotal: Math.round(postDropBalance),
      recoveryYears: 0,
      stillMeetsTarget: postDropBalance >= profile.targetAmount,
    };
  }

  const months = yearsToRetirement * 12;
  let postDropProjectedReal = 0;

  for (const account of accounts) {
    const droppedBalance = account.currentBalance * (1 - dropPercent / 100);
    const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
    postDropProjectedReal += calculateFutureValue(
      droppedBalance,
      account.monthlyContribution,
      realReturn,
      months,
      account.annualContributionIncrease ?? 0
    );
  }

  // Estimate recovery time (years to get back to current balance)
  // Using average return rate
  const avgReturn = accounts.length > 0
    ? accounts.reduce((sum, acc) => sum + acc.annualReturnRate, 0) / accounts.length
    : 7;
  const recoveryYears = dropPercent > 0
    ? Math.ceil(Math.log(1 / (1 - dropPercent / 100)) / Math.log(1 + avgReturn / 100))
    : 0;

  return {
    dropPercent,
    postDropTotal: Math.round(postDropProjectedReal),
    recoveryYears,
    stillMeetsTarget: postDropProjectedReal >= profile.targetAmount,
  };
}

/**
 * Calculate annual retirement expenses using the 4% rule (inverse = divide by 25)
 */
export function calculateAnnualRetirementExpenses(profile: UserProfile): number {
  return profile.targetAmount / 25;
}

/**
 * Calculate the number of years between retirement age and private pension access age (58)
 */
export function calculateBridgePeriodYears(profile: UserProfile): number {
  return Math.max(0, PRIVATE_PENSION_ACCESS_AGE - profile.retirementAge);
}

/**
 * Calculate the total amount needed for the ISA bridge period
 * This accounts for continued growth during drawdown and inflation
 */
export function calculateIsaBridgeRequired(
  profile: UserProfile
): number {
  const bridgeYears = calculateBridgePeriodYears(profile);
  if (bridgeYears <= 0) return 0;

  const annualExpenses = calculateAnnualRetirementExpenses(profile);

  // Calculate total needed, accounting for inflation during bridge period
  // and some growth while drawing down (assume conservative 3% real return during drawdown)
  const drawdownReturn = 0.03;
  let totalNeeded = 0;

  for (let year = 0; year < bridgeYears; year++) {
    // Each year's expenses, adjusted for inflation from retirement start
    const inflationAdjustedExpense = annualExpenses * Math.pow(1 + profile.expectedInflation / 100, year);
    // Discount back to retirement start value (accounts for growth during drawdown)
    const presentValue = inflationAdjustedExpense / Math.pow(1 + drawdownReturn, year);
    totalNeeded += presentValue;
  }

  return Math.round(totalNeeded);
}

/**
 * Calculate the projected value of accessible accounts (ISA, GIA, Savings) at retirement
 * These are accounts that can be accessed before state pension age without penalty
 */
export function calculateAccessibleBalance(
  accounts: Account[],
  profile: UserProfile
): number {
  const accessibleTypes = ['isa', 'gia', 'savings'];
  const accessibleAccounts = accounts.filter(acc => accessibleTypes.includes(acc.type));

  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0) {
    return accessibleAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  }

  const months = yearsToRetirement * 12;
  let total = 0;

  for (const account of accessibleAccounts) {
    const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
    total += calculateFutureValue(
      account.currentBalance,
      account.monthlyContribution,
      realReturn,
      months,
      account.annualContributionIncrease ?? 0
    );
  }

  return Math.round(total);
}

export interface IsaBridgeProgress {
  required: number;
  accessible: number;
  shortfall: number;
  progress: number;
  bridgeYears: number;
  annualExpenses: number;
}

/**
 * Calculate complete ISA bridge progress information
 */
export function calculateIsaBridgeProgress(
  accounts: Account[],
  profile: UserProfile
): IsaBridgeProgress {
  const bridgeYears = calculateBridgePeriodYears(profile);
  const annualExpenses = calculateAnnualRetirementExpenses(profile);
  const required = calculateIsaBridgeRequired(profile);
  const accessible = calculateAccessibleBalance(accounts, profile);
  const shortfall = Math.max(0, required - accessible);
  const progress = required > 0 ? Math.min(100, (accessible / required) * 100) : 100;

  return {
    required,
    accessible,
    shortfall,
    progress,
    bridgeYears,
    annualExpenses,
  };
}

/**
 * Generate monthly projection data points for the accumulation phase.
 * Uses nominal returns so values match real account statements.
 * Target % inflates the target to keep the comparison meaningful.
 */
export function generateMonthlyProjection(
  accounts: Account[],
  profile: UserProfile,
  startDate?: { month: number; year: number }, // month: 1-12
  endDate?: { month: number; year: number },   // month: 1-12
  withdrawals: LumpSumWithdrawal[] = []
): MonthlyProjectionDataPoint[] {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  if (yearsToRetirement <= 0 || accounts.length === 0) return [];

  const maxRetirementMonths = yearsToRetirement * 12;
  const now = new Date();
  const startYear = startDate?.year ?? now.getFullYear();
  const startMonth = startDate ? startDate.month - 1 : now.getMonth(); // 0-indexed

  // Allow end date past retirement — no cap at maxRetirementMonths
  let totalMonths = maxRetirementMonths;
  if (endDate) {
    const endMonthsFromStart = (endDate.year - startYear) * 12 + (endDate.month - 1 - startMonth);
    totalMonths = Math.max(0, endMonthsFromStart);
  }

  const reducedTarget = calculateReducedTarget(profile);
  const monthlyInflation = profile.expectedInflation / 100 / 12;
  const targetInflationFactor = 1 + monthlyInflation;
  const birth = new Date(profile.birthday);
  const accountStates = accounts.map((account) => ({
    id: account.id,
    balance: account.currentBalance,
    monthlyContribution: account.monthlyContribution,
    monthlyGrowthFactor: 1 + account.annualReturnRate / 100 / 12,
    annualIncreaseFactor: 1 + (account.annualContributionIncrease ?? 0) / 100,
  }));
  const points: MonthlyProjectionDataPoint[] = [];
  let inflatedTarget = reducedTarget;

  for (let m = 0; m <= totalMonths; m++) {
    const calMonth = (startMonth + m) % 12; // 0-11
    const calYear = startYear + Math.floor((startMonth + m) / 12);

    // Compute precise age from birthday at this calendar month
    const pointDate = new Date(calYear, calMonth, birth.getDate());
    let ageYears = calYear - birth.getFullYear();
    let ageMonthsPart = calMonth - birth.getMonth();
    if (ageMonthsPart < 0 || (ageMonthsPart === 0 && pointDate.getDate() < birth.getDate())) {
      ageYears--;
      ageMonthsPart += 12;
    }
    if (ageMonthsPart < 0) ageMonthsPart += 12;

    for (const accountState of accountStates) {
      if (m > 0) {
        if (m <= maxRetirementMonths) {
          const contributionYear = Math.floor((m - 1) / 12);
          const contribution = accountState.monthlyContribution * Math.pow(accountState.annualIncreaseFactor, contributionYear);
          accountState.balance = (accountState.balance + contribution) * accountState.monthlyGrowthFactor;
        } else {
          accountState.balance *= accountState.monthlyGrowthFactor;
        }
      }

      // Apply lump sum withdrawals on the user's birthday month for this age
      if (ageMonthsPart === 0 && withdrawals.length > 0) {
        for (const w of withdrawals) {
          if (w.age === ageYears && w.accountId === accountState.id) {
            accountState.balance = Math.max(0, accountState.balance - w.amount);
          }
        }
      }
    }

    let total = 0;
    const accountBalances: Record<string, number> = {};
    for (const accountState of accountStates) {
      const rounded = Math.round(accountState.balance);
      accountBalances[accountState.id] = rounded;
      total += rounded;
    }

    points.push({
      month: m,
      year: calYear,
      monthOfYear: calMonth + 1, // 1-12
      age: ageYears,
      ageMonths: ageMonthsPart,
      total,
      targetPercent: inflatedTarget > 0 ? Math.round((total / inflatedTarget) * 100) : 0,
      accountBalances,
    });

    inflatedTarget *= targetInflationFactor;
  }

  return points;
}

/**
 * Forecast net worth using linear regression on historical snapshots.
 * Returns monthly forecast points starting from the last snapshot.
 * Returns empty array if fewer than 2 snapshots.
 */
export function calculateNetWorthForecast(
  history: NetWorthSnapshot[],
  monthsAhead: number = 12,
  intervalMonths: number = 1
): { date: string; total: number }[] {
  if (history.length < 2) return [];

  // Convert dates to days since first snapshot for regression
  const firstDate = new Date(history[0].date + 'T00:00:00').getTime();
  const points = history.map((snap) => ({
    x: (new Date(snap.date + 'T00:00:00').getTime() - firstDate) / (1000 * 60 * 60 * 24),
    y: snap.totalBalance,
  }));

  // Simple linear regression: y = mx + b
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return [];

  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;

  // Generate forecast points from last snapshot at the given interval
  const lastSnap = history[history.length - 1];
  const lastDate = new Date(lastSnap.date + 'T00:00:00');
  const lastDays = (lastDate.getTime() - firstDate) / (1000 * 60 * 60 * 24);

  const forecast: { date: string; total: number }[] = [];
  for (let i = intervalMonths; i <= monthsAhead; i += intervalMonths) {
    const futureDate = new Date(lastDate);
    futureDate.setMonth(futureDate.getMonth() + i);
    const futureDays = lastDays + (futureDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    const projected = Math.round(m * futureDays + b);

    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');

    forecast.push({ date: `${yyyy}-${mm}-${dd}`, total: projected });
  }

  return forecast;
}
