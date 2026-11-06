'use client';

import { useMemo, useState, useCallback } from 'react';
import { CalendarDays, ChevronRight, X } from 'lucide-react';
import { Account, UserProfile, MonthlyProjectionDataPoint, LumpSumWithdrawal } from '@/types';
import { generateMonthlyProjection, formatCurrency } from '@/lib/calculations';
import { ACCOUNT_TYPE_CHART_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChartSwatch } from '@/components/ui/chart';
import { EmptyState } from '@/components/ui/empty-state';

interface MonthlyBreakdownTableProps {
  accounts: Account[];
  profile: UserProfile;
  lumpSumWithdrawals?: LumpSumWithdrawal[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ label: name, value: i + 1 }));

// Sticky columns stay opaque (the table cells carry their own fill) so rows scroll under them
const DATE_CELL = 'sticky left-0 z-10 w-[118px] min-w-[118px]';
const AGE_CELL = 'sticky left-[118px] z-10 w-[94px] min-w-[94px]';

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
  if (pct >= 100) return '!text-green-11';
  if (pct >= 75) return '!text-amber-11';
  return '';
}

type MonthYear = { month: number; year: number };

const TABLE_DATES_KEY = 'retirewise-table-dates';

function loadTableDates(): { startDate: MonthYear | null; endDate: MonthYear | null } {
  if (typeof window === 'undefined') return { startDate: null, endDate: null };
  try {
    const saved = localStorage.getItem(TABLE_DATES_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { startDate: null, endDate: null };
}

function saveTableDates(startDate: MonthYear | null, endDate: MonthYear | null) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TABLE_DATES_KEY, JSON.stringify({ startDate, endDate }));
  } catch { /* ignore */ }
}

export function MonthlyBreakdownTable({ accounts, profile, lumpSumWithdrawals = [] }: MonthlyBreakdownTableProps) {
  const [startDate, setStartDate] = useState<MonthYear | null>(() => loadTableDates().startDate);
  const [endDate, setEndDate] = useState<MonthYear | null>(() => loadTableDates().endDate);

  const handleStartDate = useCallback((v: MonthYear | null) => {
    setStartDate(v);
    setEndDate((prev) => { saveTableDates(v, prev); return prev; });
  }, []);

  const handleEndDate = useCallback((v: MonthYear | null) => {
    setEndDate(v);
    setStartDate((prev) => { saveTableDates(prev, v); return prev; });
  }, []);

  const data = useMemo(
    () => generateMonthlyProjection(accounts, profile, startDate ?? undefined, endDate ?? undefined, lumpSumWithdrawals),
    [accounts, profile, startDate, endDate, lumpSumWithdrawals]
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
      <EmptyState
        title="No projection data"
        description="Add accounts to see monthly projections."
      />
    );
  }

  const currentYear = new Date().getFullYear();
  const birthYear = new Date(profile.birthday).getFullYear();
  const retirementYear = birthYear + profile.retirementAge;
  const endYear = Math.min(retirementYear + 30, birthYear + 100);
  const yearRange = Array.from(
    { length: Math.max(1, endYear - currentYear + 1) },
    (_, i) => currentYear + i
  );

  return (
    <div>
      {/* Date range pickers */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DatePicker
          label="From"
          buttonLabel="Set start date"
          value={startDate}
          onChange={handleStartDate}
          yearRange={yearRange}
          defaultValue={{ month: new Date().getMonth() + 1, year: currentYear }}
        />
        <DatePicker
          label="To"
          buttonLabel="Set end date"
          value={endDate}
          onChange={handleEndDate}
          yearRange={yearRange}
          defaultValue={{ month: 12, year: retirementYear }}
        />
      </div>

      <div className="table-frame">
        <table className="data-table min-w-[700px]">
          <thead>
            <tr>
              <th className={DATE_CELL}>Date</th>
              <th className={AGE_CELL}>Age</th>
              {accounts.map((account) => (
                <th key={account.id}>
                  <span className="flex items-center gap-1.5">
                    <ChartSwatch color={ACCOUNT_TYPE_CHART_COLORS[account.type]} />
                    {account.name}
                  </span>
                </th>
              ))}
              <th>Total</th>
              <th>Target %</th>
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
      <tr className="cursor-pointer select-none" onClick={() => onToggle(group.year)}>
        <td className={DATE_CELL}>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${group.year}`}
            className="flex cursor-pointer items-center gap-1.5 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ChevronRight className={cn('size-3.5 text-ink-10 transition-transform duration-150 ease-out', isExpanded && 'rotate-90')} />
            {group.year}
          </button>
        </td>
        <td className={cn(AGE_CELL, 'cell-strong')}>{summary.age}</td>
        {accounts.map((account) => (
          <td key={account.id} className="cell-strong">
            {formatCurrency(summary.accountBalances[account.id] ?? 0)}
          </td>
        ))}
        <td className="cell-strong">{formatCurrency(summary.total)}</td>
        <td className={targetPercentColor(summary.targetPercent)}>{summary.targetPercent}%</td>
      </tr>

      {/* Monthly rows when expanded */}
      {isExpanded &&
        group.rows.map((row) => (
          <tr key={row.month}>
            <td className={cn(DATE_CELL, '!pl-8 !text-ink-11')}>{MONTH_NAMES[row.monthOfYear - 1]} {row.year}</td>
            <td className={AGE_CELL}>{row.age}y {row.ageMonths}m</td>
            {accounts.map((account) => (
              <td key={account.id}>{formatCurrency(row.accountBalances[account.id] ?? 0)}</td>
            ))}
            <td className="cell-strong">{formatCurrency(row.total)}</td>
            <td className={targetPercentColor(row.targetPercent)}>{row.targetPercent}%</td>
          </tr>
        ))}
    </>
  );
}

interface DatePickerProps {
  label: string;
  buttonLabel: string;
  value: MonthYear | null;
  onChange: (v: MonthYear | null) => void;
  yearRange: number[];
  defaultValue: MonthYear;
}

const MONTH_SELECT = 'h-[var(--control-h-pill)] cursor-pointer rounded-sm bg-ink-3 px-1.5 text-sm text-ink-12 outline-none focus-visible:outline-2 focus-visible:outline-offset-2';

function DatePicker({ label, buttonLabel, value, onChange, yearRange, defaultValue }: DatePickerProps) {
  if (value === null) {
    return (
      <Button variant="outline" size="sm" onClick={() => onChange(defaultValue)}>
        <CalendarDays />
        {buttonLabel}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-ink-11">{label}</span>
      <select
        aria-label={`${label} month`}
        value={value.month}
        onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
        className={MONTH_SELECT}
      >
        {MONTH_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <select
        aria-label={`${label} year`}
        value={value.year}
        onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
        className={MONTH_SELECT}
      >
        {yearRange.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label={`Clear ${label.toLowerCase()} date`}>
        <X />
      </Button>
    </div>
  );
}
