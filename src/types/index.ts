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
  birthday: string; // ISO format YYYY-MM-DD
  currentAge: number; // derived from birthday
  retirementAge: number;
  targetAmount: number;
  expectedInflation: number; // percentage, e.g., 2.5 for 2.5%
  annualSalary: number; // gross annual salary in GBP
  statePensionAmount: number; // weekly amount in GBP
  statePensionAge: number; // age when state pension starts (default 67)
  includeStatePension: boolean; // whether to include in projections
}

export interface AppState {
  profile: UserProfile;
  accounts: Account[];
  drawdownConfig?: DrawdownConfig;
  netWorthHistory: NetWorthSnapshot[];
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

export interface MonthlyProjectionDataPoint {
  month: number;        // absolute month index (0, 1, 2, ...)
  year: number;         // calendar year
  monthOfYear: number;  // 1-12
  age: number;          // whole years
  ageMonths: number;    // months past last birthday
  total: number;        // nominal (not inflation-adjusted) total
  targetPercent: number; // % of inflation-adjusted target achieved
  accountBalances: Record<string, number>; // account id → nominal balance
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

// Net worth history types
export interface NetWorthSnapshot {
  date: string; // ISO YYYY-MM-DD
  timestamp: number;
  totalBalance: number;
  accountBalances: Record<string, { balance: number; name: string; type: AccountType }>;
}

// Drawdown types
export type WithdrawalStrategy = 'fixed' | 'percentage';

export interface DrawdownConfig {
  strategy: WithdrawalStrategy;
  fixedAnnualIncome: number;
  withdrawalRate: number; // percentage, e.g., 4 for 4%
  drawdownReturnRate: number; // percentage, e.g., 3 for 3% (conservative growth during retirement)
  accountOrder: string[]; // account IDs in withdrawal priority order
  planningHorizon: number; // age to plan to, e.g., 90
  taxModeling: boolean;
}

export interface DrawdownYearResult {
  age: number;
  grossWithdrawal: number;
  taxPaid: number;          // total tax for the year (income tax + CGT)
  withdrawalTax: number;    // tax on portfolio withdrawals only (excludes state pension tax)
  netWithdrawal: number;    // grossWithdrawal - withdrawalTax
  statePensionIncome: number;
  totalNetIncome: number;
  portfolioBalance: number;
  accountBalances: Record<string, number>;
  accountWithdrawals: Record<string, number>;
}

export interface DrawdownSimulationResult {
  years: DrawdownYearResult[];
  depletionAge: number | null;
  totalNetIncomeGenerated: number;
  totalTaxPaid: number;
  accountDepletionAges: Record<string, number | null>;
}

export interface MonteCarloYearData {
  age: number;
  p10: number; p25: number; p50: number; p75: number; p90: number;
}

export interface MonteCarloResult {
  years: MonteCarloYearData[];
  successRate: number;
  medianDepletionAge: number | null;
  numSimulations: number;
}
