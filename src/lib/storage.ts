import { AppState, Account, UserProfile } from '@/types';

const STORAGE_KEY = 'retirewise-data';

const DEFAULT_PROFILE: UserProfile = {
  currentAge: 30,
  retirementAge: 57,
  targetAmount: 1000000,
  expectedInflation: 2.5,
};

const DEFAULT_STATE: AppState = {
  profile: DEFAULT_PROFILE,
  accounts: [],
};

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AppState;
      return {
        profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        accounts: parsed.accounts || [],
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

export function createAccount(partial: Partial<Account> & { name: string; type: Account['type'] }): Account {
  return {
    id: generateAccountId(),
    currentBalance: 0,
    monthlyContribution: 0,
    annualReturnRate: 7,
    ...partial,
  };
}
