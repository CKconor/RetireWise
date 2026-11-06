'use client';

import { useState } from 'react';
import { Table2 } from 'lucide-react';
import { Account, DrawdownSimulationResult } from '@/types';
import { Button } from '@/components/ui/button';
import { ChartSwatch } from '@/components/ui/chart';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard, SectionHeader } from '@/components/ui/section-card';
import { formatCurrency } from '@/lib/calculations';
import { ACCOUNT_TYPE_CHART_COLORS } from '@/lib/constants';

interface DrawdownYearTableProps {
  simulation: DrawdownSimulationResult;
  accounts: Account[];
}

export function DrawdownYearTable({ simulation, accounts }: DrawdownYearTableProps) {
  const [expanded, setExpanded] = useState(false);
  const hasStatePension = simulation.years.some((y) => y.statePensionIncome > 0);

  if (simulation.years.length === 0) {
    return (
      <SectionCard title="Year-by-year breakdown">
        <EmptyState
          icon={<Table2 />}
          title="No simulation data"
          description="Add accounts on the dashboard to see the year-by-year breakdown."
        />
      </SectionCard>
    );
  }

  // Only show accounts that have a non-zero balance at some point
  const activeAccounts = accounts.filter((a) =>
    simulation.years.some((y) => (y.accountBalances[a.id] ?? 0) > 0)
  );

  const visibleYears = expanded ? simulation.years : simulation.years.slice(0, 10);

  return (
    <section className="space-y-4 pt-4">
      <SectionHeader title="Year-by-year breakdown" description="In today's money" />

      <div className="table-frame">
        <table className="data-table">
          <thead>
            <tr>
              <th>Age</th>
              <th>Withdrawn</th>
              <th>Tax</th>
              {hasStatePension && <th>State pension</th>}
              {activeAccounts.map((account) => (
                <th key={account.id}>
                  <span className="flex items-center gap-1.5">
                    <ChartSwatch color={ACCOUNT_TYPE_CHART_COLORS[account.type]} />
                    {account.name}
                  </span>
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleYears.map((year) => {
              const totalBalance = activeAccounts.reduce(
                (sum, a) => sum + Math.max(0, year.accountBalances[a.id] ?? 0),
                0
              );

              return (
                <tr key={year.age} className={totalBalance <= 0 ? 'opacity-60' : undefined}>
                  <td>{year.age}</td>
                  <td>{formatCurrency(year.grossWithdrawal)}</td>
                  <td>{year.withdrawalTax > 0 ? formatCurrency(year.withdrawalTax) : '–'}</td>
                  {hasStatePension && (
                    <td>{year.statePensionIncome > 0 ? formatCurrency(Math.round(year.statePensionIncome)) : '–'}</td>
                  )}
                  {activeAccounts.map((account) => {
                    const balance = Math.max(0, year.accountBalances[account.id] ?? 0);
                    return <td key={account.id}>{balance > 0 ? formatCurrency(balance) : '–'}</td>;
                  })}
                  <td className="cell-strong">{formatCurrency(totalBalance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {simulation.years.length > 10 && (
        <Button variant="outline" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : `Show all ${simulation.years.length} years`}
        </Button>
      )}
    </section>
  );
}
