'use client';

import { Account, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  calculateMilestones,
  calculateProjectedTotalReal,
  formatCurrency,
  formatCurrencyCompact,
} from '@/lib/calculations';

interface MilestoneTrackerProps {
  accounts: Account[];
  profile: UserProfile;
}

export function MilestoneTracker({ accounts, profile }: MilestoneTrackerProps) {
  const milestones = calculateMilestones(accounts, profile);
  const projectedReal = calculateProjectedTotalReal(accounts, profile);
  const currentProgress = profile.targetAmount > 0
    ? (projectedReal / profile.targetAmount) * 100
    : 0;

  // Find the next milestone to achieve
  const nextMilestone = milestones.find(m => !m.reached);

  if (accounts.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Add accounts to track your milestones.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar with Milestones */}
        <div className="relative">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, currentProgress)}%` }}
            />
          </div>
          {/* Milestone Markers */}
          <div className="absolute inset-0">
            {milestones.map((milestone) => (
              <div
                key={milestone.percentage}
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${milestone.percentage}%` }}
              >
                <div
                  className={`-mt-0.5 h-4 w-4 rounded-full border-2 ${
                    milestone.reached
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {milestone.reached && (
                    <svg className="h-full w-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone Cards */}
        <div className="grid grid-cols-4 gap-2">
          {milestones.map((milestone) => (
            <div
              key={milestone.percentage}
              className={`rounded-lg p-2 text-center ${
                milestone.reached
                  ? 'bg-emerald-50'
                  : milestone === nextMilestone
                  ? 'bg-amber-50 ring-1 ring-amber-200'
                  : 'bg-slate-50'
              }`}
            >
              <p className={`text-lg font-bold ${
                milestone.reached
                  ? 'text-emerald-600'
                  : milestone === nextMilestone
                  ? 'text-amber-600'
                  : 'text-slate-400'
              }`}>
                {milestone.percentage}%
              </p>
              <p className="text-xs text-slate-500">
                {formatCurrencyCompact(milestone.amount)}
              </p>
              {milestone.reached ? (
                <span className="mt-1 inline-block text-xs text-emerald-600">Reached!</span>
              ) : milestone.projectedReachAge ? (
                <span className="mt-1 inline-block text-xs text-slate-500">
                  Age {milestone.projectedReachAge}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        {/* Next Milestone Message */}
        {nextMilestone ? (
          <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              Next milestone: {formatCurrency(nextMilestone.amount)}
            </p>
            {nextMilestone.projectedReachAge && (
              <p className="text-xs text-amber-600">
                You're projected to reach this at age {nextMilestone.projectedReachAge}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 p-3">
            <p className="text-sm font-medium text-emerald-800">
              All milestones reached!
            </p>
            <p className="text-xs text-emerald-600">
              You're on track to exceed your retirement goal.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
