'use client';

import { Account, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  calculateConfidenceScore,
  calculateProjectedTotalReal,
  generateProjection,
  formatCurrency,
} from '@/lib/calculations';

interface PeaceOfMindCardProps {
  accounts: Account[];
  profile: UserProfile;
}

export function PeaceOfMindCard({ accounts, profile }: PeaceOfMindCardProps) {
  const confidenceScore = calculateConfidenceScore(accounts, profile);
  const projectedReal = calculateProjectedTotalReal(accounts, profile);
  const projection = generateProjection(accounts, profile);
  const buffer = projectedReal - profile.targetAmount;
  const bufferPercent = profile.targetAmount > 0
    ? Math.round((buffer / profile.targetAmount) * 100)
    : 0;

  // Get conservative scenario value at retirement
  const conservativeAtRetirement = projection.length > 0
    ? projection[projection.length - 1].underperformanceReal
    : 0;
  const conservativePercent = profile.targetAmount > 0
    ? Math.round((conservativeAtRetirement / profile.targetAmount) * 100)
    : 0;

  // Determine message based on status
  const getMessage = () => {
    if (accounts.length === 0) {
      return {
        headline: "Let's get started",
        detail: "Add your first account to see your retirement outlook.",
        tone: 'neutral' as const,
      };
    }

    if (confidenceScore >= 8) {
      return {
        headline: "You're in great shape",
        detail: `You're projected to exceed your target by ${formatCurrency(buffer)}. Even in a conservative scenario, you'd reach ${conservativePercent}% of your goal.`,
        tone: 'excellent' as const,
      };
    }

    if (confidenceScore >= 6) {
      return {
        headline: "You're on track",
        detail: buffer >= 0
          ? `You're projected to meet your target with a ${bufferPercent}% buffer. Keep going!`
          : `You're making good progress. A small increase in savings could help you reach your full target.`,
        tone: 'good' as const,
      };
    }

    if (confidenceScore >= 4) {
      return {
        headline: "Making progress",
        detail: `You're working toward your goal. Small adjustments to your savings or timeline can make a big difference.`,
        tone: 'okay' as const,
      };
    }

    return {
      headline: "Room to grow",
      detail: "Your retirement plan is just getting started. Every contribution brings you closer to your goal.",
      tone: 'building' as const,
    };
  };

  const message = getMessage();

  const getConfidenceColor = () => {
    if (confidenceScore >= 8) return 'text-emerald-500';
    if (confidenceScore >= 6) return 'text-blue-500';
    if (confidenceScore >= 4) return 'text-amber-500';
    return 'text-slate-400';
  };

  const getConfidenceBg = () => {
    if (confidenceScore >= 8) return 'bg-emerald-50';
    if (confidenceScore >= 6) return 'bg-blue-50';
    if (confidenceScore >= 4) return 'bg-amber-50';
    return 'bg-slate-50';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Peace of Mind
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confidence Score */}
        <div className={`rounded-lg p-4 ${getConfidenceBg()}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Confidence Score</p>
              <p className={`text-3xl font-bold ${getConfidenceColor()}`}>
                {confidenceScore}<span className="text-lg text-slate-400">/10</span>
              </p>
            </div>
            <div className="flex gap-0.5">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`h-8 w-2 rounded-full ${
                    i < confidenceScore
                      ? confidenceScore >= 8
                        ? 'bg-emerald-400'
                        : confidenceScore >= 6
                        ? 'bg-blue-400'
                        : confidenceScore >= 4
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                      : 'bg-slate-200'
                  }`}
                />
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
      </CardContent>
    </Card>
  );
}
