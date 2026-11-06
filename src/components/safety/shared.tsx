'use client';

import { useMemo, useState } from 'react';
import { useRetirementState } from '@/contexts/retirement-store-context';
import { Callout } from '@/components/ui/callout';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/calculations';
import type { RetirementPlan } from '@/lib/retirement-simulator';
import {
  calculateFixes,
  ENOUGH_LEVELS,
  getCaseLabel,
  VERDICT_CASES,
  type EnoughLevel,
  type Verdict,
} from '@/lib/verdict';
import { cn } from '@/lib/utils';

/** The real plan, without Emergency cash, as the Safety features all see it. */
export function useRetirementPlan(): RetirementPlan {
  const { profile, retirementAccounts, drawdownConfig, effectiveLumpSumWithdrawals } = useRetirementState();
  return useMemo(() => ({
    accounts: retirementAccounts,
    profile,
    withdrawals: effectiveLumpSumWithdrawals,
    retirementReturn: drawdownConfig.drawdownReturnRate,
    accountOrder: drawdownConfig.accountOrder,
  }), [retirementAccounts, profile, effectiveLumpSumWithdrawals, drawdownConfig.drawdownReturnRate, drawdownConfig.accountOrder]);
}

export function hasSpending({ profile }: RetirementPlan): boolean {
  return profile.essentialsMonthly !== undefined && profile.niceToHavesMonthly !== undefined;
}

export function NumberInput({ id, label, hint, value, onSave, step = 50, min = 0, max }: {
  id: string;
  label: string;
  hint?: string;
  value: number | undefined;
  onSave: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const asText = (saved: number | undefined) => (saved === undefined ? '' : String(saved));
  const [draft, setDraft] = useState(asText(value));
  const isValid = (parsed: number) => !isNaN(parsed) && parsed >= min && (max === undefined || parsed <= max);

  return (
    <FormField id={id} label={label} hint={hint}>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = parseFloat(event.target.value);
          if (isValid(parsed)) onSave(parsed);
        }}
        onBlur={() => setDraft(asText(value))}
      />
    </FormField>
  );
}

export function VerdictTable({ verdict, longLifeAge }: { verdict: Verdict; longLifeAge: number | undefined }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-ink-11">
            <th className="py-2 pr-3 font-normal"><span className="sr-only">Level</span></th>
            {VERDICT_CASES.map(({ id }) => (
              <th key={id} className="py-2 pr-3 font-normal">{getCaseLabel(id, longLifeAge)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ENOUGH_LEVELS.map(({ id: level, label }) => (
            <tr key={level} className="hairline-t">
              <th className="py-2.5 pr-3 text-left font-normal text-ink-12">{label}</th>
              {VERDICT_CASES.map(({ id }) => {
                const cell = verdict[level][id];
                return (
                  <td key={id} className={cn('py-2.5 pr-3 align-top tabular-nums text-[var(--tone-11)]', cell.passed ? 'tone-success' : 'tone-danger')}>
                    {cell.passed ? 'Pass' : (
                      <>
                        Fail at {cell.firstFailAge}
                        <span className="block text-xs text-ink-10">{formatCurrency(Math.round(cell.yearlyShortfall))} a year short</span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FixesForLevel({ plan, level }: { plan: RetirementPlan; level: EnoughLevel }) {
  const fixes = useMemo(() => calculateFixes(plan, level), [plan, level]);
  if (!fixes) return null;

  const levelLabel = level === 'essentials' ? 'Essentials' : 'Lifestyle';
  const cutLabel = level === 'essentials' ? 'Essentials' : 'Nice-to-haves';
  const options = [
    fixes.saveMoreMonthly !== null && `save ${formatCurrency(fixes.saveMoreMonthly)} more a month in an ISA`,
    fixes.retireLaterYears !== null && `retire ${fixes.retireLaterYears} ${fixes.retireLaterYears === 1 ? 'year' : 'years'} later`,
    fixes.cutMonthly !== null && `cut ${cutLabel} by ${formatCurrency(fixes.cutMonthly)} a month`,
  ].filter(Boolean);

  return (
    <Callout tone="neutral" title={`To pass every ${levelLabel} test`}>
      {options.length > 0
        ? `Any one of these would do it on its own: ${options.join(', or ')}.`
        : 'None of the three fixes would clear this on its own.'}
    </Callout>
  );
}

export function VerdictFixes({ plan }: { plan: RetirementPlan }) {
  return (
    <div className="space-y-2">
      {ENOUGH_LEVELS.map(({ id }) => <FixesForLevel key={id} plan={plan} level={id} />)}
    </div>
  );
}
