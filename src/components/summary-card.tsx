'use client';

import { UserProfile, ProjectionBaseline } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { onTrackTone } from '@/lib/utils';
import { useRetirementSummary, useRetirementAnalysis } from '@/contexts/retirement-engine-context';
import { Badge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatRow } from '@/components/ui/stat-row';

interface SummaryCardProps {
  profile: UserProfile;
  projectionBaseline?: ProjectionBaseline;
}

export function SummaryCard({ profile, projectionBaseline }: SummaryCardProps) {
  const { totalBalance, totalContributions: monthlyContributions, yearsToRetirement, projectedTotalReal, projectedTotal: projectedTotalNominal, statePensionEquivalent, effectiveTarget, progress, requiredContribution, retirementIncome } = useRetirementSummary();
  const { points } = useRetirementAnalysis();

  if (points.length === 0) {
    return (
      <Card className="px-5">
        <EmptyState
          title="No projection yet"
          description={`Add an account to see your forecast. You have ${yearsToRetirement} years to retirement.`}
        />
      </Card>
    );
  }

  // Baseline comparison: find expected total for the current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const baselinePoint = projectionBaseline?.monthlyPoints.find(
    (p) => p.year === currentYear && p.monthOfYear === currentMonth
  );
  const baselineDelta = baselinePoint !== undefined ? totalBalance - baselinePoint.expectedTotal : null;

  const surplus = projectedTotalReal - effectiveTarget;
  const isOnTrack = surplus >= 0;
  const tone = onTrackTone(isOnTrack);

  const potentialReduction = monthlyContributions - requiredContribution;
  const reductionPercentage = monthlyContributions > 0
    ? Math.round((potentialReduction / monthlyContributions) * 100)
    : 0;

  const showStatePension = profile.includeStatePension && (statePensionEquivalent > 0 || profile.targetIsEnough);
  const hasDetails = showStatePension || baselineDelta !== null;

  return (
    <Card className="px-5">
      <div className={hasDetails ? 'grid gap-6 lg:grid-cols-12' : undefined}>
        <div className={hasDetails ? 'min-w-0 space-y-4 lg:col-span-7' : 'space-y-4'}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-3xl tracking-[-0.02em] tabular-nums text-ink-12">{formatCurrency(projectedTotalReal)}</p>
              <p className="text-sm text-ink-11">Projected at retirement, in today&apos;s money</p>
              <p className="mt-0.5 text-xs tabular-nums text-ink-10">
                {formatCurrency(projectedTotalNominal)} before {profile.expectedInflation}% inflation
              </p>
            </div>
            <Badge>{yearsToRetirement} years to go</Badge>
          </div>

          <div className="space-y-2">
            <ProgressBar value={progress} tone={tone} />
            <div className="flex justify-between text-xs tabular-nums text-ink-10">
              <span>Progress to target</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
          </div>

          {isOnTrack ? (
            <Callout tone="success" title={`On track, ${formatCurrency(surplus)} above target`}>
              {potentialReduction > 0 && (
                <>
                  You could reduce contributions by {formatCurrency(potentialReduction)}/month ({reductionPercentage}%) and still hit your target.
                </>
              )}
            </Callout>
          ) : (
            <Callout tone="warning" title={`${formatCurrency(Math.abs(surplus))} below target`}>
              Increase contributions by {formatCurrency(requiredContribution - monthlyContributions)}/month to reach your target.
            </Callout>
          )}
        </div>

        {hasDetails && (
          <div className="min-w-0 space-y-4 lg:col-span-5">
            {showStatePension && (
              <div>
                <p className="mb-1 text-sm text-ink-12">State pension</p>
                <div className="hairline-list tabular-nums">
                  {profile.statePensionAge > profile.retirementAge && (
                    <StatRow
                      label="Gap before state pension"
                      value={`${profile.statePensionAge - profile.retirementAge} years`}
                      hint={`Ages ${profile.retirementAge} to ${profile.statePensionAge}`}
                    />
                  )}
                  <StatRow label={`Income from age ${profile.statePensionAge}`} value={`${formatCurrency(retirementIncome.totalIncome)}/yr`} />
                  <StatRow label="From portfolio (4% withdrawal)" value={formatCurrency(retirementIncome.portfolioIncome)} />
                  <StatRow label="From state pension" value={formatCurrency(retirementIncome.statePensionIncome)} />
                  {!profile.targetIsEnough && <StatRow label="Reduces target by" value={formatCurrency(statePensionEquivalent)} />}
                </div>
              </div>
            )}

            {baselineDelta !== null && (
              <div>
                <p className="mb-1 text-sm text-ink-12">Against baseline</p>
                <div className="hairline-list tabular-nums">
                  <StatRow
                    label="Ahead or behind"
                    value={
                      <span className={baselineDelta >= 0 ? 'text-green-11' : 'text-red-11'}>
                        {baselineDelta >= 0 ? '+' : ''}{formatCurrency(Math.round(baselineDelta))}
                      </span>
                    }
                  />
                  <StatRow label="Baseline expected today" value={formatCurrency(Math.round(baselinePoint!.expectedTotal))} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
