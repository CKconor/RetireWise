'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { describeVerdict, evaluateVerdict } from '@/lib/verdict';
import { hasSpending, useRetirementPlan } from './shared';

/** The Verdict in one line, linking to the full detail on Safety. */
export function DashboardResult() {
  const plan = useRetirementPlan();
  const summary = useMemo(
    () => (hasSpending(plan) ? describeVerdict(evaluateVerdict(plan), plan.profile.longLifeAge) : null),
    [plan]
  );

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <p className="text-sm text-ink-12">{summary ?? 'Enter your retirement spending to see if you have enough.'}</p>
      <Link href="/safety" className="text-sm text-[var(--accent-11)] underline underline-offset-2">
        {summary ? 'See Safety' : 'Go to Safety'}
      </Link>
    </Card>
  );
}
