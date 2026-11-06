'use client';

import { useState, useMemo } from 'react';
import { HelpCircle, RotateCcw } from 'lucide-react';
import { Account, UserProfile, LumpSumWithdrawal } from '@/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StatRow } from '@/components/ui/stat-row';
import {
  calculateWhatIfContribution,
  calculateWhatIfRetirementAge,
  calculateWhatIfReturns,
  formatCurrency,
} from '@/lib/calculations';
import { deltaTextClass } from '@/lib/utils';
import { useRetirementSummary } from '@/contexts/retirement-engine-context';

interface WhatIfScenariosProps {
  accounts: Account[];
  profile: UserProfile;
  lumpSumWithdrawals?: LumpSumWithdrawal[];
}

function ScenarioRow({ label, value, diff }: { label: string; value: number; diff: number }) {
  return (
    <StatRow
      label={label}
      value={formatCurrency(value)}
      hint={diff !== 0 ? <span className={deltaTextClass(diff)}>{diff > 0 ? '+' : ''}{formatCurrency(diff)}</span> : undefined}
    />
  );
}

interface ScenarioProps {
  id: string;
  label: string;
  valueLabel: React.ReactNode;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  real: number;
  nominal: number;
  baseReal: number;
  baseNominal: number;
}

function Scenario({ id, label, valueLabel, min, max, step, value, onChange, real, nominal, baseReal, baseNominal }: ScenarioProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-ink-11">{label}</label>
        <span className="text-sm tabular-nums text-ink-12">{valueLabel}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
      />
      <div className="hairline-list tabular-nums">
        <ScenarioRow label="In today's money" value={real} diff={real - baseReal} />
        <ScenarioRow label="Future value" value={nominal} diff={nominal - baseNominal} />
      </div>
    </div>
  );
}

export function WhatIfScenarios({ accounts, profile, lumpSumWithdrawals = [] }: WhatIfScenariosProps) {
  const [extraContribution, setExtraContribution] = useState(0);
  const [retirementAgeAdjust, setRetirementAgeAdjust] = useState(0);
  const [returnAdjust, setReturnAdjust] = useState(0);

  const { projectedTotalReal: baseReal, projectedTotal: baseNominal } = useRetirementSummary();

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
      <SectionCard title="What if" icon={<HelpCircle />}>
        <EmptyState
          icon={<HelpCircle />}
          title="Nothing to compare yet"
          description="Add an account to see how changes affect your retirement."
        />
      </SectionCard>
    );
  }

  const isAdjusted = extraContribution !== 0 || retirementAgeAdjust !== 0 || returnAdjust !== 0;
  const base = { baseReal, baseNominal };

  return (
    <SectionCard
      title="What if" icon={<HelpCircle />}
      action={
        isAdjusted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setExtraContribution(0);
              setRetirementAgeAdjust(0);
              setReturnAdjust(0);
            }}
          >
            <RotateCcw />
            Reset
          </Button>
        )
      }
      contentClassName="space-y-6"
    >
      <Scenario
        id="whatif-contribution"
        label={`I save ${extraContribution >= 0 ? 'extra' : 'less'}`}
        valueLabel={`${extraContribution >= 0 ? '+' : ''}${formatCurrency(extraContribution)}/mo`}
        min={-500}
        max={1000}
        step={50}
        value={extraContribution}
        onChange={setExtraContribution}
        real={contributionProjectionReal}
        nominal={contributionProjectionNominal}
        {...base}
      />
      <Scenario
        id="whatif-age"
        label="I retire at"
        valueLabel={
          <>
            Age {profile.retirementAge + retirementAgeAdjust}
            {retirementAgeAdjust !== 0 && (
              <span className="text-ink-10"> ({retirementAgeAdjust > 0 ? '+' : ''}{retirementAgeAdjust}y)</span>
            )}
          </>
        }
        min={-5}
        max={5}
        step={1}
        value={retirementAgeAdjust}
        onChange={setRetirementAgeAdjust}
        real={retirementAgeProjectionReal}
        nominal={retirementAgeProjectionNominal}
        {...base}
      />
      <Scenario
        id="whatif-returns"
        label="Markets perform"
        valueLabel={`${returnAdjust >= 0 ? '+' : ''}${returnAdjust}% vs expected`}
        min={-4}
        max={4}
        step={1}
        value={returnAdjust}
        onChange={setReturnAdjust}
        real={returnProjectionReal}
        nominal={returnProjectionNominal}
        {...base}
      />
    </SectionCard>
  );
}
