'use client';

import { useMemo, useState } from 'react';
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
import { Settings2 } from 'lucide-react';
import { Account, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { generateProjection, formatCurrency, formatCurrencyCompact, calculateCoastFireNumber, findCoastFireYear, calculateAverageReturnRate } from '@/lib/calculations';
import { useChartColors } from '@/hooks/use-chart-colors';

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
  <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export function ProjectionChart({ accounts, profile }: ProjectionChartProps) {
  const [showOptimistic, setShowOptimistic] = useState(true);
  const [showConservative, setShowConservative] = useState(true);
  const [showCoastFire, setShowCoastFire] = useState(true);
  const chartColors = useChartColors();

  const data = useMemo(
    () => generateProjection(accounts, profile),
    [accounts, profile]
  );

  const coastFireInfo = useMemo(() => {
    if (accounts.length === 0 || data.length === 0) return null;

    const avgReturn = calculateAverageReturnRate(accounts);
    const realReturn = Math.max(0, avgReturn - profile.expectedInflation);
    const coastFireNumber = calculateCoastFireNumber(profile, realReturn);
    const coastFireYearIndex = findCoastFireYear(data, coastFireNumber);

    if (coastFireYearIndex === null) return null;

    return {
      age: data[coastFireYearIndex].age,
      amount: coastFireNumber,
    };
  }, [accounts, profile, data]);

  if (accounts.length === 0) {
    return (
      <SectionCard icon={<ChartIcon />} title="Growth Projection">
        <div className="flex h-[300px] flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-8 w-8 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
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
            title="Growth Projection"
      action={
        <div className="flex items-center gap-2">
          <span className="badge-teal">
            In today's money
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Settings2 className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52">
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Display Options</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={showOptimistic}
                      onCheckedChange={(checked) => setShowOptimistic(checked === true)}
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                      Optimistic
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={showConservative}
                      onCheckedChange={(checked) => setShowConservative(checked === true)}
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                      Conservative
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={showCoastFire}
                      onCheckedChange={(checked) => setShowCoastFire(checked === true)}
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#2c7a7b]" />
                      Coast FIRE
                    </span>
                  </label>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      }
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
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

                const lineConfig: Record<string, { label: string; color: string }> = {
                  totalReal: { label: 'Expected', color: '#3b82f6' },
                  overperformanceReal: { label: 'Optimistic (+2%)', color: '#22c55e' },
                  underperformanceReal: { label: 'Conservative (-2%)', color: '#f59e0b' },
                };

                const showTargets = showCoastFire && coastFireInfo;
                const dataPoint = payload[0]?.payload;

                // Get account values from the data point
                const accountBreakdown = accounts.map((account) => ({
                  name: account.name,
                  value: dataPoint?.[`${account.id}_real`] as number | undefined,
                })).filter((item) => item.value !== undefined);

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
                      .sort((a, b) => (b.value as number) - (a.value as number))
                      .map((entry) => {
                        const config = lineConfig[entry.dataKey as string];
                        if (!config) return null;
                        return (
                          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: config.color,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ color: chartColors.tooltipText, fontSize: '13px' }}>
                              {config.label}: {formatCurrency(entry.value as number)}
                            </span>
                          </div>
                        );
                      })}
                    {accountBreakdown.length > 0 && (
                      <div style={{ borderTop: `1px solid ${chartColors.tooltipBorder}`, marginTop: '8px', paddingTop: '8px' }}>
                        <p style={{ color: chartColors.tooltipMuted, fontWeight: 600, marginBottom: '6px', fontSize: '12px' }}>
                          Account Breakdown
                        </p>
                        {accountBreakdown
                          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                          .map((item) => (
                            <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '2px' }}>
                              <span style={{ color: chartColors.tooltipMuted, fontSize: '12px' }}>
                                {item.name}
                              </span>
                              <span style={{ color: chartColors.tooltipText, fontSize: '12px', fontWeight: 500 }}>
                                {formatCurrency(item.value ?? 0)}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                    {showTargets && (
                      <div style={{ borderTop: `1px solid ${chartColors.tooltipBorder}`, marginTop: '8px', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: '#2c7a7b',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: chartColors.tooltipMuted, fontSize: '12px' }}>
                            Coast FIRE: {formatCurrency(coastFireInfo.amount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={profile.targetAmount}
              stroke={chartColors.targetLine}
              strokeDasharray="8 4"
              strokeWidth={2}
              strokeOpacity={0.4}
              label={({ viewBox }) => {
                const x = (viewBox?.x ?? 0) + 4;
                const y = (viewBox?.y ?? 0) - 8;
                return (
                  <g>
                    <rect
                      x={x - 4}
                      y={y - 10}
                      width={42}
                      height={16}
                      rx={4}
                      fill={chartColors.labelBg}
                    />
                    <text
                      x={x}
                      y={y}
                      fill={chartColors.axis}
                      fontSize={12}
                      fontWeight={600}
                    >
                      Target
                    </text>
                  </g>
                );
              }}
            />
            {showCoastFire && coastFireInfo && (
              <ReferenceLine
                x={coastFireInfo.age}
                stroke="#2c7a7b"
                strokeDasharray="6 3"
                strokeWidth={2}
                strokeOpacity={0.6}
                label={({ viewBox }) => {
                  const x = (viewBox?.x ?? 0);
                  const y = 24;
                  return (
                    <g>
                      <rect
                        x={x - 4}
                        y={y - 10}
                        width={70}
                        height={16}
                        rx={4}
                        fill={chartColors.labelBg}
                      />
                      <text
                        x={x}
                        y={y}
                        fill="#2c7a7b"
                        fontSize={12}
                        fontWeight={600}
                      >
                        Coast FIRE
                      </text>
                    </g>
                  );
                }}
              />
            )}
            {showOptimistic && (
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
                activeDot={{ r: 4, fill: '#22c55e', stroke: chartColors.activeDotStroke, strokeWidth: 2 }}
              />
            )}
            {showConservative && (
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
                activeDot={{ r: 4, fill: '#f59e0b', stroke: chartColors.activeDotStroke, strokeWidth: 2 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="totalReal"
              name="totalReal"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTotal)"
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: chartColors.activeDotStroke, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
