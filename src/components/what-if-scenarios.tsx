'use client';

import { useState, useMemo } from 'react';
import { Account, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  calculateProjectedTotalReal,
  calculateWhatIfContribution,
  calculateWhatIfRetirementAge,
  calculateWhatIfReturns,
  formatCurrency,
} from '@/lib/calculations';

interface WhatIfScenariosProps {
  accounts: Account[];
  profile: UserProfile;
}

export function WhatIfScenarios({ accounts, profile }: WhatIfScenariosProps) {
  const [extraContribution, setExtraContribution] = useState(0);
  const [retirementAgeAdjust, setRetirementAgeAdjust] = useState(0);
  const [returnAdjust, setReturnAdjust] = useState(0);

  const baseProjection = useMemo(
    () => calculateProjectedTotalReal(accounts, profile),
    [accounts, profile]
  );

  const contributionProjection = useMemo(
    () => calculateWhatIfContribution(accounts, profile, extraContribution),
    [accounts, profile, extraContribution]
  );

  const retirementAgeProjection = useMemo(
    () => calculateWhatIfRetirementAge(accounts, profile, profile.retirementAge + retirementAgeAdjust),
    [accounts, profile, retirementAgeAdjust]
  );

  const returnProjection = useMemo(
    () => calculateWhatIfReturns(accounts, profile, returnAdjust),
    [accounts, profile, returnAdjust]
  );

  if (accounts.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What If...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Add accounts to explore scenarios.</p>
        </CardContent>
      </Card>
    );
  }

  const contributionDiff = contributionProjection - baseProjection;
  const retirementDiff = retirementAgeProjection - baseProjection;
  const returnDiff = returnProjection - baseProjection;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          What If...
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Extra Contribution Scenario */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              I save {extraContribution >= 0 ? 'extra' : 'less'}:
            </label>
            <span className="text-sm font-bold text-blue-600">
              {extraContribution >= 0 ? '+' : ''}{formatCurrency(extraContribution)}/month
            </span>
          </div>
          <input
            type="range"
            min="-500"
            max="1000"
            step="50"
            value={extraContribution}
            onChange={(e) => setExtraContribution(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
            <span className="text-sm text-slate-600">Projected total:</span>
            <div className="text-right">
              <span className="font-semibold text-slate-800">{formatCurrency(contributionProjection)}</span>
              {contributionDiff !== 0 && (
                <span className={`ml-2 text-sm ${contributionDiff > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  ({contributionDiff > 0 ? '+' : ''}{formatCurrency(contributionDiff)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Retirement Age Scenario */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              I retire at:
            </label>
            <span className="text-sm font-bold text-violet-600">
              Age {profile.retirementAge + retirementAgeAdjust}
              {retirementAgeAdjust !== 0 && (
                <span className="text-slate-400 font-normal">
                  {' '}({retirementAgeAdjust > 0 ? '+' : ''}{retirementAgeAdjust} years)
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
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex items-center justify-between rounded-lg bg-violet-50 p-3">
            <span className="text-sm text-slate-600">Projected total:</span>
            <div className="text-right">
              <span className="font-semibold text-slate-800">{formatCurrency(retirementAgeProjection)}</span>
              {retirementDiff !== 0 && (
                <span className={`ml-2 text-sm ${retirementDiff > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  ({retirementDiff > 0 ? '+' : ''}{formatCurrency(retirementDiff)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Return Rate Scenario */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Markets perform:
            </label>
            <span className="text-sm font-bold text-orange-600">
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
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex items-center justify-between rounded-lg bg-orange-50 p-3">
            <span className="text-sm text-slate-600">Projected total:</span>
            <div className="text-right">
              <span className="font-semibold text-slate-800">{formatCurrency(returnProjection)}</span>
              {returnDiff !== 0 && (
                <span className={`ml-2 text-sm ${returnDiff > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  ({returnDiff > 0 ? '+' : ''}{formatCurrency(returnDiff)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reset Button */}
        {(extraContribution !== 0 || retirementAgeAdjust !== 0 || returnAdjust !== 0) && (
          <button
            onClick={() => {
              setExtraContribution(0);
              setRetirementAgeAdjust(0);
              setReturnAdjust(0);
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            Reset all scenarios
          </button>
        )}
      </CardContent>
    </Card>
  );
}
