'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRetirementState, useRetirementMutations } from '@/contexts/retirement-store-context';
import { PageLoading, PageShell } from '@/components/page-shell';
import { DrawdownConfigPanel } from '@/components/drawdown/drawdown-config-panel';
import { DrawdownStatsCards } from '@/components/drawdown/drawdown-stats-cards';
import { DepletionChart } from '@/components/drawdown/depletion-chart';
import { IncomeBreakdownChart } from '@/components/drawdown/income-breakdown-chart';
import { DrawdownYearTable } from '@/components/drawdown/drawdown-year-table';
import { MonteCarloChart } from '@/components/drawdown/monte-carlo-chart';
import { AnnuityEstimator } from '@/components/drawdown/annuity-estimator';
import { simulateDrawdown, runMonteCarloSimulation } from '@/lib/drawdown';
import { simulateAccountFinalBalance } from '@/lib/calculations';

export default function DrawdownPage() {
  const { profile, accounts, drawdownConfig, effectiveLumpSumWithdrawals: lumpSumWithdrawals, isLoaded } = useRetirementState();
  const { drawdown } = useRetirementMutations();

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
    return <PageLoading />;
  }

  return (
    <PageShell>
      <DrawdownStatsCards
        simulation={simulation}
        config={drawdownConfig}
        initialPortfolio={initialPortfolio}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-4">
          <DrawdownConfigPanel
            config={drawdownConfig}
            accounts={accounts}
            retirementBalances={retirementBalances}
            onUpdate={drawdown.updateConfig}
          />
          <AnnuityEstimator
            defaultPot={initialPortfolio}
            defaultPurchaseAge={profile.retirementAge}
          />
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-8">
          <DepletionChart simulation={simulation} profile={profile} />
          <IncomeBreakdownChart simulation={simulation} accounts={accounts} />
          <MonteCarloChart
            mcResult={mcResult}
            deterministicResult={simulation}
            numSimulations={mcNumSimulations}
            volatility={mcVolatility}
            isLoading={mcLoading}
            onNumSimulationsChange={setMcNumSimulations}
            onVolatilityChange={setMcVolatility}
          />
          <DrawdownYearTable simulation={simulation} accounts={accounts} />
        </div>
      </div>
    </PageShell>
  );
}
