'use client';

import { useMemo } from 'react';
import { Scale } from 'lucide-react';
import { useRetirementMutations } from '@/contexts/retirement-store-context';
import { Callout } from '@/components/ui/callout';
import { SectionCard } from '@/components/ui/section-card';
import { Figure } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/calculations';
import { calculateEnough, ENOUGH_END_AGE, getProjectedPot } from '@/lib/retirement-simulator';
import {
  CRASH_FALL_PERCENT,
  CRASH_RECOVERY_YEARS,
  DEFAULT_LONG_LIFE_AGE,
  evaluateHistoricWorst,
  evaluateVerdict,
  HISTORIC_WORST_FALL_PERCENT,
  POOR_RETURNS_YEARS,
  type VerdictCell,
} from '@/lib/verdict';
import { PRIVATE_PENSION_ACCESS_AGE, UK_FIGURES } from '@/lib/uk-figures';
import { hasSpending, NumberInput, useRetirementPlan, VerdictFixes, VerdictTable } from './shared';

function EnoughFigure({ label, enough, pot }: { label: string; enough: number | null; pot: number }) {
  if (enough === null) {
    return <Figure label={label} value="Can't be solved" subValue="See the note below" />;
  }
  const difference = pot - enough;
  return (
    <Figure
      label={label}
      value={formatCurrency(enough)}
      subValue={`Projected pot is ${formatCurrency(Math.abs(difference))} ${difference >= 0 ? 'above' : 'below'} this`}
    />
  );
}

const describeCell = (cell: VerdictCell) => (cell.passed ? 'pass' : `fail at ${cell.firstFailAge}`);

export function EnoughSection() {
  const plan = useRetirementPlan();
  const { profile: profileMutations } = useRetirementMutations();
  const { profile, retirementReturn } = plan;
  const { essentialsMonthly, niceToHavesMonthly, longLifeAge } = profile;

  const results = useMemo(() => {
    if (!hasSpending(plan)) return null;
    const essentials = essentialsMonthly ?? 0;
    return {
      pot: getProjectedPot(plan),
      essentials: calculateEnough(plan, essentials),
      lifestyle: calculateEnough(plan, essentials + (niceToHavesMonthly ?? 0)),
      verdict: evaluateVerdict(plan),
      historicWorst: evaluateHistoricWorst(plan),
    };
  }, [plan, essentialsMonthly, niceToHavesMonthly]);

  return (
    <SectionCard title="Have I got enough?" icon={<Scale />} contentClassName="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberInput
          id="essentialsMonthly"
          label="Essentials (£ a month)"
          hint="Retirement spending you couldn't go without, after tax, in today's money"
          value={essentialsMonthly}
          onSave={(value) => profileMutations.update({ essentialsMonthly: value })}
        />
        <NumberInput
          id="niceToHavesMonthly"
          label="Nice-to-haves (£ a month)"
          hint="Retirement spending on top of Essentials, after tax, in today's money"
          value={niceToHavesMonthly}
          onSave={(value) => profileMutations.update({ niceToHavesMonthly: value })}
        />
      </div>

      {results ? (
        <>
          <div className="hairline-t grid gap-4 pt-5 sm:grid-cols-3">
            <EnoughFigure label="Essentials Enough" enough={results.essentials} pot={results.pot} />
            <EnoughFigure label="Lifestyle Enough" enough={results.lifestyle} pot={results.pot} />
            <Figure label="Projected pot at retirement" value={formatCurrency(Math.round(results.pot))} subValue={`At age ${profile.retirementAge}, in today's money`} />
          </div>
          {(results.essentials === null || results.lifestyle === null) && (
            <Callout tone="danger" title="No pot would pay this with your current accounts">
              Your money before {PRIVATE_PENSION_ACCESS_AGE} has to come from accounts you can reach, and a larger pot with the same split can&apos;t cover the gap while your pension is locked.
            </Callout>
          )}

          <div className="hairline-t space-y-3 pt-5">
            <h3 className="text-base text-ink-12">Verdict</h3>
            <VerdictTable verdict={results.verdict} longLifeAge={longLifeAge} />
            <VerdictFixes plan={plan} />
            <NumberInput
              id="longLifeAge"
              label="Long life: plan to age"
              hint="About 1 in 10 people aged 65 today reach 96–99. You may live longer if you're younger"
              value={longLifeAge ?? DEFAULT_LONG_LIFE_AGE}
              onSave={(value) => profileMutations.update({ longLifeAge: value })}
              step={1}
              min={ENOUGH_END_AGE}
              max={110}
            />
          </div>

          <div className="space-y-1 text-xs text-ink-10">
            <p>
              <strong className="font-normal text-ink-11">Enough</strong> is the smallest pot that pays this spending in full to age {ENOUGH_END_AGE}, assuming {retirementReturn}% a year after inflation in retirement. It keeps your current split between accounts.
            </p>
            <p>
              <strong className="font-normal text-ink-11">Pass or fail:</strong> a level fails if its after-tax spending can&apos;t be paid in full in any single year, including while your pension is locked. Each test runs on its own.
            </p>
            <p>
              <strong className="font-normal text-ink-11">Crash:</strong> a {CRASH_FALL_PERCENT}% real fall just before you retire, on everything except savings accounts, back to its pre-fall real value after {CRASH_RECOVERY_YEARS} years. <strong className="font-normal text-ink-11">Poor returns:</strong> 0% after inflation on every account for the first {POOR_RETURNS_YEARS} years of retirement.
            </p>
            <p>
              <strong className="font-normal text-ink-11">For information only:</strong> a {HISTORIC_WORST_FALL_PERCENT}% fall like 1972–74 would {describeCell(results.historicWorst.essentials)} on Essentials and {describeCell(results.historicWorst.lifestyle)} on Lifestyle. It doesn&apos;t count towards the Verdict.
            </p>
            <p>
              <strong className="font-normal text-ink-11">Withdrawal order:</strong> these tests take money from pensions up to the {formatCurrency(UK_FIGURES.personalAllowance)} personal allowance first, once they&apos;re accessible, then follow your order on the Drawdown page, then pensions again. Tax is always on, and the Drawdown page&apos;s strategy doesn&apos;t apply.
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-11">Enter both totals to see how much is enough. Use 0 if you don&apos;t have any Nice-to-haves.</p>
      )}
    </SectionCard>
  );
}
