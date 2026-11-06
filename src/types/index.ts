export type AccountType = 'isa' | 'sipp' | 'pension' | 'gia' | 'savings';

export interface ContributionChange {
  id: string;
  age: number;               // age at which monthlyContribution takes effect
  monthlyContribution: number; // absolute £/mo from this age onward (until the next change, if any)
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
  monthlyContribution: number;
  annualReturnRate: number; // percentage, e.g., 7 for 7%
  annualContributionIncrease: number; // percentage, e.g., 2 for 2% yearly increase
  contributionChanges?: ContributionChange[]; // future contribution changes, in any order
  isEmergencyCash?: boolean; // savings set aside for a crisis: net worth, but not the retirement pot
  allowContributionCut?: boolean; // pension accounts only: Over-saving may reduce this saving
}

export interface UserProfile {
  birthday: string; // ISO format YYYY-MM-DD
  currentAge: number; // derived from birthday
  retirementAge: number;
  targetAmount: number;
  expectedInflation: number; // percentage, e.g., 2.5 for 2.5%
  annualSalary: number; // gross annual salary in GBP
  statePensionAmount: number; // weekly amount in GBP
  statePensionAge: number; // age when state pension starts
  statePensionAgeOverridden?: boolean; // true when set by hand, not from the birthday
  includeStatePension: boolean; // whether to include in projections
  essentialsMonthly?: number; // after-tax retirement spending, in today's money
  niceToHavesMonthly?: number; // after-tax retirement spending on top of Essentials
  longLifeAge?: number; // the age the long-life test plans to
  jobLossDrill?: JobLossDrillInputs; // the drill's last inputs, so it can be returned to
  livingCostsMonthly?: number; // what must still be paid each month today if income stopped
  targetIsEnough?: boolean; // derived: targetAmount is Lifestyle Enough, not a typed-in figure. Never saved
}

export interface JobLossDrillInputs {
  monthsOutOfWork: number;
  moneyReceived: number;
  /** Saving after returning to work, as a percentage of what it was */
  restartPercent: number;
}

export type LumpSumType = 'withdrawal' | 'deposit';

export interface LumpSumWithdrawal {
  id: string;
  name: string;
  amount: number;
  age: number;        // age at which the withdrawal/deposit occurs
  accountId: string;  // which account to draw from / pay into
  type?: LumpSumType; // 'withdrawal' (default, for backward compatibility) or 'deposit'
}

export interface AppState {
  profile: UserProfile;
  accounts: Account[];
  drawdownConfig?: DrawdownConfig;
  netWorthHistory: NetWorthSnapshot[];
  lumpSumWithdrawals: LumpSumWithdrawal[];
  lumpSumsEnabled?: boolean; // master on/off toggle for all planned withdrawals & lump sums (default true)
  projectionBaseline?: ProjectionBaseline;
}

export interface ProjectionDataPoint {
  year: number;
  age: number;
  label: string; // e.g., "Y0", "Y1", etc.
  total: number;
  totalReal: number; // inflation-adjusted (P50 / base)
  overperformanceReal: number; // +2 points of real return
  underperformanceReal: number; // -2 points of real return
  p90Real: number; // P90: +4% real return
  p10Real: number; // P10: -4% real return
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

// Net worth history types
export interface NetWorthSnapshot {
  date: string; // ISO YYYY-MM-DD
  timestamp: number;
  totalBalance: number;
  accountBalances: Record<string, { balance: number; name: string; type: AccountType }>;
}

// Projection baseline types
export interface BaselineMonthPoint {
  year: number;
  monthOfYear: number; // 1-12
  age: number;
  expectedTotal: number;
  expectedAccountBalances: Record<string, number>; // accountId → nominal balance
}

export interface ProjectionBaseline {
  setDate: string; // ISO YYYY-MM-DD
  setTimestamp: number;
  monthlyPoints: BaselineMonthPoint[];
  accountMeta: Record<string, { name: string; type: AccountType }>;
}

// Drawdown types
export type WithdrawalStrategy = 'fixed' | 'percentage';

export interface DrawdownConfig {
  strategy: WithdrawalStrategy;
  fixedAnnualIncome: number;
  withdrawalRate: number; // percentage, e.g., 4 for 4%
  drawdownReturnRate: number; // percentage after inflation, e.g., 2 for 2% (conservative growth during retirement)
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
  shortfall: number;        // portfolio income needed this year that could not be paid
}

export interface DrawdownSimulationResult {
  years: DrawdownYearResult[];
  depletionAge: number | null;
  firstShortfallAge: number | null; // first year income fell short, including while a pension is locked
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
  lowestYearlyIncome: number; // 1-in-10 bad run: 10th percentile of each run's lowest yearly income
  medianDepletionAge: number | null;
  numSimulations: number;
}
