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
import { MonteCarloResult, DrawdownSimulationResult } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatCurrencyCompact } from '@/lib/calculations';
import { useChartColors } from '@/hooks/use-chart-colors';

interface MonteCarloChartProps {
  mcResult: MonteCarloResult;
  deterministicResult: DrawdownSimulationResult;
  numSimulations: number;
  volatility: number;
  isLoading: boolean;
  onNumSimulationsChange: (n: number) => void;
  onVolatilityChange: (n: number) => void;
}

const MCIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export function MonteCarloChart({
  mcResult,
  deterministicResult,
  numSimulations,
  volatility,
  isLoading,
  onNumSimulationsChange,
  onVolatilityChange,
}: MonteCarloChartProps) {
  const chartColors = useChartColors();
  const [simInput, setSimInput] = useState(String(numSimulations));
  const [volInput, setVolInput] = useState(String(volatility));

  const successRate = mcResult.successRate;
  const successColor =
    successRate >= 80 ? '#22c55e' : successRate >= 50 ? '#f59e0b' : '#ef4444';

  if (mcResult.years.length === 0) {
    return (
      <SectionCard icon={<MCIcon />} title="Monte Carlo Simulation">
        <div className="flex h-[300px] flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
            <svg className="h-8 w-8 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="font-display text-2xl text-foreground">No simulation data</p>
          <p className="mt-1 text-sm text-muted-foreground">Add accounts on the Dashboard to run Monte Carlo simulations</p>
        </div>
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
    <SectionCard icon={<MCIcon />} title="Monte Carlo Simulation">
      {/* Stats + chart with loading overlay */}
      <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#6366f1]/30" />
            <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-[#6366f1]" />
          </div>
          <p className="mt-3 text-sm font-medium text-muted-foreground">Running simulations…</p>
        </div>
      )}

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/50 bg-background/60 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Success Rate</p>
          <p className="font-display text-3xl font-bold" style={{ color: successColor }}>
            {successRate.toFixed(0)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">funds last to horizon</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/60 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Median Depletion</p>
          <p className="font-display text-3xl font-bold text-foreground">
            {mcResult.medianDepletionAge !== null ? `Age ${mcResult.medianDepletionAge}` : 'Never'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">of failed simulations</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-background/60 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Simulations</p>
          <p className="font-display text-3xl font-bold text-foreground">
            {mcResult.numSimulations.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">scenarios run</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
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
                const byKey = Object.fromEntries(payload.map((p) => [p.dataKey, p.value as number]));
                const p10 = byKey['p10'] ?? 0;
                const p25 = byKey['p25'] ?? 0;
                const p50 = byKey['p50'] ?? 0;
                const p75 = p25 + (byKey['inner'] ?? 0);
                const p90 = p10 + (byKey['outer'] ?? 0);
                return (
                  <div
                    style={{
                      backgroundColor: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px -10px rgba(12, 25, 41, 0.15)',
                      padding: '12px 16px',
                      minWidth: '190px',
                    }}
                  >
                    <p style={{ color: chartColors.tooltipMuted, fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
                      Age {label}
                    </p>
                    {[
                      { label: 'P90 (optimistic)', value: p90, color: '#a5b4fc' },
                      { label: 'P75', value: p75, color: '#818cf8' },
                      { label: 'P50 (median)', value: p50, color: '#6366f1' },
                      { label: 'P25', value: p25, color: '#818cf8' },
                      { label: 'P10 (pessimistic)', value: p10, color: '#a5b4fc' },
                      { label: 'Deterministic', value: byKey['deterministic'] ?? 0, color: '#3b82f6' },
                    ].map(({ label: l, value, color }) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                        <span style={{ color: chartColors.tooltipText, fontSize: '12px' }}>
                          {l}: {formatCurrency(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {/* Outer band p10→p90 */}
            <Area stackId="outer" dataKey="p10" fill="transparent" stroke="none" legendType="none" />
            <Area stackId="outer" dataKey="outer" fill="#6366f1" fillOpacity={0.15} stroke="none" name="P10–P90 range" legendType="rect" />
            {/* Inner band p25→p75 */}
            <Area stackId="inner" dataKey="p25" fill="transparent" stroke="none" legendType="none" />
            <Area stackId="inner" dataKey="inner" fill="#6366f1" fillOpacity={0.35} stroke="none" name="P25–P75 range" legendType="rect" />
            {/* Median */}
            <Line dataKey="p50" stroke="#6366f1" strokeWidth={2} dot={false} name="Median (P50)" />
            {/* Deterministic */}
            <Line dataKey="deterministic" stroke="#3b82f6" strokeDasharray="6 3" strokeWidth={2} dot={false} name="Deterministic" />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
              formatter={(value) => <span style={{ color: chartColors.axis }}>{value}</span>}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      </div>{/* end relative overlay wrapper */}

      {/* Config inputs */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
        <FormField id="mc-simulations" label="Simulations" hint="100–5000">
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
        <FormField id="mc-volatility" label="Volatility (%)" hint="Annual std dev, 1–30">
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
