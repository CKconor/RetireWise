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
import { BarChart3, PieChart } from 'lucide-react';
import { Account, DrawdownSimulationResult } from '@/types';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import {
  CHART_COLORS,
  ChartLegend,
  ChartTooltipCard,
  ChartTooltipDivider,
  ChartTooltipRow,
  chartActiveDot,
  chartAgeLabel,
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/calculations';
import { ACCOUNT_TYPE_CHART_COLORS } from '@/lib/constants';

interface IncomeBreakdownChartProps {
  simulation: DrawdownSimulationResult;
  accounts: Account[];
}

export function IncomeBreakdownChart({ simulation, accounts }: IncomeBreakdownChartProps) {
  if (simulation.years.length === 0) {
    return (
      <SectionCard title="Income breakdown" icon={<PieChart />}>
        <EmptyState
          icon={<BarChart3 />}
          title="No income data"
          description="Add accounts on the dashboard to see your income breakdown."
        />
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
    legendItems.push({ key: 'statePension', label: 'State pension', color: CHART_COLORS.statePension });
  }
  for (const id of activeAccountIds) {
    const account = accountMap.get(id);
    if (account) {
      legendItems.push({
        key: id,
        label: account.name,
        color: ACCOUNT_TYPE_CHART_COLORS[account.type],
      });
    }
  }

  return (
    <SectionCard
      title="Income breakdown" icon={<PieChart />}
      action={<span className="text-xs text-ink-10">Per year</span>}
    >
      <ChartLegend items={legendItems} className="mb-4" />

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }} stackOffset="none">
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="age" {...chartXAxisProps} label={chartAgeLabel} />
            <YAxis {...chartYAxisProps} />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <ChartTooltipCard title={`Age ${label}`}>
                    {[...payload]
                      .reverse()
                      .filter((entry) => (entry.value as number) > 0)
                      .map((entry) => {
                        const legendItem = legendItems.find((l) => l.key === entry.dataKey);
                        return (
                          <ChartTooltipRow
                            key={String(entry.dataKey)}
                            label={legendItem?.label ?? String(entry.dataKey)}
                            value={formatCurrency(entry.value as number)}
                            color={legendItem?.color ?? CHART_COLORS.faint}
                          />
                        );
                      })}
                    <ChartTooltipDivider />
                    <ChartTooltipRow
                      label="Total"
                      value={formatCurrency(payload.reduce((sum, p) => sum + (p.value as number), 0))}
                    />
                  </ChartTooltipCard>
                );
              }}
            />
            {/* Render areas in reverse order so first items appear on top visually */}
            {[...legendItems].reverse().map((item) => (
              <Area
                isAnimationActive={false}
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stackId="income"
                stroke={item.color}
                strokeWidth={1.5}
                fill={item.color}
                fillOpacity={0.12}
                dot={false}
                activeDot={chartActiveDot(item.color)}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
