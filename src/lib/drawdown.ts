import {
  Account,
  UserProfile,
  DrawdownConfig,
  DrawdownYearResult,
  DrawdownSimulationResult,
  MonteCarloResult,
  AccountType,
  LumpSumWithdrawal,
} from '@/types';
import { applyWithdrawalsToBalance, calculateAnnualStatePension, calculateRealReturn, simulateAccountAccumulation } from '@/lib/calculations';
import { BASIC_RATE_BAND, PRIVATE_PENSION_ACCESS_AGE, UK_FIGURES } from '@/lib/uk-figures';

// Default withdrawal order by account type priority
const DEFAULT_TYPE_ORDER: AccountType[] = ['isa', 'gia', 'savings', 'sipp', 'pension'];

// Ignores rounding differences smaller than a penny
const SHORTFALL_TOLERANCE = 0.005;

function getTaxableIncomeAfterAllowance(totalIncome: number): number {
  const { personalAllowance, personalAllowanceTaperStart } = UK_FIGURES;
  const allowanceReduction = Math.max(0, (totalIncome - personalAllowanceTaperStart) / 2);
  const effectiveAllowance = Math.max(0, personalAllowance - allowanceReduction);
  return Math.max(0, totalIncome - effectiveAllowance);
}

/**
 * Calculate UK income tax on a given total income, applying personal allowance and tax bands.
 */
function calculateIncomeTax(totalIncome: number): number {
  const { additionalRateThreshold, basicRate, higherRate, additionalRate } = UK_FIGURES;
  const taxable = getTaxableIncomeAfterAllowance(totalIncome);

  if (taxable <= BASIC_RATE_BAND) {
    return taxable * basicRate;
  }
  if (taxable <= additionalRateThreshold) {
    return BASIC_RATE_BAND * basicRate + (taxable - BASIC_RATE_BAND) * higherRate;
  }
  return (
    BASIC_RATE_BAND * basicRate +
    (additionalRateThreshold - BASIC_RATE_BAND) * higherRate +
    (taxable - additionalRateThreshold) * additionalRate
  );
}

/** Gains use up whatever basic rate band income has left, then pay the higher rate. */
function calculateCapitalGainsTax(totalGains: number, taxableIncome: number): number {
  const { capitalGainsAllowance, capitalGainsBasicRate, capitalGainsHigherRate } = UK_FIGURES;
  const taxableGains = Math.max(0, totalGains - capitalGainsAllowance);
  const unusedBasicBand = Math.max(0, BASIC_RATE_BAND - getTaxableIncomeAfterAllowance(taxableIncome));
  const gainsAtBasicRate = Math.min(taxableGains, unusedBasicBand);
  return gainsAtBasicRate * capitalGainsBasicRate + (taxableGains - gainsAtBasicRate) * capitalGainsHigherRate;
}

export interface WithdrawalTaxInput {
  withdrawals: Record<string, number>;
  accounts: Account[];
  accountRetirementBalances: Record<string, number>;
  accountTotalContributed: Record<string, number>;
  sippTaxFreeUsed: Record<string, number>;
  statePensionIncome: number;
  taxModeling: boolean;
}

/**
 * Calculate tax on withdrawals for a given year.
 * Properly allocates tax between state pension and portfolio withdrawals:
 * - ISA/savings withdrawals are completely tax-free
 * - Pension/SIPP withdrawals: 25% tax-free lump sum, up to the lump sum allowance across all pensions, rest taxed as income
 * - GIA withdrawals: CGT on gains only (annual allowance applied once across all GIAs), at a rate set by income
 * - State pension uses personal allowance first; remaining allowance applies to pension withdrawals
 */
export function calculateWithdrawalTax({
  withdrawals,
  accounts,
  accountRetirementBalances,
  accountTotalContributed,
  sippTaxFreeUsed,
  statePensionIncome,
  taxModeling,
}: WithdrawalTaxInput): { totalTax: number; withdrawalTax: number; updatedSippTaxFreeUsed: Record<string, number> } {
  if (!taxModeling) {
    return { totalTax: 0, withdrawalTax: 0, updatedSippTaxFreeUsed: sippTaxFreeUsed };
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  let taxableIncome = statePensionIncome;
  let totalGiaGains = 0;
  const newSippTaxFreeUsed = { ...sippTaxFreeUsed };

  for (const [accountId, withdrawal] of Object.entries(withdrawals)) {
    if (withdrawal <= 0) continue;
    const account = accountMap.get(accountId);
    if (!account) continue;

    switch (account.type) {
      case 'isa':
      case 'savings':
        // Completely tax-free
        break;

      case 'gia': {
        // CGT on gains portion only — accumulate across all GIAs
        const projectedValue = accountRetirementBalances[accountId] ?? 0;
        const totalContributed = accountTotalContributed[accountId] ?? 0;
        const gainPct = projectedValue > 0 ? Math.max(0, (projectedValue - totalContributed) / projectedValue) : 0;
        totalGiaGains += withdrawal * gainPct;
        break;
      }

      case 'sipp':
      case 'pension': {
        // 25% tax-free lump sum, rest taxed as income
        const totalPot = accountRetirementBalances[accountId] ?? 0;
        const taxFreeAllowance = totalPot * UK_FIGURES.pensionTaxFreeShare;
        const usedSoFar = newSippTaxFreeUsed[accountId] ?? 0;
        const usedAcrossPensions = Object.values(newSippTaxFreeUsed).reduce((sum, used) => sum + used, 0);
        const remainingLumpSumAllowance = Math.max(0, UK_FIGURES.lumpSumAllowance - usedAcrossPensions);
        const remainingTaxFree = Math.min(Math.max(0, taxFreeAllowance - usedSoFar), remainingLumpSumAllowance);
        const taxFreeFromThis = Math.min(withdrawal, remainingTaxFree);
        newSippTaxFreeUsed[accountId] = usedSoFar + taxFreeFromThis;
        const taxablePortion = withdrawal - taxFreeFromThis;
        taxableIncome += taxablePortion;
        break;
      }
    }
  }

  // CGT annual allowance applies once across all GIA gains
  const totalCgt = calculateCapitalGainsTax(totalGiaGains, taxableIncome);

  // Income tax on combined taxable income (state pension + pension/SIPP taxable portions)
  const totalIncomeTax = calculateIncomeTax(taxableIncome);

  // Tax attributable to state pension alone (so we can properly allocate)
  const statePensionTax = calculateIncomeTax(statePensionIncome);

  // Withdrawal tax = marginal income tax from withdrawals + CGT
  const withdrawalTax = (totalIncomeTax - statePensionTax) + totalCgt;

  return {
    totalTax: totalIncomeTax + totalCgt,
    withdrawalTax,
    updatedSippTaxFreeUsed: newSippTaxFreeUsed,
  };
}

/**
 * Get ordered accounts for withdrawal based on config's accountOrder.
 * Falls back to default type-based order for any accounts not in the order list.
 */
export function getOrderedAccounts(accounts: Account[], accountOrder: string[]): Account[] {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const ordered: Account[] = [];
  const seen = new Set<string>();

  // Add accounts in specified order
  for (const id of accountOrder) {
    const account = accountMap.get(id);
    if (account) {
      ordered.push(account);
      seen.add(id);
    }
  }

  // Add remaining accounts by default type order
  const remaining = accounts.filter((a) => !seen.has(a.id));
  remaining.sort((a, b) => DEFAULT_TYPE_ORDER.indexOf(a.type) - DEFAULT_TYPE_ORDER.indexOf(b.type));
  ordered.push(...remaining);

  return ordered;
}

/**
 * Simulate drawdown from retirement through planning horizon.
 */
/** Each account's projected balance at retirement and the money paid into it, in real terms. */
export function projectRetirementPots(
  accounts: Account[],
  profile: UserProfile,
  withdrawals: LumpSumWithdrawal[]
): { balances: Record<string, number>; moneyPaidIn: Record<string, number> } {
  const yearsToRetirement = Math.max(0, profile.retirementAge - profile.currentAge);
  const balances: Record<string, number> = {};
  const moneyPaidIn: Record<string, number> = {};
  for (const account of accounts) {
    const realReturn = calculateRealReturn(account.annualReturnRate, profile.expectedInflation);
    const pot = simulateAccountAccumulation(account, yearsToRetirement, profile.currentAge, realReturn, withdrawals);
    balances[account.id] = pot.balance;
    moneyPaidIn[account.id] = pot.moneyPaidIn;
  }
  return { balances, moneyPaidIn };
}

/**
 * Takes `amount` out of the accounts for one year, reducing `balances` and returning
 * what came from each account. With tax on and the pension accessible, it draws pensions
 * up to the personal allowance first, then the configured order, then pensions again.
 * Otherwise it follows the configured order, skipping any pension still locked.
 */
export function drawFromAccounts(
  orderedAccounts: Account[],
  balances: Record<string, number>,
  amount: number,
  age: number,
  statePensionThisYear: number,
  taxModeling: boolean
): Record<string, number> {
  const drawn: Record<string, number> = {};
  let remaining = amount;
  const isPension = (account: Account) => account.type === 'sipp' || account.type === 'pension';

  const drawFrom = (accounts: Account[], capFor: () => number = () => Infinity) => {
    for (const account of accounts) {
      if (remaining <= 0 || capFor() <= 0) break;
      const balance = balances[account.id] ?? 0;
      if (balance <= 0) continue;
      const withdrawal = Math.min(remaining, balance, capFor());
      drawn[account.id] = (drawn[account.id] ?? 0) + withdrawal;
      balances[account.id] = balance - withdrawal;
      remaining -= withdrawal;
    }
  };

  const pensionAccessible = age >= PRIVATE_PENSION_ACCESS_AGE;
  if (taxModeling && pensionAccessible) {
    const pensions = orderedAccounts.filter(isPension);
    const cap = Math.max(0, UK_FIGURES.personalAllowance - statePensionThisYear);
    let drawnWithinCap = 0;
    for (const account of pensions) {
      const before = remaining;
      drawFrom([account], () => cap - drawnWithinCap);
      drawnWithinCap += before - remaining;
    }
    drawFrom(orderedAccounts.filter((account) => !isPension(account)));
    drawFrom(pensions);
  } else {
    drawFrom(orderedAccounts.filter((account) => !isPension(account) || pensionAccessible));
  }
  return drawn;
}

export function simulateDrawdown(
  accounts: Account[],
  profile: UserProfile,
  config: DrawdownConfig,
  getReturnRate?: () => number,
  withdrawals: LumpSumWithdrawal[] = []
): DrawdownSimulationResult {
  const yearsToRetirement = Math.max(0, profile.retirementAge - profile.currentAge);
  const retirementYears = Math.max(0, config.planningHorizon - profile.retirementAge);

  if (accounts.length === 0 || retirementYears <= 0) {
    return {
      years: [],
      depletionAge: null,
      firstShortfallAge: null,
      totalNetIncomeGenerated: 0,
      totalTaxPaid: 0,
      accountDepletionAges: {},
    };
  }

  // Projected balances at retirement (real terms), applying lump sum withdrawals
  const { balances: accountRetirementBalances, moneyPaidIn: accountTotalContributed } = projectRetirementPots(accounts, profile, withdrawals);
  const accountBalances: Record<string, number> = { ...accountRetirementBalances };

  const initialPortfolio = Object.values(accountBalances).reduce((sum, b) => sum + b, 0);

  // Fixed withdrawal is constant; percentage recalculates each year inside the loop
  let annualWithdrawal: number;
  if (config.strategy === 'fixed') {
    annualWithdrawal = config.fixedAnnualIncome;
  } else {
    annualWithdrawal = 0;
  }

  const annualStatePension = profile.includeStatePension
    ? calculateAnnualStatePension(profile.statePensionAmount)
    : 0;

  const orderedAccounts = getOrderedAccounts(accounts, config.accountOrder);

  const years: DrawdownYearResult[] = [];
  let depletionAge: number | null = null;
  let firstShortfallAge: number | null = null;
  let totalNetIncomeGenerated = 0;
  let totalTaxPaid = 0;
  const accountDepletionAges: Record<string, number | null> = {};
  let sippTaxFreeUsed: Record<string, number> = {};

  for (const account of accounts) {
    accountDepletionAges[account.id] = null;
  }

  for (let yearIndex = 0; yearIndex < retirementYears; yearIndex++) {
    const age = profile.retirementAge + yearIndex;

    // Lump sums due at retirement are already in the starting balances, unless already retired
    if (yearIndex > 0 || yearsToRetirement === 0) {
      for (const account of accounts) {
        accountBalances[account.id] = applyWithdrawalsToBalance(accountBalances[account.id] ?? 0, account.id, withdrawals, { kind: 'annual', age });
      }
    }

    const portfolioBalance = Object.values(accountBalances).reduce((sum, b) => sum + b, 0);

    // Check if portfolio already depleted
    if (portfolioBalance <= 0 && depletionAge === null) {
      depletionAge = age;
    }

    // Recalculate withdrawal each year for dynamic strategies
    if (config.strategy === 'percentage') {
      annualWithdrawal = portfolioBalance * (config.withdrawalRate / 100);
    }

    // State pension income this year
    const statePensionThisYear = age >= profile.statePensionAge ? annualStatePension : 0;

    // How much do we need from the portfolio?
    const portfolioWithdrawalNeeded = Math.max(0, annualWithdrawal - statePensionThisYear);

    // Withdraw from accounts
    const yearWithdrawals = drawFromAccounts(
      orderedAccounts,
      accountBalances,
      Math.min(portfolioWithdrawalNeeded, portfolioBalance),
      age,
      statePensionThisYear,
      config.taxModeling
    );
    for (const accountId of Object.keys(yearWithdrawals)) {
      if (accountBalances[accountId] <= 0 && accountDepletionAges[accountId] === null) {
        accountDepletionAges[accountId] = age;
      }
    }

    const grossWithdrawal = Object.values(yearWithdrawals).reduce((sum, w) => sum + w, 0);

    const unpaid = portfolioWithdrawalNeeded - grossWithdrawal;
    const shortfall = unpaid > SHORTFALL_TOLERANCE ? unpaid : 0;
    if (shortfall > 0) {
      firstShortfallAge ??= age;
      const moneyLeft = Object.values(accountBalances).reduce((sum, b) => sum + b, 0);
      if (moneyLeft <= 0) depletionAge ??= age;
    }

    // Calculate tax — properly allocates between state pension and withdrawals
    const { totalTax, withdrawalTax, updatedSippTaxFreeUsed } = calculateWithdrawalTax({
      withdrawals: yearWithdrawals,
      accounts,
      accountRetirementBalances,
      accountTotalContributed,
      sippTaxFreeUsed,
      statePensionIncome: statePensionThisYear,
      taxModeling: config.taxModeling,
    });
    sippTaxFreeUsed = updatedSippTaxFreeUsed;

    const statePensionTax = totalTax - withdrawalTax;
    const netWithdrawal = grossWithdrawal - withdrawalTax;
    const totalNetIncome = netWithdrawal + (statePensionThisYear - statePensionTax);

    totalNetIncomeGenerated += totalNetIncome;
    totalTaxPaid += totalTax;

    // Apply growth to remaining balances
    for (const account of accounts) {
      const balance = accountBalances[account.id] ?? 0;
      if (balance > 0) {
        const rate = getReturnRate ? getReturnRate() : config.drawdownReturnRate;
        accountBalances[account.id] = balance * (1 + rate / 100);
      }
    }

    const endPortfolioBalance = Object.values(accountBalances).reduce((sum, b) => sum + b, 0);

    years.push({
      age,
      grossWithdrawal,
      taxPaid: totalTax,
      withdrawalTax,
      netWithdrawal,
      statePensionIncome: statePensionThisYear,
      totalNetIncome,
      portfolioBalance: Math.max(0, endPortfolioBalance),
      accountBalances: { ...accountBalances },
      accountWithdrawals: yearWithdrawals,
      shortfall,
    });
  }

  return {
    years,
    depletionAge,
    firstShortfallAge,
    totalNetIncomeGenerated,
    totalTaxPaid,
    accountDepletionAges,
  };
}

function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stdDev;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function runMonteCarloSimulation(
  accounts: Account[],
  profile: UserProfile,
  config: DrawdownConfig,
  numSimulations = 1000,
  volatility = 10,
  withdrawals: LumpSumWithdrawal[] = []
): MonteCarloResult {
  const retirementYears = Math.max(0, config.planningHorizon - profile.retirementAge);
  if (accounts.length === 0 || retirementYears <= 0)
    return { years: [], successRate: 0, lowestYearlyIncome: 0, medianDepletionAge: null, numSimulations };

  const balancesByYear: number[][] = Array.from({ length: retirementYears }, () => []);
  let successCount = 0;
  const depletionAges: number[] = [];
  const lowestIncomes: number[] = [];

  for (let i = 0; i < numSimulations; i++) {
    const result = simulateDrawdown(accounts, profile, config,
      () => normalRandom(config.drawdownReturnRate, volatility), withdrawals);
    result.years.forEach((yr, idx) => balancesByYear[idx].push(yr.portfolioBalance));
    lowestIncomes.push(Math.min(...result.years.map((yr) => yr.totalNetIncome)));
    if (result.firstShortfallAge === null) successCount++;
    if (result.depletionAge !== null) depletionAges.push(result.depletionAge);
  }

  const years = balancesByYear.map((balances, idx) => {
    const s = [...balances].sort((a, b) => a - b);
    return {
      age: profile.retirementAge + idx,
      p10: percentile(s, 10),
      p25: percentile(s, 25),
      p50: percentile(s, 50),
      p75: percentile(s, 75),
      p90: percentile(s, 90),
    };
  });

  const sortedDA = [...depletionAges].sort((a, b) => a - b);
  return {
    years,
    successRate: (successCount / numSimulations) * 100,
    lowestYearlyIncome: percentile([...lowestIncomes].sort((a, b) => a - b), 10),
    medianDepletionAge: sortedDA.length ? sortedDA[Math.floor(sortedDA.length / 2)] : null,
    numSimulations,
  };
}
