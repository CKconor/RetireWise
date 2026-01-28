export type AccountType = 'isa' | 'sipp' | 'pension' | 'gia' | 'savings';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
  monthlyContribution: number;
  annualReturnRate: number; // percentage, e.g., 7 for 7%
  annualContributionIncrease: number; // percentage, e.g., 2 for 2% yearly increase
}

export interface UserProfile {
  currentAge: number;
  retirementAge: number;
  targetAmount: number;
  expectedInflation: number; // percentage, e.g., 2.5 for 2.5%
  statePensionAmount: number; // weekly amount in GBP
  statePensionAge: number; // age when state pension starts (default 67)
  includeStatePension: boolean; // whether to include in projections
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
  overperformanceReal: number; // optimistic scenario (+2% returns)
  underperformanceReal: number; // pessimistic scenario (-2% returns)
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
  sipp: { bg: 'bg-rose-100', text: 'text-rose-700' },
  pension: { bg: 'bg-violet-100', text: 'text-violet-700' },
  gia: { bg: 'bg-sky-100', text: 'text-sky-700' },
  savings: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

export const DEFAULT_RETURN_RATES: Record<AccountType, number> = {
  isa: 7,
  sipp: 7,
  pension: 7,
  gia: 7,
  savings: 3.5,
};

export interface Milestone {
  percentage: number;       // 25, 50, 75, 100
  amount: number;           // Target amount for this milestone
  reached: boolean;
  projectedReachAge: number | null;
}

export interface WhatIfResult {
  scenario: string;
  projectedTotal: number;
  difference: number;
  percentChange: number;
}

export interface StressTestResult {
  dropPercent: number;
  postDropTotal: number;
  recoveryYears: number;
  stillMeetsTarget: boolean;
}
