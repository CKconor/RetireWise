'use client';

import { useState, useMemo } from 'react';
import { Account, UserProfile, LumpSumWithdrawal } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import {
  calculateProjectedTotal,
  calculateProjectedTotalReal,
  calculateWhatIfContribution,
  calculateWhatIfRetirementAge,
  calculateWhatIfReturns,
  formatCurrency,
} from '@/lib/calculations';

interface WhatIfScenariosProps {
  accounts: Account[];
  profile: UserProfile;
  lumpSumWithdrawals?: LumpSumWithdrawal[];
}

const QuestionIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface ScenarioResultProps {
  realValue: number;
  nominalValue: number;
  realDiff: number;
  nominalDiff: number;
}

function ScenarioResult({ realValue, nominalValue, realDiff, nominalDiff }: ScenarioResultProps) {
  const diff = realDiff;
  const bgClass = diff > 0
    ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 ring-1 ring-teal-200 dark:ring-teal-700'
    : diff < 0
    ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/30 ring-1 ring-amber-200 dark:ring-amber-700'
    : 'bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-800/50 ring-1 ring-slate-200 dark:ring-slate-700';

  return (
    <div className={`rounded-xl p-3 ${bgClass} space-y-1.5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Today&apos;s money</span>
        <div className="text-right">
          <span className="font-display text-base text-foreground">{formatCurrency(realValue)}</span>
          {realDiff !== 0 && (
            <span className={`ml-2 text-xs font-medium ${realDiff > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
              ({realDiff > 0 ? '+' : ''}{formatCurrency(realDiff)})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Future value</span>
        <div className="text-right">
          <span className="font-display text-base text-foreground">{formatCurrency(nominalValue)}</span>
          {nominalDiff !== 0 && (
            <span className={`ml-2 text-xs font-medium ${nominalDiff > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
              ({nominalDiff > 0 ? '+' : ''}{formatCurrency(nominalDiff)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatIfScenarios({ accounts, profile, lumpSumWithdrawals = [] }: WhatIfScenariosProps) {
  const [extraContribution, setExtraContribution] = useState(0);
  const [retirementAgeAdjust, setRetirementAgeAdjust] = useState(0);
  const [returnAdjust, setReturnAdjust] = useState(0);

  const baseProjectionReal = useMemo(
    () => calculateProjectedTotalReal(accounts, profile, lumpSumWithdrawals),
    [accounts, profile, lumpSumWithdrawals]
  );

  const baseProjectionNominal = useMemo(
    () => calculateProjectedTotal(accounts, profile, lumpSumWithdrawals),
    [accounts, profile, lumpSumWithdrawals]
  );

  const contributionProjectionReal = useMemo(
    () => calculateWhatIfContribution(accounts, profile, extraContribution, true, lumpSumWithdrawals),
    [accounts, profile, extraContribution, lumpSumWithdrawals]
  );

  const contributionProjectionNominal = useMemo(
    () => calculateWhatIfContribution(accounts, profile, extraContribution, false, lumpSumWithdrawals),
    [accounts, profile, extraContribution, lumpSumWithdrawals]
  );

  const retirementAgeProjectionReal = useMemo(
    () => calculateWhatIfRetirementAge(accounts, profile, profile.retirementAge + retirementAgeAdjust, true, lumpSumWithdrawals),
    [accounts, profile, retirementAgeAdjust, lumpSumWithdrawals]
  );

  const retirementAgeProjectionNominal = useMemo(
    () => calculateWhatIfRetirementAge(accounts, profile, profile.retirementAge + retirementAgeAdjust, false, lumpSumWithdrawals),
    [accounts, profile, retirementAgeAdjust, lumpSumWithdrawals]
  );

  const returnProjectionReal = useMemo(
    () => calculateWhatIfReturns(accounts, profile, returnAdjust, true, lumpSumWithdrawals),
    [accounts, profile, returnAdjust, lumpSumWithdrawals]
  );

  const returnProjectionNominal = useMemo(
    () => calculateWhatIfReturns(accounts, profile, returnAdjust, false, lumpSumWithdrawals),
    [accounts, profile, returnAdjust, lumpSumWithdrawals]
  );

  if (accounts.length === 0) {
    return (
      <SectionCard icon={<QuestionIcon />} title="What If...">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-7 w-7 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-4 font-display text-lg text-foreground">Explore possibilities</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts to see how changes affect your retirement</p>
        </div>
      </SectionCard>
    );
  }

  const contributionDiffReal = contributionProjectionReal - baseProjectionReal;
  const contributionDiffNominal = contributionProjectionNominal - baseProjectionNominal;
  const retirementDiffReal = retirementAgeProjectionReal - baseProjectionReal;
  const retirementDiffNominal = retirementAgeProjectionNominal - baseProjectionNominal;
  const returnDiffReal = returnProjectionReal - baseProjectionReal;
  const returnDiffNominal = returnProjectionNominal - baseProjectionNominal;

  return (
    <SectionCard icon={<QuestionIcon />} title="What If..." contentClassName="space-y-5">
      {/* Extra Contribution Scenario */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            I save {extraContribution >= 0 ? 'extra' : 'less'}:
          </label>
          <span className="font-display text-lg text-foreground">
            {extraContribution >= 0 ? '+' : ''}{formatCurrency(extraContribution)}/mo
          </span>
        </div>
        <input
          type="range"
          min="-500"
          max="1000"
          step="50"
          value={extraContribution}
          onChange={(e) => setExtraContribution(Number(e.target.value))}
          className="slider-premium"
        />
        <ScenarioResult
          realValue={contributionProjectionReal}
          nominalValue={contributionProjectionNominal}
          realDiff={contributionDiffReal}
          nominalDiff={contributionDiffNominal}
        />
      </div>

      {/* Retirement Age Scenario */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            I retire at:
          </label>
          <span className="font-display text-lg text-foreground">
            Age {profile.retirementAge + retirementAgeAdjust}
            {retirementAgeAdjust !== 0 && (
              <span className="text-muted-foreground text-sm font-sans font-normal">
                {' '}({retirementAgeAdjust > 0 ? '+' : ''}{retirementAgeAdjust}y)
              </span>
            )}
          </span>
        </div>
        <input
          type="range"
          min="-5"
          max="5"
          step="1"
          value={retirementAgeAdjust}
          onChange={(e) => setRetirementAgeAdjust(Number(e.target.value))}
          className="slider-premium"
        />
        <ScenarioResult
          realValue={retirementAgeProjectionReal}
          nominalValue={retirementAgeProjectionNominal}
          realDiff={retirementDiffReal}
          nominalDiff={retirementDiffNominal}
        />
      </div>

      {/* Return Rate Scenario */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Markets perform:
          </label>
          <span className="font-display text-lg text-foreground">
            {returnAdjust >= 0 ? '+' : ''}{returnAdjust}% vs expected
          </span>
        </div>
        <input
          type="range"
          min="-4"
          max="4"
          step="1"
          value={returnAdjust}
          onChange={(e) => setReturnAdjust(Number(e.target.value))}
          className="slider-premium"
        />
        <ScenarioResult
          realValue={returnProjectionReal}
          nominalValue={returnProjectionNominal}
          realDiff={returnDiffReal}
          nominalDiff={returnDiffNominal}
        />
      </div>

      {/* Reset Button */}
      {(extraContribution !== 0 || retirementAgeAdjust !== 0 || returnAdjust !== 0) && (
        <Button
          variant="ghost"
          onClick={() => {
            setExtraContribution(0);
            setRetirementAgeAdjust(0);
            setReturnAdjust(0);
          }}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset all scenarios
        </Button>
      )}
    </SectionCard>
  );
}
