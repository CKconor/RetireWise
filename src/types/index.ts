export type AccountType = 'isa' | 'sipp' | 'pension' | 'gia' | 'savings';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
  monthlyContribution: number;
  annualReturnRate: number; // percentage, e.g., 7 for 7%
}

export interface UserProfile {
  currentAge: number;
  retirementAge: number;
  targetAmount: number;
  expectedInflation: number; // percentage, e.g., 2.5 for 2.5%
}

export interface AppState {
  profile: UserProfile;
  accounts: Account[];
}

export interface ProjectionDataPoint {
  year: number;
  age: number;
  label: string; // e.g., "Y0", "Y1", etc.
  total: number;
  totalReal: number; // inflation-adjusted
  [accountId: string]: number | string;
}

export interface AccountProjection {
  accountId: string;
  accountName: string;
  projectedValue: number;
  projectedValueReal: number;
  growth: number;
  growthPercentage: number;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  isa: 'ISA',
  sipp: 'SIPP',
  pension: 'Pension',
  gia: 'General Investment',
  savings: 'Savings',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; text: string }> = {
  isa: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  sipp: { bg: 'bg-pink-100', text: 'text-pink-700' },
  pension: { bg: 'bg-orange-100', text: 'text-orange-700' },
  gia: { bg: 'bg-teal-100', text: 'text-teal-700' },
  savings: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

export const DEFAULT_RETURN_RATES: Record<AccountType, number> = {
  isa: 7,
  sipp: 7,
  pension: 7,
  gia: 7,
  savings: 3.5,
};
