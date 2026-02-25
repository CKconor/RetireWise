'use client';

import { Account, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import {
  calculateTotalBalance,
  calculateProjectedTotalReal,
  calculatePercentageOfTarget,
  generateProjection,
  formatCurrency,
  formatCurrencyCompact,
  calculateTargetReachAge,
  calculateRequiredBalanceNow,
} from '@/lib/calculations';

interface MilestoneTrackerProps {
  accounts: Account[];
  profile: UserProfile;
}

const BadgeIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

export function MilestoneTracker({ accounts, profile }: MilestoneTrackerProps) {
  const currentBalance = calculateTotalBalance(accounts);
  const projectedTotal = calculateProjectedTotalReal(accounts, profile);
  const projection = generateProjection(accounts, profile);

  const currentProgress = calculatePercentageOfTarget(currentBalance, profile.targetAmount, false);
  const isOnTarget = projectedTotal >= profile.targetAmount;

  // How much ahead/behind the required balance to be on track right now
  const requiredBalanceNow = calculateRequiredBalanceNow(accounts, profile, profile.targetAmount);
  const currentValueGap = currentBalance - requiredBalanceNow;

  // Build milestones
  const percentageMilestones = [10, 25, 50, 75, 100].map(percentage => ({
    amount: (profile.targetAmount * percentage) / 100,
    label: `${percentage}%`,
  }));

  const allMilestoneAmounts = [...percentageMilestones]
    .filter(m => m.amount <= profile.targetAmount)
    .sort((a, b) => a.amount - b.amount)
    .filter((m, i, arr) => i === 0 || Math.abs(m.amount - arr[i - 1].amount) > 1000);

  const milestones = allMilestoneAmounts.map(m => {
    const reached = currentBalance >= m.amount;
    const percentage = calculatePercentageOfTarget(m.amount, profile.targetAmount, false);

    let projectedReachAge: number | null = null;
    for (const point of projection) {
      if (point.totalReal >= m.amount) {
        projectedReachAge = point.age;
        break;
      }
    }

    return { percentage, amount: m.amount, label: m.label, reached, projectedReachAge };
  });

  const nextMilestone = milestones.find(m => !m.reached);
  const reachedCount = milestones.filter(m => m.reached).length;

  // Schedule gap: how many years ahead/behind of retirement are they to hit the target
  const targetReachAge = calculateTargetReachAge(accounts, profile);
  const scheduleGapYears = targetReachAge !== null ? profile.retirementAge - targetReachAge : null;
  const isAheadOfSchedule = scheduleGapYears !== null && scheduleGapYears > 0;

  if (accounts.length === 0) {
    return (
      <SectionCard icon={<BadgeIcon />} title="Milestones">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-6 w-6 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="font-display text-2xl text-foreground">Start your journey</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts to track your milestones</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={<BadgeIcon />}
      title="Milestones"
      action={
        <span className="badge-gold">
          {reachedCount}/{milestones.length} reached
        </span>
      }
      contentClassName="space-y-5"
    >
      {/* Progress Bar with Milestones */}
      <div className="relative pt-2">
        {/* Track */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isOnTarget
                ? 'bg-gradient-to-r from-teal-500 to-emerald-400'
                : 'bg-gradient-to-r from-amber-400 to-amber-500'
            }`}
            style={{ width: `${Math.min(100, currentProgress)}%` }}
          />
        </div>

        {/* Milestone Markers */}
        <div className="absolute inset-x-0 top-0">
          {milestones.map((milestone) => (
            <div
              key={milestone.amount}
              className="absolute -translate-x-1/2"
              style={{ left: `${milestone.percentage}%` }}
            >
              <div
                className={`milestone-marker ${
                  milestone.reached
                    ? 'milestone-marker-reached'
                    : milestone === nextMilestone
                    ? 'milestone-marker-next'
                    : 'milestone-marker-pending'
                }`}
              >
                {milestone.reached ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-bold">{milestone.label.replace('%', '')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Cards */}
      <div className="grid grid-cols-5 gap-2">
        {milestones.map((milestone, index) => (
          <div
            key={milestone.amount}
            className={`group relative rounded-xl p-3 text-center transition-all duration-300 ${
              milestone.reached
                ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-1 ring-teal-200 dark:ring-teal-700'
                : milestone === nextMilestone
                ? isOnTarget
                  ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-1 ring-teal-200 dark:ring-teal-700'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/30 ring-1 ring-amber-200 dark:ring-amber-700'
                : 'bg-slate-50/50 dark:bg-slate-800/50'
            }`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <p className={`font-display text-xl ${
              milestone.reached
                ? 'text-teal-700 dark:text-teal-300'
                : milestone === nextMilestone
                ? isOnTarget ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}>
              {milestone.label}
            </p>
            <p className={`mt-0.5 text-xs ${
              milestone.reached ? 'text-teal-600/70 dark:text-teal-400/70' : 'text-slate-400 dark:text-slate-500'
            }`}>
              {formatCurrencyCompact(milestone.amount)}
            </p>
            {milestone.reached ? (
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Done
              </span>
            ) : milestone.projectedReachAge ? (
              <span className="mt-1.5 inline-block text-xs text-slate-500 dark:text-slate-400">
                Age {milestone.projectedReachAge}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {/* Schedule Gap */}
      {targetReachAge !== null ? (
        <div className={`rounded-xl p-4 ring-1 ${
          isAheadOfSchedule
            ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-teal-200 dark:ring-teal-700'
            : 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/30 ring-amber-200 dark:ring-amber-700'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${
                isAheadOfSchedule ? 'text-teal-800 dark:text-teal-200' : 'text-amber-800 dark:text-amber-200'
              }`}>
                {isAheadOfSchedule
                  ? `${Math.abs(scheduleGapYears!)} year${Math.abs(scheduleGapYears!) !== 1 ? 's' : ''} ahead of schedule`
                  : `${Math.abs(scheduleGapYears!)} year${Math.abs(scheduleGapYears!) !== 1 ? 's' : ''} behind schedule`
                }
                {currentValueGap !== 0 && (
                  <span className="ml-2 font-normal opacity-80">
                    · {formatCurrency(Math.abs(currentValueGap))} {currentValueGap >= 0 ? 'ahead' : 'behind'} now
                  </span>
                )}
              </p>
              <p className={`text-xs ${
                isAheadOfSchedule ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                On track to hit target at age {targetReachAge}, retirement at {profile.retirementAge}
              </p>
            </div>
            <div className={`rounded-lg px-3 py-1.5 ${
              isAheadOfSchedule ? 'bg-teal-100/80 dark:bg-teal-900/50' : 'bg-amber-100/80 dark:bg-amber-900/50'
            }`}>
              <p className={`text-xs font-medium ${
                isAheadOfSchedule ? 'text-teal-700 dark:text-teal-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                Age {targetReachAge}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-4 ring-1 bg-gradient-to-r from-rose-50 to-red-50/50 dark:from-rose-900/30 dark:to-red-900/30 ring-rose-200 dark:ring-rose-700">
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Target may not be reached</p>
          <p className="text-xs text-rose-600 dark:text-rose-400">Consider increasing contributions or adjusting your target</p>
        </div>
      )}

      {/* Next Milestone Message */}
      {nextMilestone ? (
        <div className={`rounded-xl p-4 ${
          isOnTarget
            ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-1 ring-teal-200 dark:ring-teal-700'
            : 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/30 ring-1 ring-amber-200 dark:ring-amber-700'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${isOnTarget ? 'text-teal-800 dark:text-teal-200' : 'text-amber-800 dark:text-amber-200'}`}>
                Next: {formatCurrency(nextMilestone.amount)}
              </p>
              <p className={`text-xs ${isOnTarget ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {formatCurrency(nextMilestone.amount - currentBalance)} to go
              </p>
            </div>
            {nextMilestone.projectedReachAge && (
              <div className={`rounded-lg px-3 py-1.5 ${
                isOnTarget ? 'bg-teal-100/80 dark:bg-teal-900/50' : 'bg-amber-100/80 dark:bg-amber-900/50'
              }`}>
                <p className={`text-xs font-medium ${isOnTarget ? 'text-teal-700 dark:text-teal-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  Projected age {nextMilestone.projectedReachAge}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 p-4 ring-1 ring-teal-200 dark:ring-teal-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
              <svg className="h-5 w-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-teal-800 dark:text-teal-200">All milestones reached!</p>
              <p className="text-xs text-teal-600 dark:text-teal-400">
                {formatCurrency(currentBalance)} saved towards {formatCurrency(profile.targetAmount)}
              </p>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
