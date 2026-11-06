'use client';

import { useMemo, useState } from 'react';
import { Sprout } from 'lucide-react';
import { Callout } from '@/components/ui/callout';
import { SectionCard } from '@/components/ui/section-card';
import { formatCurrency } from '@/lib/calculations';
import { applyMonthlyCut, calculateOverSaving, type OverSavingLine } from '@/lib/over-saving';
import { evaluateVerdict, getCaseLabel, type VerdictLine } from '@/lib/verdict';
import { hasSpending, NumberInput, useRetirementPlan, VerdictFixes, VerdictTable } from './shared';

const LINE_LABELS: Record<VerdictLine, string> = { secure: 'secure line', strict: 'strict line' };

function describeOptions(line: OverSavingLine): string | null {
  const options = [
    line.saveLessMonthly > 0 && `save ${formatCurrency(line.saveLessMonthly)} less a month`,
    line.spendNow > 0 && `spend ${formatCurrency(line.spendNow)} now`,
    line.retireSoonerYears > 0 && `retire ${line.retireSoonerYears} ${line.retireSoonerYears === 1 ? 'year' : 'years'} sooner`,
  ].filter(Boolean);
  return options.length > 0 ? `You could ${options.join(', or ')}` : null;
}

export function OverSavingSection() {
  const plan = useRetirementPlan();
  const [tryCut, setTryCut] = useState(0);

  const overSaving = useMemo(() => (hasSpending(plan) ? calculateOverSaving(plan) : null), [plan]);
  const triedVerdict = useMemo(
    () => (hasSpending(plan) ? evaluateVerdict({ ...plan, accounts: applyMonthlyCut(plan.accounts, tryCut).accounts }) : null),
    [plan, tryCut]
  );

  const content = () => {
    if (!overSaving || !triedVerdict) {
      return <p className="text-sm text-ink-11">Enter your retirement spending above to see if you could ease off.</p>;
    }
    const { secure, strict } = overSaving;
    const secureOptions = describeOptions(secure);
    const strictOptions = describeOptions(strict);
    const { longLifeAge } = plan.profile;

    return (
      <>
        {secure.onLine ? (
          <div className="space-y-2">
            <p className="text-base text-ink-12">
              {secureOptions ? `${secureOptions}, and stay on the ${LINE_LABELS.secure}.` : `You're on the ${LINE_LABELS.secure}, but there's no room to ease off.`}
            </p>
            {secure.limitedBy && (
              <p className="text-sm text-ink-11">
                The saving figure is limited by the {getCaseLabel(secure.limitedBy.caseId, longLifeAge)} test on {secure.limitedBy.level === 'essentials' ? 'Essentials' : 'Lifestyle'}.
              </p>
            )}
            <p className="text-sm text-ink-11">
              {strict.onLine
                ? (strictOptions ? `On the ${LINE_LABELS.strict}: ${strictOptions.replace('You could ', '')}.` : `You're on the ${LINE_LABELS.strict}, but with no room to ease off.`)
                : `You're not on the ${LINE_LABELS.strict}, because Lifestyle doesn't pass every test.`}
            </p>
            {secure.cutsSipp && (
              <Callout tone="warning" title="This includes cutting a SIPP">
                That may free up less than the amount shown, because of tax relief.
              </Callout>
            )}
          </div>
        ) : (
          <>
            <Callout tone="danger" title={`There's no room to save less on the ${LINE_LABELS.secure}`}>
              Your plan isn&apos;t on it yet. These would change that:
            </Callout>
            <VerdictFixes plan={plan} />
          </>
        )}

        <div className="hairline-t space-y-3 pt-5">
          <NumberInput
            id="tryCut"
            label="Try saving this much less a month (£)"
            hint="This only shows what would happen. It doesn't change your plan"
            value={tryCut}
            onSave={setTryCut}
            step={25}
          />
          <VerdictTable verdict={triedVerdict} longLifeAge={longLifeAge} />
        </div>

        <p className="text-xs text-ink-10">
          These are alternatives, not a total. Secure means Essentials pass every test and Lifestyle passes on expected returns; strict means both pass every test. They assume {plan.retirementReturn}% after inflation in retirement and your account returns until then. Cuts come from GIAs, savings, ISAs, then SIPPs, and leave pension accounts alone unless you unlock them. One-off spending never touches Emergency cash or pensions. A lower monthly saving can be reversed, but money you&apos;ve spent can&apos;t. These are sums, not advice.
        </p>
      </>
    );
  };

  return (
    <SectionCard title="Could I ease off?" icon={<Sprout />} contentClassName="space-y-5">
      {content()}
    </SectionCard>
  );
}
