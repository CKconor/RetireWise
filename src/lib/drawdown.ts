import {
  Account,
  UserProfile,
  DrawdownConfig,
  DrawdownYearResult,
  DrawdownSimulationResult,
  AccountType,
} from '@/types';
import { calculateFutureValue, calculateAnnualStatePension } from '@/lib/calculations';

// Default withdrawal order by account type priority
const DEFAULT_TYPE_ORDER: AccountType[] = ['isa', 'gia', 'savings', 'sipp', 'pension'];

// UK tax constants
const PERSONAL_ALLOWANCE = 12570;
const BASIC_LIMIT = 50270;
const HIGHER_LIMIT = 125140;
const CGT_ALLOWANCE = 3000;

/**
 * Calculate UK income tax on a given total income, applying personal allowance and tax bands.
 */
function calculateIncomeTax(totalIncome: number): number {
  if (totalIncome <= PERSONAL_ALLOWANCE) return 0;
  const taxable = totalIncome - PERSONAL_ALLOWANCE;
  const basicBand = BASIC_LIMIT - PERSONAL_ALLOWANCE;
  const higherBand = HIGHER_LIMIT - BASIC_LIMIT;

  if (taxable <= basicBand) {
    return taxable * 0.2;
  } else if (taxable <= basicBand + higherBand) {
    return basicBand * 0.2 + (taxable - basicBand) * 0.4;
  }
  return basicBand * 0.2 + higherBand * 0.4 + (taxable - basicBand - higherBand) * 0.45;
}

/**
 * Calculate tax on withdrawals for a given year.
 * Properly allocates tax between state pension and portfolio withdrawals:
 * - ISA/savings withdrawals are completely tax-free
 * - Pension/SIPP withdrawals: 25% tax-free lump sum, rest taxed as income
 * - GIA withdrawals: CGT on gains only (annual allowance applied once across all GIAs)
 * - State pension uses personal allowance first; remaining allowance applies to pension withdrawals
 */
function calculateWithdrawalTax(
  withdrawals: Record<string, number>,
  accounts: Account[],
  accountRetirementBalances: Record<string, number>,
  accountTotalContributed: Record<string, number>,
  sippTaxFreeUsed: Record<string, number>,
  statePensionIncome: number,
  taxModeling: boolean
): { totalTax: number; withdrawalTax: number; updatedSippTaxFreeUsed: Record<string, number> } {
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
        const taxFreeAllowance = totalPot * 0.25;
        const usedSoFar = newSippTaxFreeUsed[accountId] ?? 0;
        const remainingTaxFree = Math.max(0, taxFreeAllowance - usedSoFar);
        const taxFreeFromThis = Math.min(withdrawal, remainingTaxFree);
        newSippTaxFreeUsed[accountId] = usedSoFar + taxFreeFromThis;
        const taxablePortion = withdrawal - taxFreeFromThis;
        taxableIncome += taxablePortion;
        break;
      }
    }
  }

  // Apply CGT annual allowance once across all GIA gains
  const taxableGains = Math.max(0, totalGiaGains - CGT_ALLOWANCE);
  const totalCgt = taxableGains * 0.1;

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
function getOrderedAccounts(accounts: Account[], accountOrder: string[]): Account[] {
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
 * Calculate total contributions made to an account from now until retirement.
 */
function calculateTotalContributed(account: Account, yearsToRetirement: number): number {
  let total = account.currentBalance;
  let monthlyContrib = account.monthlyContribution;
  for (let year = 0; year < yearsToRetirement; year++) {
    total += monthlyContrib * 12;
    if (account.annualContributionIncrease > 0) {
      monthlyContrib *= 1 + account.annualContributionIncrease / 100;
    }
  }
  return total;
}

/**
 * Simulate drawdown from retirement through planning horizon.
 */
export function simulateDrawdown(
  accounts: Account[],
  profile: UserProfile,
  config: DrawdownConfig
): DrawdownSimulationResult {
  const yearsToRetirement = Math.max(0, profile.retirementAge - profile.currentAge);
  const retirementYears = Math.max(0, config.planningHorizon - profile.retirementAge);

  if (accounts.length === 0 || retirementYears <= 0) {
    return {
      years: [],
      depletionAge: null,
      totalNetIncomeGenerated: 0,
      totalTaxPaid: 0,
      accountDepletionAges: {},
    };
  }

  // Calculate projected balances at retirement (real terms)
  const months = yearsToRetirement * 12;
  const accountBalances: Record<string, number> = {};
  const accountTotalContributed: Record<string, number> = {};
  const accountRetirementBalances: Record<string, number> = {}; // Snapshot for tax calc reference

  for (const account of accounts) {
    const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
    const balance = calculateFutureValue(
      account.currentBalance,
      account.monthlyContribution,
      realReturn,
      months,
      account.annualContributionIncrease ?? 0
    );
    accountBalances[account.id] = balance;
    accountRetirementBalances[account.id] = balance;
    accountTotalContributed[account.id] = calculateTotalContributed(account, yearsToRetirement);
  }

  const initialPortfolio = Object.values(accountBalances).reduce((sum, b) => sum + b, 0);

  // Calculate the annual withdrawal amount
  let annualWithdrawal: number;
  if (config.strategy === 'fixed') {
    annualWithdrawal = config.fixedAnnualIncome;
  } else {
    // Percentage strategy: lock in initial withdrawal based on portfolio * rate
    annualWithdrawal = initialPortfolio * (config.withdrawalRate / 100);
  }

  const annualStatePension = profile.includeStatePension
    ? calculateAnnualStatePension(profile.statePensionAmount)
    : 0;

  const orderedAccounts = getOrderedAccounts(accounts, config.accountOrder);
  const SIPP_ACCESS_AGE = 57;

  const years: DrawdownYearResult[] = [];
  let depletionAge: number | null = null;
  let totalNetIncomeGenerated = 0;
  let totalTaxPaid = 0;
  const accountDepletionAges: Record<string, number | null> = {};
  let sippTaxFreeUsed: Record<string, number> = {};

  for (const account of accounts) {
    accountDepletionAges[account.id] = null;
  }

  for (let yearIndex = 0; yearIndex < retirementYears; yearIndex++) {
    const age = profile.retirementAge + yearIndex;
    const portfolioBalance = Object.values(accountBalances).reduce((sum, b) => sum + b, 0);

    // Check if portfolio already depleted
    if (portfolioBalance <= 0 && depletionAge === null) {
      depletionAge = age;
    }

    // State pension income this year
    const statePensionThisYear = age >= profile.statePensionAge ? annualStatePension : 0;

    // How much do we need from the portfolio?
    const portfolioWithdrawalNeeded = Math.max(0, annualWithdrawal - statePensionThisYear);

    // Withdraw from accounts
    let remainingToWithdraw = Math.min(portfolioWithdrawalNeeded, portfolioBalance);
    const yearWithdrawals: Record<string, number> = {};

    const isPensionAccessible = age >= SIPP_ACCESS_AGE;
    const isPensionType = (t: AccountType) => t === 'sipp' || t === 'pension';

    if (config.taxModeling && isPensionAccessible) {
      // Tax-efficient strategy: withdraw from pension/SIPP only up to the
      // remaining personal allowance (after state pension), so taxable pension
      // income stays within the PA and incurs zero tax. The 25% tax-free lump
      // sum is applied automatically in the tax calculation. The rest comes
      // from the highest priority account (ISA, etc.).
      const remainingPA = Math.max(0, PERSONAL_ALLOWANCE - statePensionThisYear);
      const taxEfficientCap = remainingPA;

      // First pass: withdraw from pension/SIPP up to the tax-efficient cap
      let pensionWithdrawn = 0;
      for (const account of orderedAccounts) {
        if (remainingToWithdraw <= 0 || pensionWithdrawn >= taxEfficientCap) break;
        if (!isPensionType(account.type)) continue;
        const balance = accountBalances[account.id] ?? 0;
        if (balance <= 0) continue;

        const withdrawal = Math.min(remainingToWithdraw, balance, taxEfficientCap - pensionWithdrawn);
        yearWithdrawals[account.id] = withdrawal;
        accountBalances[account.id] = balance - withdrawal;
        remainingToWithdraw -= withdrawal;
        pensionWithdrawn += withdrawal;

        if (accountBalances[account.id] <= 0 && accountDepletionAges[account.id] === null) {
          accountDepletionAges[account.id] = age;
        }
      }

      // Second pass: withdraw remainder from non-pension accounts in configured order
      for (const account of orderedAccounts) {
        if (remainingToWithdraw <= 0) break;
        if (isPensionType(account.type)) continue;
        const balance = accountBalances[account.id] ?? 0;
        if (balance <= 0) continue;

        const withdrawal = Math.min(remainingToWithdraw, balance);
        yearWithdrawals[account.id] = withdrawal;
        accountBalances[account.id] = balance - withdrawal;
        remainingToWithdraw -= withdrawal;

        if (accountBalances[account.id] <= 0 && accountDepletionAges[account.id] === null) {
          accountDepletionAges[account.id] = age;
        }
      }

      // Third pass: if still short, draw beyond the cap from pension (taxed but necessary)
      for (const account of orderedAccounts) {
        if (remainingToWithdraw <= 0) break;
        if (!isPensionType(account.type)) continue;
        const balance = accountBalances[account.id] ?? 0;
        if (balance <= 0) continue;

        const withdrawal = Math.min(remainingToWithdraw, balance);
        yearWithdrawals[account.id] = (yearWithdrawals[account.id] ?? 0) + withdrawal;
        accountBalances[account.id] = balance - withdrawal;
        remainingToWithdraw -= withdrawal;

        if (accountBalances[account.id] <= 0 && accountDepletionAges[account.id] === null) {
          accountDepletionAges[account.id] = age;
        }
      }
    } else {
      // Standard withdrawal: follow configured account order
      for (const account of orderedAccounts) {
        if (remainingToWithdraw <= 0) break;
        const balance = accountBalances[account.id] ?? 0;
        if (balance <= 0) continue;
        if (isPensionType(account.type) && !isPensionAccessible) continue;

        const withdrawal = Math.min(remainingToWithdraw, balance);
        yearWithdrawals[account.id] = withdrawal;
        accountBalances[account.id] = balance - withdrawal;
        remainingToWithdraw -= withdrawal;

        if (accountBalances[account.id] <= 0 && accountDepletionAges[account.id] === null) {
          accountDepletionAges[account.id] = age;
        }
      }
    }

    const grossWithdrawal = Object.values(yearWithdrawals).reduce((sum, w) => sum + w, 0);

    // Calculate tax — properly allocates between state pension and withdrawals
    const { totalTax, withdrawalTax, updatedSippTaxFreeUsed } = calculateWithdrawalTax(
      yearWithdrawals,
      accounts,
      accountRetirementBalances,
      accountTotalContributed,
      sippTaxFreeUsed,
      statePensionThisYear,
      config.taxModeling
    );
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
        accountBalances[account.id] = balance * (1 + config.drawdownReturnRate / 100);
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
    });
  }

  return {
    years,
    depletionAge,
    totalNetIncomeGenerated,
    totalTaxPaid,
    accountDepletionAges,
  };
}
