'use client';

import { useState, useMemo } from 'react';
import { Account, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import {
  calculateProjectedTotalReal,
  calculateWhatIfContribution,
  calculateWhatIfRetirementAge,
  calculateWhatIfReturns,
  formatCurrency,
} from '@/lib/calculations';
import { getDiffColors } from '@/lib/utils';

interface WhatIfScenariosProps {
  accounts: Account[];
  profile: UserProfile;
}

const QuestionIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface ScenarioResultProps {
  label: string;
  value: number;
  diff: number;
  bgColor: string;
}

function ScenarioResult({ label, value, diff, bgColor }: ScenarioResultProps) {
  return (
    <div className={`flex items-center justify-between rounded-lg p-3 ${bgColor}`}>
      <span className="text-sm text-slate-600">{label}</span>
      <div className="text-right">
        <span className="font-semibold text-slate-800">{formatCurrency(value)}</span>
        {diff !== 0 && (
          <span className={`ml-2 text-sm ${getDiffColors(diff)}`}>
            ({diff > 0 ? '+' : ''}{formatCurrency(diff)})
          </span>
        )}
      </div>
    </div>
  );
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
      <SectionCard icon={<QuestionIcon />} iconColor="text-blue-500" title="What If...">
        <p className="text-sm text-muted-foreground">Add accounts to explore scenarios.</p>
      </SectionCard>
    );
  }

  const contributionDiff = contributionProjection - baseProjection;
  const retirementDiff = retirementAgeProjection - baseProjection;
  const returnDiff = returnProjection - baseProjection;

  return (
    <SectionCard icon={<QuestionIcon />} iconColor="text-blue-500" title="What If..." contentClassName="space-y-6">
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
        <ScenarioResult
          label="Projected total:"
          value={contributionProjection}
          diff={contributionDiff}
          bgColor="bg-blue-50"
        />
      </div>

      {/* Retirement Age Scenario */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">I retire at:</label>
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
        <ScenarioResult
          label="Projected total:"
          value={retirementAgeProjection}
          diff={retirementDiff}
          bgColor="bg-violet-50"
        />
      </div>

      {/* Return Rate Scenario */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Markets perform:</label>
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
        <ScenarioResult
          label="Projected total:"
          value={returnProjection}
          diff={returnDiff}
          bgColor="bg-orange-50"
        />
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
    </SectionCard>
  );
}
