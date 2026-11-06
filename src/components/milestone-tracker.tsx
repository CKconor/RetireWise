'use client';

import { BadgeCheck, Check, Flag } from 'lucide-react';
import { UserProfile } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { calculatePercentageOfTarget, formatCurrency, formatCurrencyCompact } from '@/lib/calculations';
import { cn, onTrackTone } from '@/lib/utils';
import { useRetirementSummary, useRetirementAnalysis } from '@/contexts/retirement-engine-context';

interface MilestoneTrackerProps {
  profile: UserProfile;
}

export function MilestoneTracker({ profile }: MilestoneTrackerProps) {
  const { totalBalance: currentBalance, projectedTotalReal: projectedTotal, requiredBalanceNow, targetReachAge } = useRetirementSummary();
  const { points } = useRetirementAnalysis();

  const currentProgress = calculatePercentageOfTarget(currentBalance, profile.targetAmount, false);
  const isOnTarget = projectedTotal >= profile.targetAmount;
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
    for (const point of points) {
      if (point.totalReal >= m.amount) {
        projectedReachAge = point.age;
        break;
      }
    }

    return { percentage, amount: m.amount, label: m.label, reached, projectedReachAge };
  });

  const nextMilestone = milestones.find(m => !m.reached);
  const reachedCount = milestones.filter(m => m.reached).length;

  const scheduleGapYears = targetReachAge !== null ? profile.retirementAge - targetReachAge : null;
  const isAheadOfSchedule = scheduleGapYears !== null && scheduleGapYears > 0;
  const tone = onTrackTone(isOnTarget);

  if (points.length === 0) {
    return (
      <SectionCard title="Milestones" icon={<Flag />}>
        <EmptyState
          icon={<BadgeCheck />}
          title="No milestones yet"
          description="Add an account to track your milestones."
        />
      </SectionCard>
    );
  }

  const gapYears = Math.abs(scheduleGapYears ?? 0);

  return (
    <SectionCard
      title="Milestones" icon={<Flag />}
      action={<Badge>{reachedCount} of {milestones.length} reached</Badge>}
      contentClassName="space-y-4"
    >
      {/* Progress track with a dot at each milestone */}
      <div className={`tone-${tone} relative mx-2 h-1.5 rounded-full bg-ink-4`}>
        <div
          className="h-full rounded-full bg-[var(--tone-9)]"
          style={{ width: `${Math.min(100, currentProgress)}%` }}
        />
        {milestones.map((milestone) => (
          <span
            key={milestone.amount}
            className={cn(
              'absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[var(--shadow-button)]',
              milestone.reached ? 'bg-[var(--tone-9)]' : 'bg-[var(--control-fill)]'
            )}
            style={{ left: `${milestone.percentage}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-5">
        {milestones.map((milestone) => (
          <div key={milestone.amount} className="min-w-0">
            <p className={cn('text-sm', milestone.reached || milestone === nextMilestone ? 'text-ink-12' : 'text-ink-11')}>
              {milestone.label}
            </p>
            <p className="text-xs tabular-nums text-ink-10">{formatCurrencyCompact(milestone.amount)}</p>
            {milestone.reached ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-green-11">
                <Check className="size-3" />
                Done
              </p>
            ) : milestone.projectedReachAge ? (
              <p className="mt-0.5 text-xs tabular-nums text-ink-10">Age {milestone.projectedReachAge}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {targetReachAge !== null ? (
          <Callout
            tone={onTrackTone(isAheadOfSchedule)}
            title={
              <>
                {gapYears} year{gapYears !== 1 ? 's' : ''} {isAheadOfSchedule ? 'ahead of' : 'behind'} schedule
                {currentValueGap !== 0 && (
                  <>, {formatCurrency(Math.abs(currentValueGap))} {currentValueGap >= 0 ? 'ahead' : 'behind'} now</>
                )}
              </>
            }
            action={`Age ${targetReachAge}`}
          >
            On track to hit target at age {targetReachAge}, retirement at {profile.retirementAge}.
          </Callout>
        ) : (
          <Callout tone="danger" title="Target may not be reached">
            Consider increasing contributions or adjusting your target.
          </Callout>
        )}

        {nextMilestone ? (
          <Callout
            title={`Next: ${formatCurrency(nextMilestone.amount)}`}
            action={nextMilestone.projectedReachAge ? `Age ${nextMilestone.projectedReachAge}` : undefined}
          >
            {formatCurrency(nextMilestone.amount - currentBalance)} to go.
          </Callout>
        ) : (
          <Callout tone="success" title="All milestones reached">
            {formatCurrency(currentBalance)} saved towards {formatCurrency(profile.targetAmount)}.
          </Callout>
        )}
      </div>
    </SectionCard>
  );
}
