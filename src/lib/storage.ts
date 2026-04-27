import { AppState, Account, UserProfile, DrawdownConfig, NetWorthSnapshot, LumpSumWithdrawal, ProjectionBaseline, BaselineMonthPoint } from '@/types';
import { calculateAgeFromBirthday } from '@/lib/calculations';

function migrateLegacyBaseline(raw: unknown): ProjectionBaseline | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const b = raw as Record<string, unknown>;

  if (Array.isArray(b.monthlyPoints)) return raw as ProjectionBaseline;
  if (!Array.isArray(b.yearlyPoints)) return undefined;

  // Each yearly point represents the expected value at the anniversary of setDate.
  // Use setDate's month as the anchor and linearly interpolate between yearly points
  // to produce per-month expected values.
  const setDate = typeof b.setDate === 'string' ? b.setDate : '';
  const anchor = setDate ? new Date(setDate + 'T00:00:00') : new Date();
  const setMonth = anchor.getMonth() + 1; // 1-12

  type RawPt = Record<string, unknown>;
  const yearlyPoints = b.yearlyPoints as RawPt[];
  const yearMap = new Map<number, RawPt>();
  for (const pt of yearlyPoints) {
    if (typeof pt.calendarYear === 'number') yearMap.set(pt.calendarYear as number, pt);
  }

  const lerp = (a: number, b: number, t: number) => a + t * (b - a);

  const monthlyPoints: BaselineMonthPoint[] = [];
  for (const pt of yearlyPoints) {
    if (typeof pt.calendarYear !== 'number') continue;
    const year = pt.calendarYear as number;
    const prevPt = yearMap.get(year - 1);
    const nextPt = yearMap.get(year + 1);

    for (let m = 1; m <= 12; m++) {
      // Months ahead of the annual anchor (year, setMonth).
      // m >= setMonth → interpolate forward to next year.
      // m < setMonth  → interpolate backward from prev year.
      let expectedTotal: number;
      const expectedAccountBalances: Record<string, number> = {};
      const ptAccounts = (pt.expectedAccountBalances ?? {}) as Record<string, number>;

      if (m >= setMonth) {
        const t = (m - setMonth) / 12;
        const ref = nextPt ?? pt;
        const refAccounts = (ref.expectedAccountBalances ?? {}) as Record<string, number>;
        expectedTotal = lerp(pt.expectedTotal as number, ref.expectedTotal as number, t);
        for (const id of Object.keys(ptAccounts)) {
          expectedAccountBalances[id] = lerp(ptAccounts[id], refAccounts[id] ?? ptAccounts[id], t);
        }
      } else {
        const t = (12 - setMonth + m) / 12;
        const ref = prevPt ?? pt;
        const refAccounts = (ref.expectedAccountBalances ?? {}) as Record<string, number>;
        expectedTotal = lerp(ref.expectedTotal as number, pt.expectedTotal as number, t);
        for (const id of Object.keys(ptAccounts)) {
          expectedAccountBalances[id] = lerp(refAccounts[id] ?? ptAccounts[id], ptAccounts[id], t);
        }
      }

      monthlyPoints.push({
        year,
        monthOfYear: m,
        age: pt.age as number,
        expectedTotal: Math.round(expectedTotal),
        expectedAccountBalances,
      });
    }
  }

  return {
    setDate: b.setDate as string,
    setTimestamp: b.setTimestamp as number,
    monthlyPoints,
    accountMeta: (b.accountMeta ?? {}) as ProjectionBaseline['accountMeta'],
  };
}

const STORAGE_KEY = 'retirewise-data';

const currentYear = new Date().getFullYear();

const DEFAULT_PROFILE: UserProfile = {
  birthday: `${currentYear - 30}-01-01`,
  currentAge: 30,
  retirementAge: 57,
  targetAmount: 1000000,
  expectedInflation: 2.5,
  annualSalary: 0,
  statePensionAmount: 221.20, // 2024/25 full new State Pension weekly rate
  statePensionAge: 67,
  includeStatePension: true,
};

export const DEFAULT_DRAWDOWN_CONFIG: DrawdownConfig = {
  strategy: 'percentage',
  fixedAnnualIncome: 40000,
  withdrawalRate: 4,
  drawdownReturnRate: 3,
  accountOrder: [],
  planningHorizon: 90,
  taxModeling: true,
};

const DEFAULT_STATE: AppState = {
  profile: DEFAULT_PROFILE,
  accounts: [],
  drawdownConfig: DEFAULT_DRAWDOWN_CONFIG,
  netWorthHistory: [],
  lumpSumWithdrawals: [],
};

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AppState;
      const profile = { ...DEFAULT_PROFILE, ...parsed.profile };

      // Migration: synthesize birthday from currentAge if missing
      if (!parsed.profile?.birthday) {
        profile.birthday = `${currentYear - profile.currentAge}-01-01`;
      }

      // Always derive currentAge from birthday
      profile.currentAge = calculateAgeFromBirthday(profile.birthday);

      return {
        profile,
        accounts: parsed.accounts || [],
        drawdownConfig: { ...DEFAULT_DRAWDOWN_CONFIG, ...parsed.drawdownConfig },
        netWorthHistory: parsed.netWorthHistory || [],
        lumpSumWithdrawals: parsed.lumpSumWithdrawals || [],
        projectionBaseline: migrateLegacyBaseline(parsed.projectionBaseline),
      };
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
  }

  return DEFAULT_STATE;
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

export function generateAccountId(): string {
  return `account-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateWithdrawalId(): string {
  return `withdrawal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createWithdrawal(partial: Omit<LumpSumWithdrawal, 'id'>): LumpSumWithdrawal {
  return { id: generateWithdrawalId(), ...partial };
}

export function createAccount(partial: Partial<Account> & { name: string; type: Account['type'] }): Account {
  return {
    id: generateAccountId(),
    currentBalance: 0,
    monthlyContribution: 0,
    annualReturnRate: 7,
    annualContributionIncrease: 0,
    ...partial,
  };
}
