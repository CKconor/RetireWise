'use client';

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
import { DrawdownSimulationResult, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { formatCurrency, formatCurrencyCompact } from '@/lib/calculations';
import { useChartColors } from '@/hooks/use-chart-colors';

interface DepletionChartProps {
  simulation: DrawdownSimulationResult;
  profile: UserProfile;
}

const ChartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

export function DepletionChart({ simulation, profile }: DepletionChartProps) {
  const chartColors = useChartColors();

  if (simulation.years.length === 0) {
    return (
      <SectionCard icon={<ChartIcon />} title="Portfolio Depletion">
        <div className="flex h-[300px] flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-8 w-8 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
          <p className="font-display text-2xl text-foreground">No simulation data</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts on the Dashboard to see your drawdown projection</p>
        </div>
      </SectionCard>
    );
  }

  const data = simulation.years.map((year) => ({
    age: year.age,
    balance: Math.round(year.portfolioBalance),
  }));

  return (
    <SectionCard
      icon={<ChartIcon />}
      title="Portfolio Depletion"
      action={<span className="badge-teal">In today&apos;s money</span>}
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
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
                const balance = payload[0]?.value as number;
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                      <span style={{ color: chartColors.tooltipText, fontSize: '13px' }}>
                        Portfolio: {formatCurrency(balance)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            {/* State pension age reference line */}
            {profile.includeStatePension && profile.statePensionAge > profile.retirementAge && (
              <ReferenceLine
                x={profile.statePensionAge}
                stroke="#22c55e"
                strokeDasharray="6 3"
                strokeWidth={2}
                strokeOpacity={0.6}
                label={({ viewBox }) => {
                  const x = (viewBox?.x ?? 0);
                  const y = 24;
                  return (
                    <g>
                      <rect x={x - 4} y={y - 10} width={85} height={16} rx={4} fill={chartColors.labelBg} />
                      <text x={x} y={y} fill="#22c55e" fontSize={12} fontWeight={600}>
                        State Pension
                      </text>
                    </g>
                  );
                }}
              />
            )}
            {/* Depletion age reference line */}
            {simulation.depletionAge && (
              <ReferenceLine
                x={simulation.depletionAge}
                stroke="#ef4444"
                strokeDasharray="6 3"
                strokeWidth={2}
                strokeOpacity={0.6}
                label={({ viewBox }) => {
                  const x = (viewBox?.x ?? 0);
                  const y = 40;
                  return (
                    <g>
                      <rect x={x - 4} y={y - 10} width={60} height={16} rx={4} fill={chartColors.labelBg} />
                      <text x={x} y={y} fill="#ef4444" fontSize={12} fontWeight={600}>
                        Depleted
                      </text>
                    </g>
                  );
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorBalance)"
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: chartColors.activeDotStroke, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
