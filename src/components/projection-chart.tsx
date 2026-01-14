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
  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <SectionCard icon={<ChartIcon />} iconColor="text-emerald-500" title="Growth Projection">
        <div className="flex h-[300px] items-center justify-center">
          <EmptyState
            icon={<EmptyChartIcon />}
            title="No data yet"
            description="Add accounts to see your projection"
            className="border-0 bg-transparent p-0"
          />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={<ChartIcon />}
      iconColor="text-emerald-500"
      title="Growth Projection"
      action={<span className="text-sm text-muted-foreground">Values shown in today's money</span>}
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOver" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUnder" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
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
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <ReferenceLine
              y={profile.targetAmount}
              stroke="#94a3b8"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{
                value: 'Target',
                position: 'right',
                fill: '#64748b',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="overperformanceReal"
              name="overperformanceReal"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeOpacity={0.5}
              strokeDasharray="4 2"
              fillOpacity={1}
              fill="url(#colorOver)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="underperformanceReal"
              name="underperformanceReal"
              stroke="#f97316"
              strokeWidth={1.5}
              strokeOpacity={0.5}
              strokeDasharray="4 2"
              fillOpacity={1}
              fill="url(#colorUnder)"
              dot={false}
              activeDot={{ r: 4, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="totalReal"
              name="totalReal"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTotal)"
              dot={false}
              activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
