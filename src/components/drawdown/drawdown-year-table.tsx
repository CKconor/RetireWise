'use client';

import { useState } from 'react';
import { Account, DrawdownSimulationResult } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { formatCurrency } from '@/lib/calculations';

interface DrawdownYearTableProps {
  simulation: DrawdownSimulationResult;
  accounts: Account[];
}

const ACCOUNT_TYPE_DOT_COLORS: Record<string, string> = {
  isa: '#10b981',
  sipp: '#f43f5e',
  pension: '#8b5cf6',
  gia: '#0ea5e9',
  savings: '#f59e0b',
};

const TableIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export function DrawdownYearTable({ simulation, accounts }: DrawdownYearTableProps) {
  const [expanded, setExpanded] = useState(false);

  if (simulation.years.length === 0) {
    return (
      <SectionCard icon={<TableIcon />} title="Year-by-Year Breakdown">
        <div className="flex h-[200px] flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-8 w-8 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-display text-2xl text-foreground">No simulation data</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts on the Dashboard to see the year-by-year breakdown</p>
        </div>
      </SectionCard>
    );
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  // Only show accounts that have a non-zero balance at some point
  const activeAccounts = accounts.filter((a) =>
    simulation.years.some((y) => (y.accountBalances[a.id] ?? 0) > 0)
  );

  const visibleYears = expanded ? simulation.years : simulation.years.slice(0, 10);

  return (
    <SectionCard
      icon={<TableIcon />}
      title="Year-by-Year Breakdown"
      action={<span className="badge-teal">In today&apos;s money</span>}
    >
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="pb-3 pr-4 text-left font-semibold text-muted-foreground">Age</th>
              <th className="pb-3 px-4 text-right font-semibold text-muted-foreground">Withdrawn</th>
              <th className="pb-3 px-4 text-right font-semibold text-muted-foreground">Tax</th>
              {activeAccounts.map((account) => (
                <th key={account.id} className="pb-3 px-4 text-right font-semibold text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ACCOUNT_TYPE_DOT_COLORS[account.type] ?? '#6b7280' }}
                    />
                    {account.name}
                  </div>
                </th>
              ))}
              <th className="pb-3 pl-4 text-right font-semibold text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleYears.map((year) => {
              const totalBalance = activeAccounts.reduce(
                (sum, a) => sum + Math.max(0, year.accountBalances[a.id] ?? 0),
                0
              );
              const isDepleted = totalBalance <= 0;

              return (
                <tr
                  key={year.age}
                  className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${isDepleted ? 'opacity-50' : ''}`}
                >
                  <td className="py-2.5 pr-4 font-mono text-foreground">{year.age}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-foreground">
                    {formatCurrency(year.grossWithdrawal)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-rose-500 dark:text-rose-400">
                    {year.taxPaid > 0 ? formatCurrency(year.taxPaid) : '-'}
                  </td>
                  {activeAccounts.map((account) => {
                    const balance = Math.max(0, year.accountBalances[account.id] ?? 0);
                    return (
                      <td key={account.id} className="py-2.5 px-4 text-right font-mono text-foreground">
                        {balance > 0 ? formatCurrency(balance) : <span className="text-muted-foreground">-</span>}
                      </td>
                    );
                  })}
                  <td className="py-2.5 pl-4 text-right font-mono font-semibold text-foreground">
                    {formatCurrency(totalBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {simulation.years.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full rounded-xl border border-border/60 bg-muted/30 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          {expanded ? 'Show less' : `Show all ${simulation.years.length} years`}
        </button>
      )}
    </SectionCard>
  );
}
