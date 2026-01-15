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

  const getScoreColor = () => {
    if (confidenceScore >= 8) return { text: 'text-teal-600', bg: 'bg-teal-50', bar: 'bg-teal-500' };
    if (confidenceScore >= 6) return { text: 'text-[#0c1929]', bg: 'bg-slate-50', bar: 'bg-[#0c1929]' };
    if (confidenceScore >= 4) return { text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' };
    return { text: 'text-slate-500', bg: 'bg-slate-50', bar: 'bg-slate-400' };
  };

  const colors = getScoreColor();

  return (
    <SectionCard
      icon={<HeartIcon />}
      iconColor="text-rose-500"
      title="Peace of Mind"
      contentClassName="space-y-4"
    >
      {/* Confidence Score */}
      <div className={`rounded-xl p-4 ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Confidence Score
            </p>
            <p className={`font-display text-4xl ${colors.text}`}>
              {confidenceScore}
              <span className="text-xl text-slate-300">/10</span>
            </p>
          </div>
          <div className="flex gap-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={`h-10 w-1.5 rounded-full transition-all duration-300 ${
                  i < confidenceScore ? colors.bar : 'bg-slate-200'
                }`}
                style={{
                  opacity: i < confidenceScore ? 1 - (i * 0.05) : 1,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Reassuring Message */}
      <div className="space-y-1">
        <p className="font-display text-2xl text-foreground">{message.headline}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{message.detail}</p>
      </div>

      {/* Key Stats */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-3 ${
            buffer >= 0
              ? 'bg-teal-50 ring-1 ring-teal-200'
              : 'bg-amber-50 ring-1 ring-amber-200'
          }`}>
            <p className={`text-xs font-medium ${
              buffer >= 0 ? 'text-teal-600' : 'text-amber-600'
            }`}>Safety Buffer</p>
            <p className={`font-display text-xl ${
              buffer >= 0 ? 'text-teal-700' : 'text-amber-700'
            }`}>
              {buffer >= 0 ? '+' : ''}{bufferPercent}%
            </p>
          </div>
          <div className="rounded-xl bg-[#0c1929] p-3">
            <p className="text-xs font-medium text-white/70">Worst Case</p>
            <p className="font-display text-xl text-white">
              {conservativePercent}%
              <span className="text-sm text-white/60"> of goal</span>
            </p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
