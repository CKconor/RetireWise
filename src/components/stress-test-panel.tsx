'use client';

import { useMemo } from 'react';
import { Account, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  calculateMarketDropImpact,
  calculateProjectedTotalReal,
  calculatePercentageOfTarget,
  formatCurrency,
} from '@/lib/calculations';
import { getOnTrackColors } from '@/lib/utils';

interface StressTestPanelProps {
  accounts: Account[];
  profile: UserProfile;
}

const ShieldIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export function StressTestPanel({ accounts, profile }: StressTestPanelProps) {
  const baseProjection = useMemo(
    () => calculateProjectedTotalReal(accounts, profile),
    [accounts, profile]
  );

  const stressTests = useMemo(
    () => [20, 30, 40].map(drop => calculateMarketDropImpact(accounts, profile, drop)),
    [accounts, profile]
  );

  if (accounts.length === 0) {
    return (
      <SectionCard icon={<ShieldIcon />} iconColor="text-rose-500" title="Stress Test">
        <p className="text-sm text-muted-foreground">Add accounts to see stress test results.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={<ShieldIcon />}
      iconColor="text-rose-500"
      title="Stress Test"
      contentClassName="space-y-4"
    >
      <p className="text-sm text-slate-600">
        Even after a market crash, your continued contributions and time in the market help you recover.
      </p>

      <div className="space-y-3">
        {stressTests.map((test) => {
          const percentOfBase = Math.round((test.postDropTotal / baseProjection) * 100);
          const percentOfTarget = calculatePercentageOfTarget(test.postDropTotal, profile.targetAmount);
          const colors = getOnTrackColors(test.stillMeetsTarget);

          return (
            <div
              key={test.dropPercent}
              className={`rounded-lg p-4 border ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-start justify-between">
                <div className='max-w-[60%]'>
                  <p className="font-semibold text-slate-800">
                    {test.dropPercent}% Market Drop
                  </p>
                  <p className="text-sm text-slate-600">
                    You'd still have {formatCurrency(test.postDropTotal)} at retirement
                  </p>
                </div>
                <div className={`rounded-full px-2 py-1 text-xs font-medium ${
                  test.stillMeetsTarget
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {percentOfTarget}% of target
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <ProgressBar
                  value={percentOfBase}
                  color={colors.fill}
                  bgColor="bg-slate-200"
                  height="sm"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{percentOfBase}% of expected projection</span>
                  <span>Recovery: ~{test.recoveryYears} years</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-700">
          <span className="font-medium">Remember:</span> Market crashes are normal.
          The S&P 500 has recovered from every crash in history.
          Your long time horizon gives you a significant advantage.
        </p>
      </div>
    </SectionCard>
  );
}
