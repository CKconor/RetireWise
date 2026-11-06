'use client';

import { useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useRetirementMutations, useRetirementState } from '@/contexts/retirement-store-context';
import { Callout } from '@/components/ui/callout';
import { Label } from '@/components/ui/label';
import { SectionCard } from '@/components/ui/section-card';
import { Figure } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/calculations';
import { DEFAULT_DRILL_INPUTS, runJobLossDrill } from '@/lib/job-loss-drill';
import { evaluateVerdict } from '@/lib/verdict';
import type { JobLossDrillInputs } from '@/types';
import { hasSpending, NumberInput, useRetirementPlan, VerdictFixes, VerdictTable } from './shared';

const monthsText = (months: number) => `${months} ${months === 1 ? 'month' : 'months'}`;

export function JobLossSection() {
  const { accounts } = useRetirementState();
  const { profile: profileMutations } = useRetirementMutations();
  const plan = useRetirementPlan();
  const { profile } = plan;
  const { livingCostsMonthly, longLifeAge } = profile;
  const inputs = profile.jobLossDrill ?? DEFAULT_DRILL_INPUTS;
  const setInputs = (patch: Partial<JobLossDrillInputs>) => profileMutations.update({ jobLossDrill: { ...inputs, ...patch } });

  const drill = useMemo(
    () => (livingCostsMonthly ? runJobLossDrill(plan, accounts, livingCostsMonthly, inputs) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inputs is rebuilt from these three values
    [plan, accounts, livingCostsMonthly, inputs.monthsOutOfWork, inputs.moneyReceived, inputs.restartPercent]
  );
  const verdicts = useMemo(
    () => (drill && hasSpending(plan) ? { before: evaluateVerdict(plan), after: evaluateVerdict(drill.planAfter) } : null),
    [drill, plan]
  );

  return (
    <SectionCard title="What if I lost my job?" icon={<ShieldAlert />} contentClassName="space-y-5">
      <NumberInput
        id="livingCostsMonthly"
        label="Living costs (£ a month)"
        hint="What you'd still have to pay today if your income stopped"
        value={livingCostsMonthly}
        onSave={(value) => profileMutations.update({ livingCostsMonthly: value })}
      />

      {drill ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="monthsOutOfWork">Time out of work, starting today: {monthsText(inputs.monthsOutOfWork)}</Label>
            <input
              id="monthsOutOfWork"
              type="range"
              min={1}
              max={24}
              value={inputs.monthsOutOfWork}
              onChange={(event) => setInputs({ monthsOutOfWork: Number(event.target.value) })}
              className="w-full accent-[var(--primary-bg)]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberInput
              id="moneyReceived"
              label="Money I'd expect to receive (£)"
              hint="Such as redundancy pay. The app doesn't estimate this or benefits"
              value={inputs.moneyReceived}
              onSave={(value) => setInputs({ moneyReceived: value })}
              step={500}
            />
            <NumberInput
              id="restartPercent"
              label="Saving afterwards (% of today's)"
              hint="Lower this if you'd expect to save less in your next job"
              value={inputs.restartPercent}
              onSave={(value) => setInputs({ restartPercent: value })}
              step={5}
              max={100}
            />
          </div>

          <div className="hairline-t grid gap-4 pt-5 sm:grid-cols-3">
            <Figure
              label="Emergency cash lasts"
              value={monthsText(drill.runway.emergencyCashMonths)}
              subValue={drill.runway.hasEmergencyCash ? undefined : 'None marked, so treated as £0. Tick a savings account as Emergency cash on the dashboard'}
            />
            <Figure label="All accessible money lasts" value={monthsText(drill.runway.accessibleMonths)} />
            <Figure
              label="Smaller pot at retirement"
              value={formatCurrency(Math.round(Math.max(0, drill.potBefore - drill.potAfter)))}
              subValue="Including lost growth"
            />
          </div>

          <div className="space-y-1 text-sm">
            {drill.runway.steps.map((step) => (
              <div key={step.label} className="flex justify-between gap-4 text-ink-11">
                <span>{step.label}: {formatCurrency(Math.round(step.amount))}</span>
                <span className="shrink-0 tabular-nums">to month {step.coversThroughMonth}</span>
              </div>
            ))}
          </div>

          {drill.unfundedLivingCosts > 0 && (
            <Callout
              tone="danger"
              title={`Your accessible money runs out in month ${drill.runway.runsOutInMonth}. After that, you're ${formatCurrency(Math.round(drill.runway.monthlyShortfall))} a month short`}
            >
              {drill.runway.pensionIsLocked && drill.runway.lockedPensionBalance > 0
                ? `Your ${formatCurrency(Math.round(drill.runway.lockedPensionBalance))} in pensions is locked until ${drill.runway.pensionAccessAge}.`
                : null}
              {drill.runway.pensionLastResort
                ? `As a last resort, your pensions could pay about ${monthsText(drill.runway.pensionLastResort.extraMonths)} more, drawing ${formatCurrency(Math.round(drill.runway.pensionLastResort.monthlyWithdrawal))} a month and paying about ${formatCurrency(Math.round(drill.runway.pensionLastResort.monthlyTax))} a month in tax at this year's rates. The figures here don't include this.`
                : null}
            </Callout>
          )}

          {verdicts ? (
            <div className="hairline-t space-y-3 pt-5">
              <div className="space-y-1">
                <h3 className="text-sm text-ink-11">Verdict before</h3>
                <VerdictTable verdict={verdicts.before} longLifeAge={longLifeAge} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm text-ink-11">Verdict after</h3>
                <VerdictTable verdict={verdicts.after} longLifeAge={longLifeAge} />
              </div>
              <VerdictFixes plan={drill.planAfter} />
            </div>
          ) : (
            <p className="text-sm text-ink-11">Enter your retirement spending above to see the Verdict before and after.</p>
          )}
          <p className="text-xs text-ink-10">This is a what-if. It doesn&apos;t change your accounts, snapshots or baseline. It uses today&apos;s balances, and doesn&apos;t count state pension or benefits as income.</p>
        </>
      ) : (
        <p className="text-sm text-ink-11">Enter your Living costs to see how long your money would last.</p>
      )}
    </SectionCard>
  );
}
