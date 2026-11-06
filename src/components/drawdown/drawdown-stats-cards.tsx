'use client';

import { DrawdownSimulationResult, DrawdownConfig } from '@/types';
import { Callout } from '@/components/ui/callout';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/calculations';
import { PRIVATE_PENSION_ACCESS_AGE } from '@/lib/uk-figures';

interface DrawdownStatsCardsProps {
  simulation: DrawdownSimulationResult;
  config: DrawdownConfig;
  initialPortfolio: number;
}

export function DrawdownStatsCards({ simulation, config }: DrawdownStatsCardsProps) {
  const firstYear = simulation.years[0];
  const annualNetIncome = firstYear?.totalNetIncome ?? 0;
  const shortfallAge = simulation.firstShortfallAge;
  const shortfallYear = simulation.years.find((year) => year.age === shortfallAge);

  return (
    <div className="space-y-4">
      {shortfallAge !== null && shortfallAge !== simulation.depletionAge && shortfallYear && (
        <Callout tone="danger" title={`At age ${shortfallAge}, you're ${formatCurrency(Math.round(shortfallYear.shortfall))} short for the year`}>
          {shortfallAge < PRIVATE_PENSION_ACCESS_AGE
            ? `Your accessible money has run out, and your pension is locked until ${PRIVATE_PENSION_ACCESS_AGE}.`
            : 'Your accounts can\'t pay the income you asked for that year.'}
        </Callout>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        valueClassName={simulation.depletionAge ? 'text-red-11' : undefined}
        label="Depletion age"
        value={simulation.depletionAge ? `Age ${simulation.depletionAge}` : 'Never'}
        subValue={simulation.depletionAge ? 'Portfolio runs out' : 'Money outlasts you'}
      />
      <StatCard
        label="Annual net income"
        value={formatCurrency(Math.round(annualNetIncome))}
        subValue={`${formatCurrency(Math.round(annualNetIncome / 12))}/month`}
      />
      <StatCard
        label="Lifetime net income"
        value={formatCurrency(Math.round(simulation.totalNetIncomeGenerated))}
        subValue={`Over ${simulation.years.length} years`}
      />
      <StatCard
        label="Total tax paid"
        value={config.taxModeling ? formatCurrency(Math.round(simulation.totalTaxPaid)) : '–'}
        subValue={config.taxModeling ? 'Income tax and CGT' : 'Tax modelling off'}
      />
      </div>
    </div>
  );
}
