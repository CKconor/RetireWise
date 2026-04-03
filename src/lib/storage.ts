import { AppState, Account, UserProfile, DrawdownConfig, NetWorthSnapshot, LumpSumWithdrawal } from '@/types';
import { calculateAgeFromBirthday } from '@/lib/calculations';

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
        projectionBaseline: parsed.projectionBaseline,
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
