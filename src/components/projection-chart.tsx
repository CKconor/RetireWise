'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Account, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { generateProjection, formatCurrency, formatCurrencyCompact } from '@/lib/calculations';

interface ProjectionChartProps {
  accounts: Account[];
  profile: UserProfile;
}

const ChartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const EmptyChartIcon = () => (
  <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export function ProjectionChart({ accounts, profile }: ProjectionChartProps) {
  const data = useMemo(
    () => generateProjection(accounts, profile),
    [accounts, profile]
  );

  if (accounts.length === 0) {
    return (
      <SectionCard icon={<ChartIcon />} iconColor="text-teal-600" title="Growth Projection">
        <div className="flex h-[300px] flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100">
            <EmptyChartIcon />
          </div>
          <p className="font-display text-2xl text-foreground">No projection data</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts to see your growth forecast</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={<ChartIcon />}
      iconColor="text-teal-600"
      title="Growth Projection"
      action={
        <span className="badge-teal">
          In today's money
        </span>
      }
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorOver" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUnder" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b6560', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b6560', fontSize: 12 }}
              tickFormatter={(value) => formatCurrencyCompact(value)}
              dx={-10}
            />
            <Tooltip
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  totalReal: 'Expected',
                  overperformanceReal: 'Optimistic (+2%)',
                  underperformanceReal: 'Conservative (-2%)',
                };
                const key = name ?? '';
                return [formatCurrency(value as number), labels[key] || key];
              }}
              labelFormatter={(label) => `Year ${String(label).replace('Y', '')}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e8e4de',
                borderRadius: '12px',
                boxShadow: '0 10px 40px -10px rgba(12, 25, 41, 0.15)',
                padding: '12px 16px',
              }}
              itemStyle={{
                color: '#1a1a1a',
                fontSize: '13px',
              }}
              labelStyle={{
                color: '#6b6560',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            />
            <ReferenceLine
              y={profile.targetAmount}
              stroke="#0c1929"
              strokeDasharray="8 4"
              strokeWidth={2}
              strokeOpacity={0.4}
              label={{
                value: 'Target',
                position: 'right',
                fill: '#6b6560',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <Area
              type="monotone"
              dataKey="overperformanceReal"
              name="overperformanceReal"
              stroke="#22c55e"
              strokeWidth={2}
              strokeOpacity={0.7}
              strokeDasharray="4 2"
              fillOpacity={1}
              fill="url(#colorOver)"
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="underperformanceReal"
              name="underperformanceReal"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeOpacity={0.7}
              strokeDasharray="4 2"
              fillOpacity={1}
              fill="url(#colorUnder)"
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="totalReal"
              name="totalReal"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTotal)"
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
