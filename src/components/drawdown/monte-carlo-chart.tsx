'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, Loader2, Dices } from 'lucide-react';
import { MonteCarloResult, DrawdownSimulationResult } from '@/types';
import { EmptyState } from '@/components/ui/empty-state';
import { Figure } from '@/components/ui/stat-card';
import {
  CHART_COLORS,
  ChartTooltipCard,
  ChartTooltipRow,
  chartAgeLabel,
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
} from '@/components/ui/chart';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/calculations';

interface MonteCarloChartProps {
  mcResult: MonteCarloResult;
  deterministicResult: DrawdownSimulationResult;
  numSimulations: number;
  volatility: number;
  isLoading: boolean;
  onNumSimulationsChange: (n: number) => void;
  onVolatilityChange: (n: number) => void;
}

export function MonteCarloChart({
  mcResult,
  deterministicResult,
  numSimulations,
  volatility,
  isLoading,
  onNumSimulationsChange,
  onVolatilityChange,
}: MonteCarloChartProps) {
  const [simInput, setSimInput] = useState(String(numSimulations));
  const [volInput, setVolInput] = useState(String(volatility));

  const successRate = mcResult.successRate;
  const successClass =
    successRate >= 80 ? 'text-green-11' : successRate >= 50 ? 'text-amber-11' : 'text-red-11';

  if (mcResult.years.length === 0) {
    return (
      <SectionCard title="Monte Carlo simulation" icon={<Dices />}>
        <EmptyState
          icon={<BarChart3 />}
          title="No simulation data"
          description="Add accounts on the dashboard to run Monte Carlo simulations."
        />
      </SectionCard>
    );
  }

  const data = mcResult.years.map((yr, i) => ({
    age: yr.age,
    p10: Math.round(yr.p10),
    outer: Math.round(Math.max(0, yr.p90 - yr.p10)),
    p25: Math.round(yr.p25),
    inner: Math.round(Math.max(0, yr.p75 - yr.p25)),
    p50: Math.round(yr.p50),
    deterministic: Math.round(deterministicResult.years[i]?.portfolioBalance ?? 0),
  }));

  return (
    <SectionCard title="Monte Carlo simulation" icon={<Dices />}>
      {/* Stats + chart with loading overlay */}
      <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-md bg-card/80 text-sm text-ink-11">
          <Loader2 className="size-4 animate-spin" />
          Running simulations…
        </div>
      )}

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Figure
          label="Success rate"
          value={<span className={successClass}>{successRate.toFixed(0)}%</span>}
          subValue="Funds last to horizon"
        />
        <Figure
          label="Median depletion"
          value={mcResult.medianDepletionAge !== null ? `Age ${mcResult.medianDepletionAge}` : 'Never'}
          subValue="Of failed simulations"
        />
        <Figure
          label="Simulations"
          value={mcResult.numSimulations.toLocaleString()}
          subValue="Scenarios run"
        />
      </div>

      {/* Chart */}
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="age" {...chartXAxisProps} label={chartAgeLabel} />
            <YAxis {...chartYAxisProps} />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const byKey = Object.fromEntries(payload.map((p) => [p.dataKey, p.value as number]));
                const p10 = byKey['p10'] ?? 0;
                const p25 = byKey['p25'] ?? 0;
                const p50 = byKey['p50'] ?? 0;
                const p75 = p25 + (byKey['inner'] ?? 0);
                const p90 = p10 + (byKey['outer'] ?? 0);
                return (
                  <ChartTooltipCard title={`Age ${label}`}>
                    <ChartTooltipRow muted label="P90, optimistic" value={formatCurrency(p90)} />
                    <ChartTooltipRow muted label="P75" value={formatCurrency(p75)} />
                    <ChartTooltipRow label="P50, median" value={formatCurrency(p50)} color={CHART_COLORS.strong} />
                    <ChartTooltipRow muted label="P25" value={formatCurrency(p25)} />
                    <ChartTooltipRow muted label="P10, pessimistic" value={formatCurrency(p10)} />
                    <ChartTooltipRow label="Deterministic" value={formatCurrency(byKey['deterministic'] ?? 0)} color={CHART_COLORS.secondary} dashed />
                  </ChartTooltipCard>
                );
              }}
            />
            {/* Outer band p10→p90 */}
            <Area isAnimationActive={false} stackId="outer" dataKey="p10" fill="transparent" stroke="none" legendType="none" />
            <Area isAnimationActive={false} stackId="outer" dataKey="outer" fill={CHART_COLORS.strong} fillOpacity={0.1} stroke="none" name="P10–P90 range" legendType="rect" />
            {/* Inner band p25→p75 */}
            <Area isAnimationActive={false} stackId="inner" dataKey="p25" fill="transparent" stroke="none" legendType="none" />
            <Area isAnimationActive={false} stackId="inner" dataKey="inner" fill={CHART_COLORS.strong} fillOpacity={0.18} stroke="none" name="P25–P75 range" legendType="rect" />
            {/* Median */}
            <Line isAnimationActive={false} dataKey="p50" stroke={CHART_COLORS.strong} strokeWidth={2} dot={false} name="Median (P50)" />
            {/* Deterministic */}
            <Line isAnimationActive={false} dataKey="deterministic" stroke={CHART_COLORS.secondary} strokeDasharray="6 3" strokeWidth={1.5} dot={false} name="Deterministic" />
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
      </div>{/* end relative overlay wrapper */}

      {/* Config inputs */}
      <div className="hairline-t mt-4 grid grid-cols-2 gap-4 pt-4">
        <FormField id="mc-simulations" label="Simulations" hint="100 to 5,000">
          <Input
            id="mc-simulations"
            type="number"
            value={simInput}
            min={100}
            max={5000}
            step={100}
            onChange={(e) => setSimInput(e.target.value)}
            onBlur={() => {
              const n = parseInt(simInput);
              if (!isNaN(n) && n >= 100 && n <= 5000) onNumSimulationsChange(n);
              else setSimInput(String(numSimulations));
            }}
          />
        </FormField>
        <FormField id="mc-volatility" label="Volatility (%)" hint="Annual std dev, 1 to 30">
          <Input
            id="mc-volatility"
            type="number"
            value={volInput}
            min={1}
            max={30}
            step={0.5}
            onChange={(e) => setVolInput(e.target.value)}
            onBlur={() => {
              const n = parseFloat(volInput);
              if (!isNaN(n) && n >= 1 && n <= 30) onVolatilityChange(n);
              else setVolInput(String(volatility));
            }}
          />
        </FormField>
      </div>
    </SectionCard>
  );
}
