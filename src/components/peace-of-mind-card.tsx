'use client';

import { Account, UserProfile, LumpSumWithdrawal } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import {
  calculateConfidenceScore,
  calculateProjectedTotalReal,
  calculatePercentageOfTarget,
  generateProjection,
  formatCurrency,
  calculateStatePensionEquivalent,
} from '@/lib/calculations';

interface PeaceOfMindCardProps {
  accounts: Account[];
  profile: UserProfile;
  lumpSumWithdrawals?: LumpSumWithdrawal[];
}

const HeartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

export function PeaceOfMindCard({ accounts, profile, lumpSumWithdrawals = [] }: PeaceOfMindCardProps) {
  if (accounts.length === 0) {
    return (
      <SectionCard icon={<HeartIcon />} title="Peace of Mind">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-7 w-7 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <p className="mt-4 font-display text-lg text-foreground">Your confidence score</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts to see how secure your retirement plan is</p>
        </div>
      </SectionCard>
    );
  }

  const confidenceScore = calculateConfidenceScore(accounts, profile);
  const projectedReal = calculateProjectedTotalReal(accounts, profile, lumpSumWithdrawals);
  const projection = generateProjection(accounts, profile, lumpSumWithdrawals);

  // Account for state pension in target calculation (same as SummaryCard)
  const statePensionEquivalent = calculateStatePensionEquivalent(profile);
  const effectiveTarget = profile.targetAmount - statePensionEquivalent;

  const buffer = projectedReal - effectiveTarget;
  const bufferPercent = calculatePercentageOfTarget(buffer + effectiveTarget, effectiveTarget) - 100;

  const conservativeAtRetirement = projection.length > 0
    ? projection[projection.length - 1].underperformanceReal
    : 0;
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

  const getScoreColor = () => {
    if (confidenceScore >= 8) return { text: 'text-teal-700 dark:text-teal-300', bg: 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-1 ring-teal-200 dark:ring-teal-700', bar: 'bg-teal-500' };
    if (confidenceScore >= 6) return { text: 'text-[#0c1929] dark:text-amber-400', bg: 'bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700', bar: 'bg-[#0c1929] dark:bg-amber-400' };
    if (confidenceScore >= 4) return { text: 'text-amber-700 dark:text-amber-300', bg: 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/30 ring-1 ring-amber-200 dark:ring-amber-700', bar: 'bg-amber-500' };
    return { text: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700', bar: 'bg-slate-400' };
  };

  const colors = getScoreColor();

  const totalMonthlyContributions = accounts.reduce((sum, a) => sum + a.monthlyContribution, 0);
  const annualSalary = profile.annualSalary ?? 0;
  const savingsRate = annualSalary > 0
    ? Math.round((totalMonthlyContributions * 12 / annualSalary) * 100)
    : null;

  return (
    <SectionCard
      icon={<HeartIcon />}
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
              <span className="text-xl text-slate-500">/10</span>
            </p>
          </div>
          <div className="flex gap-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={`h-10 w-1.5 rounded-full transition-all duration-300 ${
                  i < confidenceScore ? colors.bar : 'bg-slate-200 dark:bg-slate-700'
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
              ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-1 ring-teal-200 dark:ring-teal-700'
              : 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/30 ring-1 ring-amber-200 dark:ring-amber-700'
          }`}>
            <p className={`text-xs font-medium ${
              buffer >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
            }`}>Safety Buffer</p>
            <p className={`font-display text-xl ${
              buffer >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-amber-700 dark:text-amber-300'
            }`}>
              {buffer >= 0 ? '+' : ''}{bufferPercent}%
            </p>
          </div>
          <div className="rounded-xl bg-[#0c1929] dark:bg-amber-500 p-3">
            <p className="text-xs font-medium text-white/70 dark:text-[#0c1929]/70">Worst Case</p>
            <p className="font-display text-xl text-white dark:text-[#0c1929]">
              {conservativePercent}%
              <span className="text-sm text-white/60 dark:text-[#0c1929]/60"> of goal</span>
            </p>
          </div>
          {savingsRate !== null && (
            <div className="col-span-2 rounded-xl bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 p-3 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Savings Rate</p>
              <p className="font-display text-xl text-foreground">
                {savingsRate}%
                <span className="text-sm text-muted-foreground font-sans"> of salary</span>
              </p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
