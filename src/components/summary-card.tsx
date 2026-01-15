'use client';

import { Account, UserProfile } from '@/types';
import {
  calculateTotalBalance,
  calculateTotalContributions,
  calculateProjectedTotalReal,
  calculateProgress,
  calculateRequiredContribution,
  calculateAverageReturnRate,
  getYearsToRetirement,
  formatCurrency,
} from '@/lib/calculations';

interface SummaryCardProps {
  accounts: Account[];
  profile: UserProfile;
}

export function SummaryCard({ accounts, profile }: SummaryCardProps) {
  if (accounts.length === 0) {
    return (
      <div className="card-hero rounded-2xl p-6 text-white shadow-xl shadow-[#0c1929]/30">
        <div className="relative z-10 flex flex-col items-center py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
            <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-4 font-display text-xl text-white">No projection yet</p>
          <p className="mt-2 text-sm text-white/60">
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
  const projectedTotalReal = calculateProjectedTotalReal(accounts, profile);
  const progress = calculateProgress(projectedTotalReal, profile.targetAmount);
  const yearsToRetirement = getYearsToRetirement(profile);
  const surplus = projectedTotalReal - profile.targetAmount;
  const isOnTrack = surplus >= 0;
  const avgReturn = calculateAverageReturnRate(accounts);

  const requiredContribution = calculateRequiredContribution(
    totalBalance,
    profile.targetAmount,
    yearsToRetirement,
    avgReturn,
    profile.expectedInflation
  );

  const potentialReduction = monthlyContributions - requiredContribution;
  const reductionPercentage = monthlyContributions > 0
    ? Math.round((potentialReduction / monthlyContributions) * 100)
    : 0;

  return (
    <div className="card-hero rounded-2xl p-6 text-white shadow-xl shadow-[#0c1929]/30">
      <div className="relative z-10">
        {/* Header with status */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">Projected at Retirement</p>
            <p className="stat-value-xl mt-1 text-white">{formatCurrency(projectedTotalReal)}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="badge-gold text-xs">
                {yearsToRetirement} years to go
              </span>
              <span className="text-xs text-white/60">in today's money</span>
            </div>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isOnTrack
              ? 'bg-teal-500/20 ring-2 ring-teal-400/30'
              : 'bg-amber-500/20 ring-2 ring-amber-400/30'
          }`}>
            {isOnTrack ? (
              <svg className="h-6 w-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-white/70">Progress to Target</span>
            <span className="font-semibold text-white">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
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
        <div className="mt-6 rounded-xl bg-white/5 p-4 backdrop-blur-sm">
          {isOnTrack ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="status-dot status-dot-success" />
                <p className="text-sm font-semibold text-teal-300">
                  On track! {formatCurrency(surplus)} above target
                </p>
              </div>
              {potentialReduction > 0 && (
                <p className="flex items-start gap-2 text-xs text-white/70">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>
                    You could reduce contributions by <span className="font-semibold text-amber-300">{formatCurrency(potentialReduction)}/month</span> ({reductionPercentage}%) and still hit your target
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="status-dot status-dot-warning" />
                <p className="text-sm font-semibold text-amber-300">
                  {formatCurrency(Math.abs(surplus))} below target
                </p>
              </div>
              <p className="flex items-start gap-2 text-xs text-white/70">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>
                  Increase contributions by <span className="font-semibold text-teal-300">{formatCurrency(requiredContribution - monthlyContributions)}/month</span> to reach your target
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Inflation note */}
        <p className="mt-4 text-center text-xs text-white/50">
          Adjusted for {profile.expectedInflation}% annual inflation
        </p>
      </div>
    </div>
  );
}
