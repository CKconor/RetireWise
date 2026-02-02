'use client';

import { Account, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import {
  calculateIsaBridgeProgress,
  formatCurrency,
} from '@/lib/calculations';

interface IsaBridgeCardProps {
  accounts: Account[];
  profile: UserProfile;
}

const BridgeIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const InfoTooltip = () => (
  <div className="group relative inline-block">
    <svg className="h-4 w-4 text-muted-foreground cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg shadow-lg z-10">
      <p className="font-medium mb-1">ISA Bridge</p>
      <p>The amount you need in accessible accounts (ISAs, GIAs, Savings) to fund your retirement before your State Pension starts. Pensions (SIPP/workplace) can't be accessed before age 55-57.</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
    </div>
  </div>
);

export function IsaBridgeCard({ accounts, profile }: IsaBridgeCardProps) {
  const bridgeProgress = calculateIsaBridgeProgress(accounts, profile);

  // Don't show if no bridge period needed
  if (bridgeProgress.bridgeYears <= 0) {
    return null;
  }

  const isOnTrack = bridgeProgress.shortfall === 0;
  const progressPercent = Math.round(bridgeProgress.progress);

  return (
    <SectionCard
      icon={<BridgeIcon />}
      title="ISA Bridge"
      action={<InfoTooltip />}
      contentClassName="space-y-4"
    >
      {/* Bridge Period Info */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 ring-1 ring-slate-200 dark:ring-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bridge Period
            </p>
            <p className="font-display text-3xl text-foreground">
              {bridgeProgress.bridgeYears}
              <span className="text-lg text-muted-foreground"> years</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ages</p>
            <p className="font-display text-lg text-foreground">
              {profile.retirementAge} - {profile.statePensionAge}
            </p>
          </div>
        </div>
      </div>

      {/* Annual Expenses */}
      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <span className="text-sm text-muted-foreground">Annual expenses (4% rule)</span>
        <span className="font-display text-foreground">{formatCurrency(bridgeProgress.annualExpenses)}</span>
      </div>

      {/* Bridge Amount Required */}
      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <span className="text-sm text-muted-foreground">Bridge amount needed</span>
        <span className="font-display text-foreground">{formatCurrency(bridgeProgress.required)}</span>
      </div>

      {/* Accessible Balance */}
      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <span className="text-sm text-muted-foreground">Projected accessible balance</span>
        <span className="font-display text-foreground">{formatCurrency(bridgeProgress.accessible)}</span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className={`text-sm font-medium ${isOnTrack ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {progressPercent}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOnTrack ? 'bg-teal-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className={`rounded-xl p-4 ${
        isOnTrack
          ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-1 ring-teal-200 dark:ring-teal-700'
          : 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/30 ring-1 ring-amber-200 dark:ring-amber-700'
      }`}>
        {isOnTrack ? (
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-teal-700 dark:text-teal-300">On track</p>
              <p className="text-sm text-teal-600 dark:text-teal-400">
                Your accessible accounts are projected to cover your pre-State Pension years
                {bridgeProgress.accessible > bridgeProgress.required && (
                  <> with a {formatCurrency(bridgeProgress.accessible - bridgeProgress.required)} surplus</>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">Shortfall of {formatCurrency(bridgeProgress.shortfall)}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Consider increasing contributions to ISA, GIA, or Savings accounts to bridge the gap
              </p>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
