'use client';

import { Account, UserProfile } from '@/types';
import { Progress } from '@/components/ui/progress';
import {
  calculateTotalBalance,
  calculateTotalContributions,
  calculateProjectedTotalReal,
  calculateProgress,
  calculateRequiredContribution,
  formatCurrency,
} from '@/lib/calculations';

interface SummaryCardProps {
  accounts: Account[];
  profile: UserProfile;
}

export function SummaryCard({ accounts, profile }: SummaryCardProps) {
  const totalBalance = calculateTotalBalance(accounts);
  const monthlyContributions = calculateTotalContributions(accounts);
  const projectedTotalReal = calculateProjectedTotalReal(accounts, profile);
  const progress = calculateProgress(projectedTotalReal, profile.targetAmount);
  const yearsToRetirement = profile.retirementAge - profile.currentAge;
  const surplus = projectedTotalReal - profile.targetAmount;
  const isOnTrack = surplus >= 0;

  // Calculate average return rate
  const avgReturn = accounts.length > 0
    ? accounts.reduce((sum, acc) => sum + acc.annualReturnRate, 0) / accounts.length
    : 7;

  // Calculate how much could be reduced if on track
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
    <div className="rounded-xl bg-[#0f2744] p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-blue-200">Projected at Retirement</p>
          <p className="mt-1 text-4xl font-bold">{formatCurrency(projectedTotalReal)}</p>
          <p className="mt-1 text-sm text-blue-200">
            in {yearsToRetirement} years • in today's money
          </p>
          <p className="text-xs text-blue-300">
            Adjusted for {profile.expectedInflation}% annual inflation
          </p>
        </div>
        <div className={`rounded-full p-2 ${isOnTrack ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
          {isOnTrack ? (
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-blue-200">Progress to Target</span>
          <span className="font-medium">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-blue-900">
          <div
            className={`h-full transition-all duration-500 ${isOnTrack ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {isOnTrack ? (
          <>
            <p className="text-sm font-medium text-emerald-400">
              You're on track! {formatCurrency(surplus)} above target
            </p>
            {potentialReduction > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-blue-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                You could reduce contributions by {formatCurrency(potentialReduction)}/month ({reductionPercentage}%) and still hit your target
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-amber-400">
              {formatCurrency(Math.abs(surplus))} below target
            </p>
            <p className="flex items-center gap-1.5 text-xs text-blue-200">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Increase contributions by {formatCurrency(requiredContribution - monthlyContributions)}/month to reach your target
            </p>
          </>
        )}
      </div>
    </div>
  );
}
