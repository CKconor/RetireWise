'use client';

import { DrawdownSimulationResult, DrawdownConfig } from '@/types';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/calculations';

interface DrawdownStatsCardsProps {
  simulation: DrawdownSimulationResult;
  config: DrawdownConfig;
  initialPortfolio: number;
}

const CalendarIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CashIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TotalIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const TaxIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
);

export function DrawdownStatsCards({ simulation, config, initialPortfolio }: DrawdownStatsCardsProps) {
  const firstYear = simulation.years[0];
  const annualNetIncome = firstYear?.totalNetIncome ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        icon={<CalendarIcon />}
        label="Depletion Age"
        value={simulation.depletionAge ? `Age ${simulation.depletionAge}` : 'Never'}
        subValue={simulation.depletionAge ? `Portfolio runs out` : 'Money outlasts you'}
      />
      <StatCard
        icon={<CashIcon />}
        label="Annual Net Income"
        value={formatCurrency(Math.round(annualNetIncome))}
        subValue={`${formatCurrency(Math.round(annualNetIncome / 12))}/month`}
      />
      <StatCard
        icon={<TotalIcon />}
        label="Lifetime Net Income"
        value={formatCurrency(Math.round(simulation.totalNetIncomeGenerated))}
        subValue={`Over ${simulation.years.length} years`}
      />
      <StatCard
        icon={<TaxIcon />}
        label="Total Tax Paid"
        value={config.taxModeling ? formatCurrency(Math.round(simulation.totalTaxPaid)) : 'N/A'}
        subValue={config.taxModeling ? 'Income tax + CGT' : 'Tax modeling off'}
      />
    </div>
  );
}
