import { Account, AccountType } from '@/types';
import { ENOUGH_LEVELS, evaluateVerdict, isOnLine, VERDICT_CASES, type EnoughLevel, type VerdictCaseId, type VerdictLine } from '@/lib/verdict';
import { ENOUGH_END_AGE, type RetirementPlan } from '@/lib/retirement-simulator';

const CUT_ORDER: AccountType[] = ['gia', 'savings', 'isa', 'sipp'];
const SPEND_ORDER: AccountType[] = ['gia', 'savings', 'isa'];
const ROUND_TO = 25;
const SPEND_NOW_SEARCH_LIMIT = 10_000_000;

const canCut = (account: Account) => CUT_ORDER.includes(account.type) || account.allowContributionCut === true;
const orderOf = (order: AccountType[], account: Account) => {
  const position = order.indexOf(account.type);
  return position === -1 ? order.length : position;
};

/** Scales an account's saving, including planned changes, so they shrink in proportion. */
export function scaleContributions(account: Account, factor: number): Account {
  return {
    ...account,
    monthlyContribution: account.monthlyContribution * factor,
    contributionChanges: account.contributionChanges?.map((change) => ({
      ...change,
      monthlyContribution: change.monthlyContribution * factor,
    })),
  };
}

/** Takes `cut` off monthly saving: GIAs, then savings, then ISAs, then SIPPs. Protected pensions stay. */
export function applyMonthlyCut(accounts: Account[], cut: number): { accounts: Account[]; cuttable: number; cutsSipp: boolean } {
  const cuttableAccounts = accounts.filter(canCut).sort((a, b) => orderOf(CUT_ORDER, a) - orderOf(CUT_ORDER, b));
  const factors = new Map<string, number>();
  let remaining = cut;
  let cutsSipp = false;

  for (const account of cuttableAccounts) {
    if (remaining <= 0 || account.monthlyContribution <= 0) continue;
    const taken = Math.min(remaining, account.monthlyContribution);
    factors.set(account.id, (account.monthlyContribution - taken) / account.monthlyContribution);
    remaining -= taken;
    if (account.type === 'sipp') cutsSipp = true;
  }

  return {
    accounts: accounts.map((account) => {
      const factor = factors.get(account.id);
      return factor === undefined ? account : scaleContributions(account, factor);
    }),
    cuttable: cuttableAccounts.reduce((sum, account) => sum + account.monthlyContribution, 0),
    cutsSipp,
  };
}

/** Takes a one-off amount from balances: GIAs, then savings, then ISAs. Never pensions. */
export function applyOneOffSpend(accounts: Account[], amount: number): { accounts: Account[]; spendable: number } {
  const spendFrom = accounts.filter((account) => SPEND_ORDER.includes(account.type)).sort((a, b) => orderOf(SPEND_ORDER, a) - orderOf(SPEND_ORDER, b));
  const taken = new Map<string, number>();
  let remaining = amount;
  for (const account of spendFrom) {
    const take = Math.min(remaining, account.currentBalance);
    taken.set(account.id, take);
    remaining -= take;
  }
  return {
    accounts: accounts.map((account) => ({ ...account, currentBalance: account.currentBalance - (taken.get(account.id) ?? 0) })),
    spendable: spendFrom.reduce((sum, account) => sum + account.currentBalance, 0),
  };
}

/** The largest multiple of £25 up to `limit` that keeps passing, assuming a smaller value also passes. */
function largestPassing(passes: (value: number) => boolean, limit: number): number {
  const steps = Math.floor(limit / ROUND_TO);
  let low = 0;
  let high = steps;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (passes(middle * ROUND_TO)) low = middle;
    else high = middle - 1;
  }
  return low * ROUND_TO;
}

export interface OverSavingLimit {
  level: EnoughLevel;
  caseId: VerdictCaseId;
}

export interface OverSavingLine {
  onLine: boolean;
  saveLessMonthly: number;
  spendNow: number;
  retireSoonerYears: number;
  /** The test that stops the save-less figure going higher. Null when it's only limited by what can be cut */
  limitedBy: OverSavingLimit | null;
  cutsSipp: boolean;
}

function firstFailedTest(plan: RetirementPlan): OverSavingLimit | null {
  const verdict = evaluateVerdict(plan);
  for (const { id: level } of ENOUGH_LEVELS) {
    for (const { id: caseId } of VERDICT_CASES) {
      if (!verdict[level][caseId].passed) return { level, caseId };
    }
  }
  return null;
}

function calculateLine(plan: RetirementPlan, line: VerdictLine): OverSavingLine {
  const holds = (changed: RetirementPlan) => isOnLine(evaluateVerdict(changed), line);

  if (!holds(plan)) {
    return { onLine: false, saveLessMonthly: 0, spendNow: 0, retireSoonerYears: 0, limitedBy: null, cutsSipp: false };
  }

  const withCut = (cut: number): RetirementPlan => ({ ...plan, accounts: applyMonthlyCut(plan.accounts, cut).accounts });
  const { cuttable } = applyMonthlyCut(plan.accounts, 0);
  const saveLessMonthly = largestPassing((cut) => holds(withCut(cut)), cuttable);

  const nextCut = saveLessMonthly + ROUND_TO;
  const limitedBy = nextCut <= cuttable ? firstFailedTest(withCut(nextCut)) : null;

  const { spendable } = applyOneOffSpend(plan.accounts, 0);
  const spendNow = largestPassing(
    (amount) => holds({ ...plan, accounts: applyOneOffSpend(plan.accounts, amount).accounts }),
    Math.min(spendable, SPEND_NOW_SEARCH_LIMIT)
  );

  let retireSoonerYears = 0;
  const { currentAge, retirementAge } = plan.profile;
  while (
    retirementAge - (retireSoonerYears + 1) >= currentAge &&
    retirementAge - (retireSoonerYears + 1) < ENOUGH_END_AGE &&
    holds({ ...plan, profile: { ...plan.profile, retirementAge: retirementAge - (retireSoonerYears + 1) } })
  ) {
    retireSoonerYears++;
  }

  return {
    onLine: true,
    saveLessMonthly,
    spendNow,
    retireSoonerYears,
    limitedBy,
    cutsSipp: applyMonthlyCut(plan.accounts, saveLessMonthly).cutsSipp,
  };
}

export function calculateOverSaving(plan: RetirementPlan): Record<VerdictLine, OverSavingLine> {
  return { secure: calculateLine(plan, 'secure'), strict: calculateLine(plan, 'strict') };
}
