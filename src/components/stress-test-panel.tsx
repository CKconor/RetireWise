'use client';

import { Shield } from 'lucide-react';
import { UserProfile } from '@/types';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { calculatePercentageOfTarget, formatCurrency } from '@/lib/calculations';
import { onTrackTone } from '@/lib/utils';
import { useRetirementSummary, useRetirementAnalysis } from '@/contexts/retirement-engine-context';

interface StressTestPanelProps {
  profile: UserProfile;
}

export function StressTestPanel({ profile }: StressTestPanelProps) {
  const { projectedTotalReal: baseProjection } = useRetirementSummary();
  const { points, stressTests } = useRetirementAnalysis();

  if (points.length === 0) {
    return (
      <SectionCard title="Stress test" icon={<Shield />}>
        <EmptyState
          icon={<Shield />}
          title="No stress test yet"
          description="Add an account to see how your plan handles market drops."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Stress test" icon={<Shield />} contentClassName="space-y-4">
      <p className="text-sm text-ink-11">
        Even after a market crash, your continued contributions and time in the market help you recover.
      </p>

      <div className="hairline-list">
        {stressTests.map((test) => {
          const percentOfBase = Math.round((test.postDropTotal / baseProjection) * 100);
          const percentOfTarget = calculatePercentageOfTarget(test.postDropTotal, profile.targetAmount);
          const tone = onTrackTone(test.stillMeetsTarget);

          return (
            <div key={test.dropPercent} className="space-y-2 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink-12">{test.dropPercent}% market drop</p>
                  <p className="text-sm text-ink-11">You&apos;d still have {formatCurrency(test.postDropTotal)} at retirement</p>
                </div>
                <Badge tone={tone}>{percentOfTarget}% of target</Badge>
              </div>
              <ProgressBar value={percentOfBase} tone={tone} />
              <div className="flex justify-between text-xs tabular-nums text-ink-10">
                <span>{percentOfBase}% of expected projection</span>
                <span>Recovery: ~{test.recoveryYears} years</span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
