'use client';

import { useMemo, useState, useCallback } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Account, UserProfile, MonthlyProjectionDataPoint } from '@/types';
import { generateMonthlyProjection, formatCurrency } from '@/lib/calculations';
import { ACCOUNT_TYPE_DOT_COLORS } from '@/lib/constants';

interface MonthlyBreakdownTableProps {
  accounts: Account[];
  profile: UserProfile;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ label: name, value: i + 1 }));

interface YearGroup {
  year: number;
  rows: MonthlyProjectionDataPoint[];
}

function groupByYear(points: MonthlyProjectionDataPoint[]): YearGroup[] {
  const map = new Map<number, MonthlyProjectionDataPoint[]>();
  for (const p of points) {
    let arr = map.get(p.year);
    if (!arr) {
      arr = [];
      map.set(p.year, arr);
    }
    arr.push(p);
  }
  return Array.from(map.entries()).map(([year, rows]) => ({ year, rows }));
}

function targetPercentColor(pct: number): string {
  if (pct >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 75) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

export function MonthlyBreakdownTable({ accounts, profile }: MonthlyBreakdownTableProps) {
  const [startDate, setStartDate] = useState<{ month: number; year: number } | null>(null);

  const data = useMemo(
    () => generateMonthlyProjection(accounts, profile, startDate ?? undefined),
    [accounts, profile, startDate]
  );

  const yearGroups = useMemo(() => groupByYear(data), [data]);

  const displayYear = startDate?.year ?? new Date().getFullYear();
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set([displayYear]));

  const toggle = useCallback((year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center">
        <p className="font-display text-2xl text-foreground">No projection data</p>
        <p className="mt-1 text-sm text-muted-foreground">Add accounts to see monthly projections</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearRange = Array.from(
    { length: profile.retirementAge - profile.currentAge + 1 },
    (_, i) => currentYear + i
  );

  return (
    <div>
      {/* Start date picker */}
      <div className="mb-4 flex items-center gap-2">
        {startDate === null ? (
          <button
            onClick={() => setStartDate({ month: new Date().getMonth() + 1, year: currentYear })}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground cursor-pointer"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Set start date
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <select
              value={startDate.month}
              onChange={(e) => setStartDate({ ...startDate, month: Number(e.target.value) })}
              className="rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs font-medium text-foreground cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={startDate.year}
              onChange={(e) => setStartDate({ ...startDate, year: Number(e.target.value) })}
              className="rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs font-medium text-foreground cursor-pointer"
            >
              {yearRange.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => setStartDate(null)}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              title="Reset to current month"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr className="border-b border-border/60">
            <th className="pb-3 pr-4 text-left font-semibold text-muted-foreground">Date</th>
            <th className="pb-3 px-4 text-left font-semibold text-muted-foreground">Age</th>
            {accounts.map((account) => (
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
            <th className="pb-3 px-4 text-right font-semibold text-muted-foreground">Total</th>
            <th className="pb-3 pl-4 text-right font-semibold text-muted-foreground">Target %</th>
          </tr>
        </thead>
        <tbody>
          {yearGroups.map((group) => {
            const isExpanded = expandedYears.has(group.year);
            // Use end-of-year row for summary (last row of that year)
            const summary = group.rows[group.rows.length - 1];

            return (
              <YearSection
                key={group.year}
                group={group}
                summary={summary}
                isExpanded={isExpanded}
                onToggle={toggle}
                accounts={accounts}
              />
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}

interface YearSectionProps {
  group: YearGroup;
  summary: MonthlyProjectionDataPoint;
  isExpanded: boolean;
  onToggle: (year: number) => void;
  accounts: Account[];
}

function YearSection({ group, summary, isExpanded, onToggle, accounts }: YearSectionProps) {
  return (
    <>
      {/* Year summary row */}
      <tr
        className="border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/30 select-none"
        onClick={() => onToggle(group.year)}
      >
        <td className="py-2.5 pr-4 font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <svg
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {group.year}
          </div>
        </td>
        <td className="py-2.5 px-4 font-mono text-foreground">{summary.age}</td>
        {accounts.map((account) => (
          <td key={account.id} className="py-2.5 px-4 text-right font-mono text-foreground">
            {formatCurrency(summary.accountBalances[account.id] ?? 0)}
          </td>
        ))}
        <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
          {formatCurrency(summary.totalReal)}
        </td>
        <td className={`py-2.5 pl-4 text-right font-mono font-semibold ${targetPercentColor(summary.targetPercent)}`}>
          {summary.targetPercent}%
        </td>
      </tr>

      {/* Monthly rows when expanded */}
      {isExpanded &&
        group.rows.map((row) => (
          <tr
            key={row.month}
            className="border-b border-border/20 transition-colors hover:bg-muted/20"
          >
            <td className="py-2 pr-4 pl-7 font-mono text-muted-foreground">
              {MONTH_NAMES[row.monthOfYear - 1]} {row.year}
            </td>
            <td className="py-2 px-4 font-mono text-muted-foreground">
              {row.age}y {row.ageMonths}m
            </td>
            {accounts.map((account) => (
              <td key={account.id} className="py-2 px-4 text-right font-mono text-muted-foreground">
                {formatCurrency(row.accountBalances[account.id] ?? 0)}
              </td>
            ))}
            <td className="py-2 px-4 text-right font-mono text-foreground">
              {formatCurrency(row.totalReal)}
            </td>
            <td className={`py-2 pl-4 text-right font-mono ${targetPercentColor(row.targetPercent)}`}>
              {row.targetPercent}%
            </td>
          </tr>
        ))}
    </>
  );
}
