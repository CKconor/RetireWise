'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRetirementData } from '@/hooks/use-retirement-data';
import { Header } from '@/components/header';
import { DrawdownConfigPanel } from '@/components/drawdown/drawdown-config-panel';
import { DrawdownStatsCards } from '@/components/drawdown/drawdown-stats-cards';
import { DepletionChart } from '@/components/drawdown/depletion-chart';
import { IncomeBreakdownChart } from '@/components/drawdown/income-breakdown-chart';
import { DrawdownYearTable } from '@/components/drawdown/drawdown-year-table';
import { MonteCarloChart } from '@/components/drawdown/monte-carlo-chart';
import { simulateDrawdown, runMonteCarloSimulation } from '@/lib/drawdown';
import { simulateAccountFinalBalance } from '@/lib/calculations';

export default function DrawdownPage() {
  const {
    profile,
    accounts,
    drawdownConfig,
    lumpSumWithdrawals,
    isLoaded,
    updateDrawdownConfig,
  } = useRetirementData();

  const [mcNumSimulations, setMcNumSimulations] = useState(1000);
  const [mcVolatility, setMcVolatility] = useState(10);

  // Calculate projected retirement balances per account (real terms), applying lump sum withdrawals
  const retirementBalances = useMemo(() => {
    const yearsToRetirement = Math.max(0, profile.retirementAge - profile.currentAge);
    const balances: Record<string, number> = {};
    for (const account of accounts) {
      const realReturn = Math.max(0, account.annualReturnRate - profile.expectedInflation);
      balances[account.id] = simulateAccountFinalBalance(account, yearsToRetirement, profile.currentAge, realReturn, lumpSumWithdrawals);
    }
    return balances;
  }, [accounts, profile, lumpSumWithdrawals]);

  const initialPortfolio = useMemo(
    () => Object.values(retirementBalances).reduce((sum, b) => sum + b, 0),
    [retirementBalances]
  );

  const simulation = useMemo(
    () => simulateDrawdown(accounts, profile, drawdownConfig, undefined, lumpSumWithdrawals),
    [accounts, profile, drawdownConfig, lumpSumWithdrawals]
  );

  const [mcResult, setMcResult] = useState(() =>
    runMonteCarloSimulation(accounts, profile, drawdownConfig, mcNumSimulations, mcVolatility, lumpSumWithdrawals)
  );
  const [mcLoading, setMcLoading] = useState(false);

  useEffect(() => {
    setMcLoading(true);
    const timer = setTimeout(() => {
      setMcResult(runMonteCarloSimulation(accounts, profile, drawdownConfig, mcNumSimulations, mcVolatility, lumpSumWithdrawals));
      setMcLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [accounts, profile, drawdownConfig, mcNumSimulations, mcVolatility, lumpSumWithdrawals]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#1e3a5f]/30 dark:bg-amber-500/30" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500" />
          </div>
          <span className="font-display text-lg text-muted-foreground">Loading your forecast...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Config & Stats */}
          <div className="space-y-4 lg:col-span-4">
            <div className="opacity-0 animate-fade-in stagger-1">
              <DrawdownConfigPanel
                config={drawdownConfig}
                accounts={accounts}
                retirementBalances={retirementBalances}
                onUpdate={updateDrawdownConfig}
              />
            </div>
            <div className="opacity-0 animate-fade-in stagger-2">
              <DrawdownStatsCards
                simulation={simulation}
                config={drawdownConfig}
                initialPortfolio={initialPortfolio}
              />
            </div>
          </div>

          {/* Right Column - Charts */}
          <div className="space-y-6 lg:col-span-8">
            <div className="opacity-0 animate-fade-in stagger-2">
              <DepletionChart simulation={simulation} profile={profile} />
            </div>
            <div className="opacity-0 animate-fade-in stagger-3">
              <IncomeBreakdownChart simulation={simulation} accounts={accounts} />
            </div>
            <div className="opacity-0 animate-fade-in stagger-4">
              <DrawdownYearTable simulation={simulation} accounts={accounts} />
            </div>
            <div className="opacity-0 animate-fade-in stagger-5">
              <MonteCarloChart
                mcResult={mcResult}
                deterministicResult={simulation}
                numSimulations={mcNumSimulations}
                volatility={mcVolatility}
                isLoading={mcLoading}
                onNumSimulationsChange={setMcNumSimulations}
                onVolatilityChange={setMcVolatility}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-border/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>All projections are estimates and do not constitute financial advice.</p>
            <p className="font-display text-foreground/60">RetireWise</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
