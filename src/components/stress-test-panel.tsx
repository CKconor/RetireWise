'use client';

import { useMemo } from 'react';
import { Account, UserProfile, LumpSumWithdrawal } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  calculateMarketDropImpact,
  calculateProjectedTotalReal,
  calculatePercentageOfTarget,
  formatCurrency,
} from '@/lib/calculations';

interface StressTestPanelProps {
  accounts: Account[];
  profile: UserProfile;
  lumpSumWithdrawals?: LumpSumWithdrawal[];
}

const ShieldIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export function StressTestPanel({ accounts, profile, lumpSumWithdrawals = [] }: StressTestPanelProps) {
  const baseProjection = useMemo(
    () => calculateProjectedTotalReal(accounts, profile, lumpSumWithdrawals),
    [accounts, profile, lumpSumWithdrawals]
  );

  const stressTests = useMemo(
    () => [20, 30, 40].map(drop => calculateMarketDropImpact(accounts, profile, drop)),
    [accounts, profile]
  );

  if (accounts.length === 0) {
    return (
      <SectionCard icon={<ShieldIcon />} title="Stress Test">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-7 w-7 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="mt-4 font-display text-lg text-foreground">Test your resilience</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts to see how your plan handles market drops</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={<ShieldIcon />}
            title="Stress Test"
      contentClassName="space-y-4"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Even after a market crash, your continued contributions and time in the market help you recover.
      </p>

      <div className="space-y-3">
        {stressTests.map((test) => {
          const percentOfBase = Math.round((test.postDropTotal / baseProjection) * 100);
          const percentOfTarget = calculatePercentageOfTarget(test.postDropTotal, profile.targetAmount);

          return (
            <div
              key={test.dropPercent}
              className={`rounded-xl p-4 ${
                test.stillMeetsTarget
                  ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-1 ring-teal-200 dark:ring-teal-700'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/30 ring-1 ring-amber-200 dark:ring-amber-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className='max-w-[60%]'>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {test.dropPercent}% Market Drop
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    You'd still have {formatCurrency(test.postDropTotal)} at retirement
                  </p>
                </div>
                <div className={`rounded-full px-2 py-1 text-xs font-medium ${
                  test.stillMeetsTarget
                    ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                }`}>
                  {percentOfTarget}% of target
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <ProgressBar
                  value={percentOfBase}
                  color={test.stillMeetsTarget ? 'bg-teal-500' : 'bg-amber-500'}
                  bgColor="bg-slate-200 dark:bg-slate-700"
                  height="sm"
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{percentOfBase}% of expected projection</span>
                  <span>Recovery: ~{test.recoveryYears} years</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium">Remember:</span> Market crashes are normal.
          The S&P 500 has recovered from every crash in history.
          Your long time horizon gives you a significant advantage.
        </p>
      </div>
    </SectionCard>
  );
}
