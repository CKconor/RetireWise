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
import { TrendingDown } from 'lucide-react';
import { DrawdownSimulationResult, UserProfile } from '@/types';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import {
  CHART_COLORS,
  ChartTooltipCard,
  ChartTooltipRow,
  chartActiveDot,
  chartAgeLabel,
  chartGridProps,
  chartLineLabel,
  chartXAxisProps,
  chartYAxisProps,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/calculations';

interface DepletionChartProps {
  simulation: DrawdownSimulationResult;
  profile: UserProfile;
}

export function DepletionChart({ simulation, profile }: DepletionChartProps) {
  if (simulation.years.length === 0) {
    return (
      <SectionCard title="Portfolio depletion" icon={<TrendingDown />}>
        <EmptyState
          icon={<TrendingDown />}
          title="No simulation data"
          description="Add accounts on the dashboard to see your drawdown projection."
        />
      </SectionCard>
    );
  }

  const data = simulation.years.map((year) => ({
    age: year.age,
    balance: Math.round(year.portfolioBalance),
  }));

  return (
    <SectionCard
      title="Portfolio depletion" icon={<TrendingDown />}
      action={<span className="text-xs text-ink-10">In today&apos;s money</span>}
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="age" {...chartXAxisProps} label={chartAgeLabel} />
            <YAxis {...chartYAxisProps} />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <ChartTooltipCard title={`Age ${label}`}>
                    <ChartTooltipRow label="Portfolio" value={formatCurrency(payload[0]?.value as number)} color={CHART_COLORS.strong} />
                  </ChartTooltipCard>
                );
              }}
            />
            {/* State pension age reference line */}
            {profile.includeStatePension && profile.statePensionAge > profile.retirementAge && (
              <ReferenceLine
                x={profile.statePensionAge}
                stroke={CHART_COLORS.statePension}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={chartLineLabel('State pension', { width: 84, y: 24 })}
              />
            )}
            {/* Depletion age reference line */}
            {simulation.depletionAge && (
              <ReferenceLine
                x={simulation.depletionAge}
                stroke={CHART_COLORS.danger}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={chartLineLabel('Depleted', { width: 60, y: 40, color: 'var(--red-11)' })}
              />
            )}
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="balance"
              stroke={CHART_COLORS.strong}
              strokeWidth={2}
              fill={CHART_COLORS.strong}
              fillOpacity={0.1}
              dot={false}
              activeDot={chartActiveDot(CHART_COLORS.strong)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
