'use client';

import { Account, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import {
  calculateConfidenceScore,
  calculateProjectedTotalReal,
  calculatePercentageOfTarget,
  generateProjection,
  formatCurrency,
} from '@/lib/calculations';
import { getConfidenceColors } from '@/lib/utils';

interface PeaceOfMindCardProps {
  accounts: Account[];
  profile: UserProfile;
}

const HeartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

export function PeaceOfMindCard({ accounts, profile }: PeaceOfMindCardProps) {
  const confidenceScore = calculateConfidenceScore(accounts, profile);
  const projectedReal = calculateProjectedTotalReal(accounts, profile);
  const projection = generateProjection(accounts, profile);
  const buffer = projectedReal - profile.targetAmount;
  const bufferPercent = calculatePercentageOfTarget(buffer + profile.targetAmount, profile.targetAmount) - 100;

  const conservativeAtRetirement = projection.length > 0
    ? projection[projection.length - 1].underperformanceReal
    : 0;
  const conservativePercent = calculatePercentageOfTarget(conservativeAtRetirement, profile.targetAmount);

  const getMessage = () => {
    if (accounts.length === 0) {
      return {
        headline: "Let's get started",
        detail: "Add your first account to see your retirement outlook.",
      };
    }

    if (confidenceScore >= 8) {
      return {
        headline: "You're in great shape",
        detail: `You're projected to exceed your target by ${formatCurrency(buffer)}. Even in a conservative scenario, you'd reach ${conservativePercent}% of your goal.`,
      };
    }

    if (confidenceScore >= 6) {
      return {
        headline: "You're on track",
        detail: buffer >= 0
          ? `You're projected to meet your target with a ${bufferPercent}% buffer. Keep going!`
          : `You're making good progress. A small increase in savings could help you reach your full target.`,
      };
    }

    if (confidenceScore >= 4) {
      return {
        headline: "Making progress",
        detail: `You're working toward your goal. Small adjustments to your savings or timeline can make a big difference.`,
      };
    }

    return {
      headline: "Room to grow",
      detail: "Your retirement plan is just getting started. Every contribution brings you closer to your goal.",
    };
  };

  const message = getMessage();
  const colors = getConfidenceColors(confidenceScore);

  const getBarColor = (index: number) => {
    if (index >= confidenceScore) return 'bg-slate-200';
    if (confidenceScore >= 8) return 'bg-emerald-400';
    if (confidenceScore >= 6) return 'bg-blue-400';
    if (confidenceScore >= 4) return 'bg-amber-400';
    return 'bg-slate-300';
  };

  return (
    <SectionCard icon={<HeartIcon />} iconColor="text-violet-500" title="Peace of Mind" contentClassName="space-y-4">
      {/* Confidence Score */}
      <div className={`rounded-lg p-4 ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Confidence Score</p>
            <p className={`text-3xl font-bold ${colors.text}`}>
              {confidenceScore}<span className="text-lg text-slate-400">/10</span>
            </p>
          </div>
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`h-8 w-2 rounded-full ${getBarColor(i)}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Reassuring Message */}
      <div className="space-y-1">
        <p className="font-semibold text-slate-800">{message.headline}</p>
        <p className="text-sm text-slate-600">{message.detail}</p>
      </div>

      {/* Key Stats */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Safety Buffer</p>
            <p className={`font-semibold ${buffer >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {buffer >= 0 ? '+' : ''}{bufferPercent}%
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Worst Case</p>
            <p className="font-semibold text-slate-700">{conservativePercent}% of goal</p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
