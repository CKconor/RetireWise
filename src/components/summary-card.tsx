'use client';

import { Account, UserProfile, LumpSumWithdrawal, ProjectionBaseline } from '@/types';
import {
  calculateTotalBalance,
  calculateTotalContributions,
  calculateProjectedTotalReal,
  calculateProjectedTotal,
  calculateProgress,
  calculateRequiredContribution,
  calculateAverageReturnRate,
  getYearsToRetirement,
  formatCurrency,
  calculateTotalRetirementIncome,
  calculateStatePensionEquivalent,
} from '@/lib/calculations';

interface SummaryCardProps {
  accounts: Account[];
  profile: UserProfile;
  lumpSumWithdrawals?: LumpSumWithdrawal[];
  projectionBaseline?: ProjectionBaseline;
}

export function SummaryCard({ accounts, profile, lumpSumWithdrawals = [], projectionBaseline }: SummaryCardProps) {
  if (accounts.length === 0) {
    return (
      <div className="card-hero rounded-2xl p-6 text-white dark:text-[#1a1a1a] shadow-xl shadow-[#0c1929]/30 dark:shadow-amber-900/40">
        <div className="relative z-10 flex flex-col items-center py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 dark:bg-white/20 ring-2 ring-white/20 dark:ring-black/20">
            <svg className="h-8 w-8 text-amber-400 dark:text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-4 font-display text-xl">No projection yet</p>
          <p className="mt-2 text-sm text-white/70 dark:text-[#1a1a1a]/70">
            Add accounts to see your retirement forecast
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="badge-gold text-xs">
              {getYearsToRetirement(profile)} years to retirement
            </span>
          </div>
        </div>
      </div>
    );
  }

  const totalBalance = calculateTotalBalance(accounts);
  const monthlyContributions = calculateTotalContributions(accounts);

  // Baseline comparison: find expected total for the current calendar year
  const currentYear = new Date().getFullYear();
  const baselinePoint = projectionBaseline?.yearlyPoints.find((p) => p.calendarYear === currentYear);
  const baselineDelta = baselinePoint !== undefined ? totalBalance - baselinePoint.expectedTotal : null;
  const projectedTotalReal = calculateProjectedTotalReal(accounts, profile, lumpSumWithdrawals);
  const projectedTotalNominal = calculateProjectedTotal(accounts, profile, lumpSumWithdrawals);
  const yearsToRetirement = getYearsToRetirement(profile);
  const avgReturn = calculateAverageReturnRate(accounts);

  // State Pension calculations
  const statePensionEquivalent = calculateStatePensionEquivalent(profile);
  const effectiveTarget = profile.targetAmount - statePensionEquivalent;
  const progress = calculateProgress(projectedTotalReal, effectiveTarget);
  const surplus = projectedTotalReal - effectiveTarget;
  const isOnTrack = surplus >= 0;
  const retirementIncome = calculateTotalRetirementIncome(projectedTotalReal, profile);

  const requiredContribution = calculateRequiredContribution(
    totalBalance,
    effectiveTarget,
    yearsToRetirement,
    avgReturn,
    profile.expectedInflation
  );

  const potentialReduction = monthlyContributions - requiredContribution;
  const reductionPercentage = monthlyContributions > 0
    ? Math.round((potentialReduction / monthlyContributions) * 100)
    : 0;

  return (
    <div className="card-hero rounded-2xl p-6 text-white dark:text-[#1a1a1a] shadow-xl shadow-[#0c1929]/30 dark:shadow-amber-900/40">
      <div className="relative z-10">
        {/* Header with status */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/70 dark:text-[#1a1a1a]/80">Projected at Retirement</p>
            <p className="stat-value-xl mt-1">{formatCurrency(projectedTotalReal)}</p>
            <p className="mt-1 text-sm text-white/50 dark:text-[#1a1a1a]/50">
              {formatCurrency(projectedTotalNominal)} before inflation
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="badge-gold text-xs">
                {yearsToRetirement} years to go
              </span>
              <span className="text-xs text-white/60 dark:text-[#1a1a1a]/60">in today's money</span>
            </div>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isOnTrack
              ? 'bg-teal-500/20 dark:bg-white/20 ring-2 ring-teal-400/30 dark:ring-teal-700/50'
              : 'bg-amber-500/20 dark:bg-white/20 ring-2 ring-amber-400/30 dark:ring-amber-900/50'
          }`}>
            {isOnTrack ? (
              <svg className="h-6 w-6 text-teal-400 dark:text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-amber-400 dark:text-amber-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-white/70 dark:text-[#1a1a1a]/80">Progress to Target</span>
            <span className="font-semibold">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 dark:bg-black/15">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isOnTrack
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-400'
                  : 'bg-gradient-to-r from-amber-400 to-orange-400'
              }`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className="mt-6 rounded-xl bg-white/10 dark:bg-white/20 p-4 backdrop-blur-sm">
          {isOnTrack ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="status-dot status-dot-success" />
                <p className="text-sm font-semibold text-teal-300 dark:text-teal-700">
                  On track! {formatCurrency(surplus)} above target
                </p>
              </div>
              {potentialReduction > 0 && (
                <p className="flex items-start gap-2 text-xs text-white/70 dark:text-[#1a1a1a]/70">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400 dark:text-amber-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>
                    You could reduce contributions by <span className="font-semibold text-amber-300 dark:text-amber-900">{formatCurrency(potentialReduction)}/month</span> ({reductionPercentage}%) and still hit your target
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="status-dot status-dot-warning" />
                <p className="text-sm font-semibold text-amber-300 dark:text-amber-900">
                  {formatCurrency(Math.abs(surplus))} below target
                </p>
              </div>
              <p className="flex items-start gap-2 text-xs text-white/70 dark:text-[#1a1a1a]/70">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-400 dark:text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>
                  Increase contributions by <span className="font-semibold text-teal-300 dark:text-teal-700">{formatCurrency(requiredContribution - monthlyContributions)}/month</span> to reach your target
                </span>
              </p>
            </div>
          )}
        </div>

        {/* State Pension & Income section */}
        {profile.includeStatePension && statePensionEquivalent > 0 && (
          <div className="mt-4 rounded-xl bg-white/10 dark:bg-white/20 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-4 w-4 text-violet-400 dark:text-violet-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-medium text-violet-300 dark:text-violet-900">State Pension Impact</span>
            </div>
            <div className="space-y-2 text-sm">
              {profile.statePensionAge > profile.retirementAge && (
                <div className="flex justify-between text-xs mb-2 pb-2 border-b border-white/10 dark:border-black/10">
                  <span className="text-amber-300 dark:text-amber-900">Gap before State Pension</span>
                  <span className="text-amber-300 dark:text-amber-900">{profile.statePensionAge - profile.retirementAge} years (ages {profile.retirementAge}-{profile.statePensionAge})</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/70 dark:text-[#1a1a1a]/80">Income from age {profile.statePensionAge}</span>
                <span className="font-semibold">{formatCurrency(retirementIncome.totalIncome)}/yr</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50 dark:text-[#1a1a1a]/60">From portfolio (4% withdrawal)</span>
                <span className="text-white/70 dark:text-[#1a1a1a]/80">{formatCurrency(retirementIncome.portfolioIncome)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50 dark:text-[#1a1a1a]/60">From State Pension</span>
                <span className="text-violet-300 dark:text-violet-900">{formatCurrency(retirementIncome.statePensionIncome)}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/10 dark:border-black/10 flex justify-between">
                <span className="text-white/70 dark:text-[#1a1a1a]/80">Reduces target by</span>
                <span className="font-semibold text-teal-300 dark:text-teal-700">{formatCurrency(statePensionEquivalent)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Baseline comparison */}
        {baselineDelta !== null && (
          <div className="mt-4 rounded-xl bg-white/10 dark:bg-white/20 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-amber-400 dark:text-amber-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-white/80 dark:text-[#1a1a1a]/80">vs. Baseline</span>
              </div>
              <span className={`text-sm font-semibold ${baselineDelta >= 0 ? 'text-teal-300 dark:text-teal-700' : 'text-rose-300 dark:text-rose-700'}`}>
                {baselineDelta >= 0 ? '+' : ''}{formatCurrency(Math.round(baselineDelta))}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/50 dark:text-[#1a1a1a]/60">
              Baseline expected {formatCurrency(Math.round(baselinePoint!.expectedTotal))} today
            </p>
          </div>
        )}

        {/* Inflation note */}
        <p className="mt-4 text-center text-xs text-white/50 dark:text-[#1a1a1a]/60">
          Adjusted for {profile.expectedInflation}% annual inflation
        </p>
      </div>
    </div>
  );
}
