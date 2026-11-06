'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { BarChart3, Settings2, Table2, TrendingUp } from 'lucide-react';
import { Account, UserProfile, LumpSumWithdrawal } from '@/types';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/empty-state';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CHART_COLORS,
  ChartTooltipCard,
  ChartTooltipDivider,
  ChartTooltipRow,
  chartAgeLabel,
  chartGridProps,
  chartLineLabel,
  chartXAxisProps,
  chartYAxisProps,
} from '@/components/ui/chart';
import { formatCurrency, generateProjection } from '@/lib/calculations';
import { MonthlyBreakdownTable } from '@/components/monthly-breakdown-table';
import { useRetirementSummary, useRetirementAnalysis } from '@/contexts/retirement-engine-context';

interface ProjectionChartProps {
  accounts: Account[];
  profile: UserProfile;
  lumpSumWithdrawals?: LumpSumWithdrawal[];
  pausedContribAccounts?: Set<string>;
}

type ProjectionView = 'chart' | 'table';

const VIEW_OPTIONS: { value: ProjectionView; label: string; icon: React.ReactNode }[] = [
  { value: 'chart', label: 'Chart', icon: <BarChart3 className="size-3.5" /> },
  { value: 'table', label: 'Table', icon: <Table2 className="size-3.5" /> },
];

export function ProjectionChart({ accounts, profile, lumpSumWithdrawals = [], pausedContribAccounts }: ProjectionChartProps) {
  const [view, setView] = useState<ProjectionView>('chart');
  const [showOptimistic, setShowOptimistic] = useState(true);
  const [showConservative, setShowConservative] = useState(true);
  const [showCoastFire, setShowCoastFire] = useState(true);

  const hasPaused = (pausedContribAccounts?.size ?? 0) > 0;

  const noContribByAge = useMemo(() => {
    if (!hasPaused) return null;
    // accounts prop = original accounts (engine already uses zeroed-out version)
    const pts = generateProjection(accounts, profile, lumpSumWithdrawals);
    return Object.fromEntries(pts.map((p) => [p.age, p.totalReal]));
  }, [hasPaused, accounts, profile, lumpSumWithdrawals]);

  const { coastFireInfo } = useRetirementSummary();
  const { points: data } = useRetirementAnalysis();

  if (accounts.length === 0) {
    return (
      <SectionCard title="Growth projection" icon={<TrendingUp />}>
        <EmptyState
          icon={<BarChart3 />}
          title="No projection data"
          description="Add an account to see your growth forecast."
        />
      </SectionCard>
    );
  }

  const displayOptions = [
    { label: 'High range (P75–P90)', checked: showOptimistic, onChange: setShowOptimistic },
    { label: 'Low range (P10–P25)', checked: showConservative, onChange: setShowConservative },
    { label: 'Coast FIRE', checked: showCoastFire, onChange: setShowCoastFire },
  ];

  return (
    <SectionCard
      title="Growth projection" icon={<TrendingUp />}
      action={
        <>
          <span className="text-xs text-ink-10">
            {view === 'table' ? 'Nominal values' : "In today's money"}
          </span>
          <SegmentedControl label="Projection view" value={view} options={VIEW_OPTIONS} onChange={setView} />
          {view === 'chart' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Display options">
                  <Settings2 />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 space-y-2">
                {displayOptions.map((option) => (
                  <label key={option.label} className="flex cursor-pointer items-center gap-2 text-ink-12">
                    <Checkbox
                      checked={option.checked}
                      onCheckedChange={(checked) => option.onChange(checked === true)}
                    />
                    {option.label}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </>
      }
    >
      {view === 'table' ? (
        <MonthlyBreakdownTable accounts={accounts} profile={profile} lumpSumWithdrawals={lumpSumWithdrawals} />
      ) : (
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data.map((point) => ({
              ...point,
              outerBase: point.p10Real,
              outerRange: Math.max(0, point.p90Real - point.p10Real),
              innerBase: point.underperformanceReal,
              innerRange: Math.max(0, point.overperformanceReal - point.underperformanceReal),
              noContribReal: noContribByAge ? (noContribByAge[point.age] ?? null) : null,
            }))}
            margin={{ top: 10, right: 10, left: 0, bottom: 35 }}
          >
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="age" {...chartXAxisProps} label={chartAgeLabel} />
            <YAxis {...chartYAxisProps} />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const dataPoint = payload[0]?.payload;
                const noContrib = dataPoint?.noContribReal as number | undefined;

                const accountBreakdown = accounts
                  .map((account) => ({
                    name: account.name,
                    value: dataPoint?.[`${account.id}_real`] as number | undefined,
                  }))
                  .filter((item) => item.value !== undefined)
                  .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

                return (
                  <ChartTooltipCard title={`Age ${label}`}>
                    {showOptimistic && <ChartTooltipRow muted label="P90, optimistic" value={formatCurrency(dataPoint?.p90Real)} />}
                    {showOptimistic && <ChartTooltipRow muted label="P75" value={formatCurrency(dataPoint?.overperformanceReal)} />}
                    <ChartTooltipRow label="P50, base" value={formatCurrency(dataPoint?.totalReal)} color={CHART_COLORS.strong} />
                    {showConservative && <ChartTooltipRow muted label="P25" value={formatCurrency(dataPoint?.underperformanceReal)} />}
                    {showConservative && <ChartTooltipRow muted label="P10, conservative" value={formatCurrency(dataPoint?.p10Real)} />}
                    {hasPaused && noContrib !== undefined && (
                      <ChartTooltipRow label="With contributions" value={formatCurrency(noContrib ?? 0)} color={CHART_COLORS.secondary} dashed />
                    )}
                    {accountBreakdown.length > 0 && <ChartTooltipDivider />}
                    {accountBreakdown.map((item) => (
                      <ChartTooltipRow key={item.name} muted label={item.name} value={formatCurrency(item.value ?? 0)} />
                    ))}
                    {showCoastFire && coastFireInfo && (
                      <>
                        <ChartTooltipDivider />
                        <ChartTooltipRow muted label="Coast FIRE" value={formatCurrency(coastFireInfo.amount)} />
                      </>
                    )}
                  </ChartTooltipCard>
                );
              }}
            />
            <ReferenceLine
              y={profile.targetAmount}
              stroke={CHART_COLORS.target}
              strokeDasharray="8 4"
              strokeWidth={1.5}
              label={chartLineLabel('Target', { width: 46, dx: 4 })}
            />
            {showCoastFire && coastFireInfo && (
              <ReferenceLine
                x={coastFireInfo.age}
                stroke={CHART_COLORS.faint}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={chartLineLabel('Coast FIRE', { width: 70, y: 48 })}
              />
            )}
            {/* Outer band P10→P90 */}
            {showOptimistic && showConservative && (
              <>
                <Area isAnimationActive={false} stackId="outer" dataKey="outerBase" fill="transparent" stroke="none" legendType="none" />
                <Area isAnimationActive={false} stackId="outer" dataKey="outerRange" fill={CHART_COLORS.strong} fillOpacity={0.1} stroke="none" name="P10–P90 range" legendType="rect" />
              </>
            )}
            {/* Inner band P25→P75 */}
            {showOptimistic && showConservative && (
              <>
                <Area isAnimationActive={false} stackId="inner" dataKey="innerBase" fill="transparent" stroke="none" legendType="none" />
                <Area isAnimationActive={false} stackId="inner" dataKey="innerRange" fill={CHART_COLORS.strong} fillOpacity={0.18} stroke="none" name="P25–P75 range" legendType="rect" />
              </>
            )}
            {/* Individual scenario lines when only one band side is shown */}
            {showOptimistic && !showConservative && (
              <Line isAnimationActive={false} dataKey="p90Real" stroke={CHART_COLORS.secondary} strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="P90, optimistic" />
            )}
            {!showOptimistic && showConservative && (
              <Line isAnimationActive={false} dataKey="p10Real" stroke={CHART_COLORS.secondary} strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="P10, conservative" />
            )}
            {/* P50 base line */}
            <Line isAnimationActive={false} dataKey="totalReal" stroke={CHART_COLORS.strong} strokeWidth={2} dot={false} name="P50, base" />
            {/* Full-contributions comparison line (shown when any account is paused) */}
            {hasPaused && (
              <Line isAnimationActive={false} dataKey="noContribReal" stroke={CHART_COLORS.secondary} strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="With contributions" />
            )}
            <Legend
              verticalAlign="top"
              align="right"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
              formatter={(value) => <span style={{ color: CHART_COLORS.label }}>{value}</span>}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      )}
    </SectionCard>
  );
}
