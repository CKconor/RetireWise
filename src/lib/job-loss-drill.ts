import { Account, AccountType, JobLossDrillInputs, LumpSumWithdrawal, UserProfile } from '@/types';
import { getContributionForYear, getRetirementAccounts } from '@/lib/calculations';
import { scaleContributions } from '@/lib/over-saving';
import { calculateWithdrawalTax, drawFromAccounts } from '@/lib/drawdown';
import { findSmallestPassing, getProjectedPot, type RetirementPlan } from '@/lib/retirement-simulator';
import { PRIVATE_PENSION_ACCESS_AGE } from '@/lib/uk-figures';

/** The order money is spent if income stops. Pensions come after these, as a last resort. */
const ACCESSIBLE_ORDER: AccountType[] = ['savings', 'isa', 'gia'];

const isPension = (account: Account) => account.type === 'pension' || account.type === 'sipp';
const total = (accounts: Account[]) => accounts.reduce((sum, account) => sum + account.currentBalance, 0);

export interface RunwayInput {
  /** All accounts, including Emergency cash */
  accounts: Account[];
  profile: UserProfile;
  livingCostsMonthly: number;
  /** Money expected if work stops, spent before anything else */
  moneyReceived?: number;
}

export interface RunwayStep {
  label: string;
  amount: number;
  /** How many whole months of Living costs are covered once this money has been spent too */
  coversThroughMonth: number;
}

export interface PensionLastResort {
  balance: number;
  /** What must leave the pension each month to leave the Living costs after tax */
  monthlyWithdrawal: number;
  monthlyTax: number;
  extraMonths: number;
}

export interface Runway {
  hasEmergencyCash: boolean;
  emergencyCashMonths: number;
  accessibleMonths: number;
  /** Money spent in order. Pensions aren't included */
  steps: RunwayStep[];
  /** The month accessible money runs out, or null with no Living costs to pay */
  runsOutInMonth: number | null;
  monthlyShortfall: number;
  /** Before the access age, pensions can't help */
  pensionIsLocked: boolean;
  pensionAccessAge: number;
  lockedPensionBalance: number;
  pensionLastResort: PensionLastResort | null;
}

export function calculateRunway({ accounts, profile, livingCostsMonthly, moneyReceived = 0 }: RunwayInput): Runway {
  const emergencyCash = accounts.filter((account) => account.isEmergencyCash);
  const others = accounts.filter((account) => !account.isEmergencyCash);
  const pensions = others.filter(isPension);

  const sources = [
    { label: 'Money you expect to receive', amount: moneyReceived },
    { label: 'Emergency cash', amount: total(emergencyCash) },
    ...ACCESSIBLE_ORDER.map((type) => ({
      label: { savings: 'Other savings', isa: 'ISAs', gia: 'GIAs' }[type as 'savings' | 'isa' | 'gia'],
      amount: total(others.filter((account) => account.type === type)),
    })),
  ].filter((source) => source.amount > 0);

  const monthsOf = (amount: number) => (livingCostsMonthly > 0 ? Math.floor(amount / livingCostsMonthly) : 0);

  let spent = 0;
  const steps: RunwayStep[] = sources.map((source) => {
    spent += source.amount;
    return { ...source, coversThroughMonth: monthsOf(spent) };
  });

  const pensionIsLocked = profile.currentAge < PRIVATE_PENSION_ACCESS_AGE;

  return {
    hasEmergencyCash: emergencyCash.length > 0,
    emergencyCashMonths: monthsOf(moneyReceived + total(emergencyCash)),
    accessibleMonths: monthsOf(spent),
    steps,
    runsOutInMonth: livingCostsMonthly > 0 ? monthsOf(spent) + 1 : null,
    monthlyShortfall: livingCostsMonthly,
    pensionIsLocked,
    pensionAccessAge: PRIVATE_PENSION_ACCESS_AGE,
    lockedPensionBalance: pensionIsLocked ? total(pensions) : 0,
    pensionLastResort: pensionIsLocked ? null : estimatePensionLastResort(pensions, profile, livingCostsMonthly),
  };
}

/** Based on this year's tax. Tax-free cash runs out over time, so later years could cost more. */
function estimatePensionLastResort(pensions: Account[], profile: UserProfile, livingCostsMonthly: number): PensionLastResort | null {
  const balance = total(pensions);
  if (balance <= 0 || livingCostsMonthly <= 0) return null;

  const balancesAtStart = Object.fromEntries(pensions.map((account) => [account.id, account.currentBalance]));
  const taxOn = (annualWithdrawal: number) =>
    calculateWithdrawalTax({
      withdrawals: drawFromAccounts(pensions, { ...balancesAtStart }, annualWithdrawal, profile.currentAge, 0, false),
      accounts: pensions,
      accountRetirementBalances: balancesAtStart,
      accountTotalContributed: {},
      sippTaxFreeUsed: {},
      statePensionIncome: 0,
      taxModeling: true,
    }).totalTax;

  const annualNeed = livingCostsMonthly * 12;
  const annualWithdrawal = findSmallestPassing(
    (extra) => annualNeed + extra - taxOn(annualNeed + extra) >= annualNeed,
    { limit: annualNeed * 2, precision: 0.01 }
  );
  if (annualWithdrawal === null) return null;

  const gross = annualNeed + annualWithdrawal;
  return {
    balance,
    monthlyWithdrawal: gross / 12,
    monthlyTax: taxOn(gross) / 12,
    extraMonths: Math.floor(balance / (gross / 12)),
  };
}

export const DEFAULT_DRILL_INPUTS: JobLossDrillInputs = { monthsOutOfWork: 6, moneyReceived: 0, restartPercent: 100 };

export interface JobLossDrill {
  runway: Runway;
  /** Living costs with nothing left to pay them, during the time out of work */
  unfundedLivingCosts: number;
  potBefore: number;
  potAfter: number;
  /** The same plan with the drill applied. The real plan isn't changed */
  planAfter: RetirementPlan;
}

/**
 * Applies time out of work, starting today. Saving stops, and Living costs are paid in order
 * from money received, Emergency cash, savings, ISAs and GIAs. What's missed or spent comes off
 * the accounts at the end of the year it falls in, so it also loses the growth after that.
 * Pensions aren't touched, even after the access age, as they're only a last resort.
 */
export function runJobLossDrill(
  plan: RetirementPlan,
  allAccounts: Account[],
  livingCostsMonthly: number,
  { monthsOutOfWork, moneyReceived, restartPercent }: JobLossDrillInputs
): JobLossDrill {
  const { currentAge } = plan.profile;
  const accounts = plan.accounts.map((account) => scaleContributions(account, restartPercent / 100));
  const lumpSums: LumpSumWithdrawal[] = [];
  const takeOut = (accountId: string, amount: number, age: number, name: string) => {
    if (amount > 0) lumpSums.push({ id: `drill-${accountId}-${age}-${name}`, name, amount, age, accountId });
  };

  const inRetirementPot = new Set(getRetirementAccounts(allAccounts).map((account) => account.id));
  const spendOrder = [
    ...allAccounts.filter((account) => account.isEmergencyCash),
    ...ACCESSIBLE_ORDER.flatMap((type) => allAccounts.filter((account) => !account.isEmergencyCash && account.type === type)),
  ];
  const available = new Map(spendOrder.map((account) => [account.id, account.currentBalance]));

  let received = moneyReceived;
  let unfundedLivingCosts = 0;

  for (let year = 1, monthsLeft = monthsOutOfWork; monthsLeft > 0; year++, monthsLeft -= 12) {
    const months = Math.min(12, monthsLeft);
    const age = currentAge + year;

    for (const account of accounts) {
      takeOut(account.id, getContributionForYear(account, age - 1, year - 1) * months, age, 'Missed saving');
    }

    let toPay = livingCostsMonthly * months;
    const fromReceived = Math.min(toPay, received);
    received -= fromReceived;
    toPay -= fromReceived;

    for (const account of spendOrder) {
      const take = Math.min(toPay, available.get(account.id) ?? 0);
      if (take <= 0) continue;
      available.set(account.id, (available.get(account.id) ?? 0) - take);
      toPay -= take;
      if (inRetirementPot.has(account.id)) takeOut(account.id, take, age, 'Living costs');
    }
    unfundedLivingCosts += toPay;
  }

  const planAfter: RetirementPlan = { ...plan, accounts, withdrawals: [...plan.withdrawals, ...lumpSums] };

  return {
    runway: calculateRunway({ accounts: allAccounts, profile: plan.profile, livingCostsMonthly, moneyReceived }),
    unfundedLivingCosts,
    potBefore: getProjectedPot(plan),
    potAfter: getProjectedPot(planAfter),
    planAfter,
  };
}
