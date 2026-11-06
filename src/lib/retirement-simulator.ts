import { Account, LumpSumWithdrawal, UserProfile } from '@/types';
import { applyWithdrawalsToBalance, calculateAnnualStatePension } from '@/lib/calculations';
import { calculateWithdrawalTax, drawFromAccounts, getOrderedAccounts, projectRetirementPots } from '@/lib/drawdown';

/** Enough plans to this age. Living longer is a test of the plan, not part of Enough. */
export const ENOUGH_END_AGE = 90;

// How closely each year's withdrawal is worked out
const PENNY = 0.01;

// Small differences from that working-out, added up over decades, don't count as a shortfall
const SHORTFALL_TOLERANCE = 1;

export interface RetirementPlan {
  accounts: Account[];
  profile: UserProfile;
  withdrawals: LumpSumWithdrawal[];
  /** Yearly growth in retirement, after inflation, as a percentage */
  retirementReturn: number;
  accountOrder: string[];
}

export interface RetirementRun {
  /** After-tax spending to fund each month, in today's money */
  monthlySpending: number;
  endAge?: number;
  /** Replaces the projected pot at retirement, keeping its split between accounts */
  startingPot?: number;
  /** A fall just before retirement, on the accounts it applies to */
  fallAtRetirement?: { share: number; appliesTo: (account: Account) => boolean };
  /** Replaces the retirement return for a given year, counted from retirement */
  returnForYear?: (yearIndex: number, account: Account) => number;
}

export interface RetirementYear {
  age: number;
  spendingPaid: number;
  shortfall: number;
  endBalance: number;
}

export interface RetirementSimulation {
  years: RetirementYear[];
  firstShortfallAge: number | null;
}

export function simulateRetirement(plan: RetirementPlan, run: RetirementRun): RetirementSimulation {
  const { accounts, profile, withdrawals, retirementReturn, accountOrder } = plan;
  const { monthlySpending, endAge = ENOUGH_END_AGE, startingPot, fallAtRetirement, returnForYear } = run;

  const pots = projectRetirementPots(accounts, profile, withdrawals);
  const projectedPot = accounts.reduce((sum, account) => sum + pots.balances[account.id], 0);
  const scale = startingPot !== undefined && projectedPot > 0 ? startingPot / projectedPot : 1;

  const balances: Record<string, number> = {};
  const moneyPaidIn: Record<string, number> = {};
  const balancesAtRetirement: Record<string, number> = {};
  for (const account of accounts) {
    const fall = fallAtRetirement?.appliesTo(account) ? fallAtRetirement.share : 0;
    balances[account.id] = pots.balances[account.id] * scale * (1 - fall);
    balancesAtRetirement[account.id] = balances[account.id];
    moneyPaidIn[account.id] = pots.moneyPaidIn[account.id] * scale;
  }

  const orderedAccounts = getOrderedAccounts(accounts, accountOrder);
  const annualSpending = monthlySpending * 12;
  const annualStatePension = profile.includeStatePension ? calculateAnnualStatePension(profile.statePensionAmount) : 0;
  const alreadyRetired = profile.retirementAge <= profile.currentAge;

  const years: RetirementYear[] = [];
  let firstShortfallAge: number | null = null;
  let taxFreeCashUsed: Record<string, number> = {};

  for (let yearIndex = 0; yearIndex < endAge - profile.retirementAge; yearIndex++) {
    const age = profile.retirementAge + yearIndex;
    const statePension = age >= profile.statePensionAge ? annualStatePension : 0;

    if (yearIndex > 0 || alreadyRetired) {
      for (const account of accounts) {
        balances[account.id] = applyWithdrawalsToBalance(balances[account.id], account.id, withdrawals, { kind: 'annual', age });
      }
    }

    /** What this year looks like if `gross` is drawn from the accounts */
    const tryWithdrawing = (gross: number) => {
      const balancesAfter = { ...balances };
      const drawn = drawFromAccounts(orderedAccounts, balancesAfter, gross, age, statePension, true);
      const tax = calculateWithdrawalTax({
        withdrawals: drawn,
        accounts,
        accountRetirementBalances: balancesAtRetirement,
        accountTotalContributed: moneyPaidIn,
        sippTaxFreeUsed: taxFreeCashUsed,
        statePensionIncome: statePension,
        taxModeling: true,
      });
      const totalDrawn = Object.values(drawn).reduce((sum, amount) => sum + amount, 0);
      return {
        balancesAfter,
        taxFreeCashUsed: tax.updatedSippTaxFreeUsed,
        spendable: totalDrawn + statePension - tax.totalTax,
      };
    };

    // Find the smallest withdrawal that leaves the spending after tax
    let low = 0;
    let high = Object.values(balances).reduce((sum, balance) => sum + balance, 0);
    let chosen = tryWithdrawing(low);
    if (chosen.spendable < annualSpending) {
      chosen = tryWithdrawing(high);
      if (chosen.spendable >= annualSpending) {
        while (high - low > PENNY) {
          const middle = (low + high) / 2;
          const attempt = tryWithdrawing(middle);
          if (attempt.spendable >= annualSpending) {
            high = middle;
            chosen = attempt;
          } else {
            low = middle;
          }
        }
      }
    }

    const unpaid = annualSpending - chosen.spendable;
    const shortfall = unpaid > SHORTFALL_TOLERANCE ? unpaid : 0;
    if (shortfall > 0) firstShortfallAge ??= age;

    for (const account of accounts) {
      const growth = 1 + (returnForYear ? returnForYear(yearIndex, account) : retirementReturn) / 100;
      balances[account.id] = chosen.balancesAfter[account.id] * growth;
    }
    taxFreeCashUsed = chosen.taxFreeCashUsed;

    years.push({
      age,
      spendingPaid: annualSpending - shortfall,
      shortfall,
      endBalance: Object.values(balances).reduce((sum, balance) => sum + balance, 0),
    });
  }

  return { years, firstShortfallAge };
}

/** The pot at retirement a plan is projected to have, in today's money. */
export function getProjectedPot(plan: RetirementPlan): number {
  const { balances } = projectRetirementPots(plan.accounts, plan.profile, plan.withdrawals);
  return Object.values(balances).reduce((sum, balance) => sum + balance, 0);
}

/**
 * The smallest value from zero upwards at which `passes` holds, to within `precision`,
 * or null if it doesn't hold by `limit`. Assumes that once it passes, more also passes.
 */
export function findSmallestPassing(
  passes: (value: number) => boolean,
  { limit, precision = 1 }: { limit: number; precision?: number }
): number | null {
  if (passes(0)) return 0;
  if (!passes(limit)) return null;

  let low = 0;
  let high = limit;
  while (high - low > precision) {
    const middle = (low + high) / 2;
    if (passes(middle)) high = middle;
    else low = middle;
  }
  return high;
}

const ENOUGH_SEARCH_LIMIT = 100_000_000;

/**
 * The smallest pot at retirement that pays the spending in full to the end of the plan,
 * on expected returns, keeping the plan's split between accounts. With nothing projected
 * yet there is no split, so it's worked out as if the pot were in an ISA. Null when no
 * pot would work, such as when all the money sits in a pension that's still locked.
 */
export function calculateEnough(plan: RetirementPlan, monthlySpending: number): number | null {
  const hasSplit = getProjectedPot(plan) > 0;
  const planWithSplit: RetirementPlan = hasSplit
    ? plan
    : { ...plan, withdrawals: [], accounts: [ISA_STAND_IN] };

  const pot = findSmallestPassing(
    (startingPot) => simulateRetirement(planWithSplit, { monthlySpending, startingPot }).firstShortfallAge === null,
    { limit: ENOUGH_SEARCH_LIMIT }
  );
  return pot === null ? null : Math.ceil(pot);
}

/**
 * The profile everything should plan against. Once both spending totals are entered,
 * Lifestyle Enough takes the place of the typed-in target.
 */
export function resolvePlanningProfile(plan: RetirementPlan): UserProfile {
  const { essentialsMonthly, niceToHavesMonthly } = plan.profile;
  if (essentialsMonthly === undefined || niceToHavesMonthly === undefined) return plan.profile;

  const enough = calculateEnough(plan, essentialsMonthly + niceToHavesMonthly);
  return enough === null ? plan.profile : { ...plan.profile, targetAmount: enough, targetIsEnough: true };
}

const ISA_STAND_IN: Account = {
  id: 'enough-isa',
  name: 'ISA',
  type: 'isa',
  currentBalance: 1,
  monthlyContribution: 0,
  annualReturnRate: 0,
  annualContributionIncrease: 0,
};
