'use client';

import { UserProfile } from '@/types';
import { Heart } from 'lucide-react';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Figure } from '@/components/ui/stat-card';
import { calculatePercentageOfTarget, formatCurrency } from '@/lib/calculations';
import { cn, deltaTextClass, type Tone } from '@/lib/utils';
import { useRetirementSummary, useRetirementAnalysis } from '@/contexts/retirement-engine-context';

interface PeaceOfMindCardProps {
  profile: UserProfile;
}

function scoreTone(score: number): Tone {
  if (score >= 8) return 'success';
  if (score >= 6) return 'accent';
  if (score >= 4) return 'warning';
  return 'neutral';
}

export function PeaceOfMindCard({ profile }: PeaceOfMindCardProps) {
  const { projectedTotalReal, effectiveTarget, confidenceScore, totalContributions: totalMonthlyContributions } = useRetirementSummary();
  const { points } = useRetirementAnalysis();

  if (points.length === 0) {
    return (
      <SectionCard title="Peace of mind" icon={<Heart />}>
        <EmptyState
          icon={<Heart />}
          title="No confidence score yet"
          description="Add an account to see how secure your plan is."
        />
      </SectionCard>
    );
  }

  const buffer = projectedTotalReal - effectiveTarget;
  const bufferPercent = calculatePercentageOfTarget(buffer + effectiveTarget, effectiveTarget) - 100;

  const conservativeAtRetirement = points[points.length - 1].underperformanceReal;
  const conservativePercent = calculatePercentageOfTarget(conservativeAtRetirement, effectiveTarget);

  const getMessage = () => {
    if (confidenceScore >= 8) {
      return {
        headline: "You're in great shape",
        detail: `Projected to exceed target by ${formatCurrency(buffer)}. Even conservatively, you'd reach ${conservativePercent}% of your goal.`,
      };
    }

    if (confidenceScore >= 6) {
      return {
        headline: "You're on track",
        detail: buffer >= 0
          ? `Projected to meet your target with a ${bufferPercent}% buffer. Keep going!`
          : `Making good progress. A small increase in savings could help you reach your full target.`,
      };
    }

    if (confidenceScore >= 4) {
      return {
        headline: "Making progress",
        detail: `You're working toward your goal. Small adjustments can make a big difference.`,
      };
    }

    return {
      headline: "Room to grow",
      detail: "Your retirement plan is just getting started. Every contribution counts.",
    };
  };

  const message = getMessage();

  const annualSalary = profile.annualSalary ?? 0;
  const savingsRate = annualSalary > 0
    ? Math.round((totalMonthlyContributions * 12 / annualSalary) * 100)
    : null;

  return (
    <SectionCard title="Peace of mind" icon={<Heart />} contentClassName="space-y-4">
      <div className={`tone-${scoreTone(confidenceScore)} flex items-end justify-between gap-4`}>
        <Figure label="Confidence score" value={<>{confidenceScore}<span className="text-ink-10"> / 10</span></>} />
        <div className="flex gap-0.5 pb-1" aria-hidden>
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={cn('h-8 w-1 rounded-full', i < confidenceScore ? 'bg-[var(--tone-9)]' : 'bg-ink-4')}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-ink-12">{message.headline}</p>
        <p className="text-sm text-ink-11">{message.detail}</p>
      </div>

      <div className="hairline-t grid grid-cols-2 gap-4 pt-4">
        <Figure
          label="Safety buffer"
          value={<span className={deltaTextClass(buffer >= 0 ? 1 : -1)}>{buffer >= 0 ? '+' : ''}{bufferPercent}%</span>}
        />
        <Figure label="Of goal, worst case" value={`${conservativePercent}%`} />
        {savingsRate !== null && <Figure label="Of salary saved" value={`${savingsRate}%`} />}
      </div>
    </SectionCard>
  );
}
