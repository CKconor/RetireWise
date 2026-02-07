'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Account, DrawdownSimulationResult } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { formatCurrency, formatCurrencyCompact } from '@/lib/calculations';
import { useChartColors } from '@/hooks/use-chart-colors';

interface IncomeBreakdownChartProps {
  simulation: DrawdownSimulationResult;
  accounts: Account[];
}

const INCOME_COLORS: Record<string, string> = {
  statePension: '#22c55e',
  isa: '#10b981',
  sipp: '#f43f5e',
  pension: '#8b5cf6',
  gia: '#0ea5e9',
  savings: '#f59e0b',
};

const IncomeIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export function IncomeBreakdownChart({ simulation, accounts }: IncomeBreakdownChartProps) {
  const chartColors = useChartColors();

  if (simulation.years.length === 0) {
    return (
      <SectionCard icon={<IncomeIcon />} title="Income Breakdown">
        <div className="flex h-[300px] flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-8 w-8 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="font-display text-2xl text-foreground">No income data</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts on the Dashboard to see income breakdown</p>
        </div>
      </SectionCard>
    );
  }

  // Build stacked data: per-account withdrawals + state pension
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const activeAccountIds = accounts
    .filter((a) => simulation.years.some((y) => (y.accountWithdrawals[a.id] ?? 0) > 0))
    .map((a) => a.id);

  const hasStatePension = simulation.years.some((y) => y.statePensionIncome > 0);

  const data = simulation.years.map((year) => {
    const point: Record<string, number> = { age: year.age };
    for (const id of activeAccountIds) {
      point[id] = Math.round(year.accountWithdrawals[id] ?? 0);
    }
    if (hasStatePension) {
      point.statePension = Math.round(year.statePensionIncome);
    }
    return point;
  });

  // Build legend items
  const legendItems: { key: string; label: string; color: string }[] = [];
  if (hasStatePension) {
    legendItems.push({ key: 'statePension', label: 'State Pension', color: INCOME_COLORS.statePension });
  }
  for (const id of activeAccountIds) {
    const account = accountMap.get(id);
    if (account) {
      legendItems.push({
        key: id,
        label: account.name,
        color: INCOME_COLORS[account.type] ?? '#6b7280',
      });
    }
  }

  return (
    <SectionCard
      icon={<IncomeIcon />}
      title="Income Breakdown"
      action={<span className="badge-teal">Per year</span>}
    >
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {legendItems.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }} stackOffset="none">
            <defs>
              {legendItems.map((item) => (
                <linearGradient key={item.key} id={`color-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={item.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={item.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
            <XAxis
              dataKey="age"
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartColors.axis, fontSize: 12 }}
              dy={10}
              label={{ value: 'Age', position: 'insideBottom', offset: -20, fill: chartColors.axis, fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartColors.axis, fontSize: 12 }}
              tickFormatter={(value) => formatCurrencyCompact(value)}
              dx={-10}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div
                    style={{
                      backgroundColor: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px -10px rgba(12, 25, 41, 0.15)',
                      padding: '12px 16px',
                    }}
                  >
                    <p style={{ color: chartColors.tooltipMuted, fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
                      Age {label}
                    </p>
                    {[...payload]
                      .reverse()
                      .filter((entry) => (entry.value as number) > 0)
                      .map((entry) => {
                        const legendItem = legendItems.find((l) => l.key === entry.dataKey);
                        return (
                          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: legendItem?.color ?? '#6b7280', flexShrink: 0 }} />
                            <span style={{ color: chartColors.tooltipText, fontSize: '13px' }}>
                              {legendItem?.label ?? entry.dataKey}: {formatCurrency(entry.value as number)}
                            </span>
                          </div>
                        );
                      })}
                    <div style={{ borderTop: `1px solid ${chartColors.tooltipBorder}`, marginTop: '8px', paddingTop: '8px' }}>
                      <span style={{ color: chartColors.tooltipText, fontSize: '13px', fontWeight: 600 }}>
                        Total: {formatCurrency(payload.reduce((sum, p) => sum + (p.value as number), 0))}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            {/* Render areas in reverse order so first items appear on top visually */}
            {[...legendItems].reverse().map((item) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stackId="income"
                stroke={item.color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#color-${item.key})`}
                dot={false}
                activeDot={{ r: 4, fill: item.color, stroke: chartColors.activeDotStroke, strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
