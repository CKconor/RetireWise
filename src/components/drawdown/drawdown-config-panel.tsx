'use client';

import { useState, useEffect } from 'react';
import { Account, DrawdownConfig } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AccountOrderList } from './account-order-list';

interface DrawdownConfigPanelProps {
  config: DrawdownConfig;
  accounts: Account[];
  retirementBalances: Record<string, number>;
  onUpdate: (updates: Partial<DrawdownConfig>) => void;
}

const SettingsIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export function DrawdownConfigPanel({ config, accounts, retirementBalances, onUpdate }: DrawdownConfigPanelProps) {
  const [fixedIncome, setFixedIncome] = useState(String(config.fixedAnnualIncome));
  const [withdrawalRate, setWithdrawalRate] = useState(String(config.withdrawalRate));
  const [returnRate, setReturnRate] = useState(String(config.drawdownReturnRate));
  const [horizon, setHorizon] = useState(String(config.planningHorizon));

  useEffect(() => {
    setFixedIncome(String(config.fixedAnnualIncome));
    setWithdrawalRate(String(config.withdrawalRate));
    setReturnRate(String(config.drawdownReturnRate));
    setHorizon(String(config.planningHorizon));
  }, [config.fixedAnnualIncome, config.withdrawalRate, config.drawdownReturnRate, config.planningHorizon]);

  const handleBlur = (field: keyof DrawdownConfig, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onUpdate({ [field]: numValue });
    }
  };

  return (
    <SectionCard icon={<SettingsIcon />} title="Drawdown Settings" contentClassName="space-y-4">
      {/* Strategy toggle */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Withdrawal Strategy</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onUpdate({ strategy: 'fixed' })}
            className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              config.strategy === 'fixed'
                ? 'bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] text-white dark:from-amber-400 dark:to-amber-500 dark:text-[#0c1929] shadow-lg'
                : 'bg-secondary/50 text-muted-foreground ring-1 ring-border/60 hover:bg-secondary'
            }`}
          >
            Fixed Income
          </button>
          <button
            onClick={() => onUpdate({ strategy: 'percentage' })}
            className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              config.strategy === 'percentage'
                ? 'bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] text-white dark:from-amber-400 dark:to-amber-500 dark:text-[#0c1929] shadow-lg'
                : 'bg-secondary/50 text-muted-foreground ring-1 ring-border/60 hover:bg-secondary'
            }`}
          >
            % of Portfolio
          </button>
          <button
            onClick={() => onUpdate({ strategy: 'rmd' })}
            className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              config.strategy === 'rmd'
                ? 'bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] text-white dark:from-amber-400 dark:to-amber-500 dark:text-[#0c1929] shadow-lg'
                : 'bg-secondary/50 text-muted-foreground ring-1 ring-border/60 hover:bg-secondary'
            }`}
          >
            RMD
          </button>
        </div>
      </div>

      {/* Strategy-specific input */}
      {config.strategy === 'fixed' ? (
        <FormField
          id="fixedAnnualIncome"
          label="Annual Income Target (£)"
          hint="How much you want to withdraw each year in today's money"
        >
          <Input
            id="fixedAnnualIncome"
            type="number"
            min={0}
            step={1000}
            value={fixedIncome}
            onChange={(e) => setFixedIncome(e.target.value)}
            onBlur={() => handleBlur('fixedAnnualIncome', fixedIncome)}
            className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
          />
        </FormField>
      ) : config.strategy === 'rmd' ? (
        <p className="text-sm text-muted-foreground">
          Withdraws the portfolio balance divided by an IRS life expectancy factor each year — mandatory minimums rise as a share of the pot with age.
        </p>
      ) : (
        <FormField
          id="withdrawalRate"
          label="Withdrawal Rate (%)"
          hint="4% is the classic 'safe withdrawal rate'"
        >
          <Input
            id="withdrawalRate"
            type="number"
            min={0.5}
            max={10}
            step={0.25}
            value={withdrawalRate}
            onChange={(e) => setWithdrawalRate(e.target.value)}
            onBlur={() => handleBlur('withdrawalRate', withdrawalRate)}
            className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
          />
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="drawdownReturnRate"
          label="Return Rate (%)"
          hint="Conservative growth during retirement"
        >
          <Input
            id="drawdownReturnRate"
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={returnRate}
            onChange={(e) => setReturnRate(e.target.value)}
            onBlur={() => handleBlur('drawdownReturnRate', returnRate)}
            className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
          />
        </FormField>
        <FormField
          id="planningHorizon"
          label="Plan To Age"
          hint="How long to plan for"
        >
          <Input
            id="planningHorizon"
            type="number"
            min={60}
            max={110}
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            onBlur={() => handleBlur('planningHorizon', horizon)}
            className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
          />
        </FormField>
      </div>

      {/* Tax modeling toggle */}
      <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 ring-1 ring-border/60">
        <span className="text-sm font-medium">Tax Modeling</span>
        <div className="flex items-center gap-2">
          <Checkbox
            id="taxModeling"
            checked={config.taxModeling}
            onCheckedChange={(checked) => onUpdate({ taxModeling: checked === true })}
          />
          <label htmlFor="taxModeling" className="text-sm text-muted-foreground cursor-pointer">
            {config.taxModeling ? 'Enabled' : 'Disabled'}
          </label>
        </div>
      </div>

      <div className="divider-gradient" />

      {/* Account withdrawal order */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Withdrawal Order</p>
        <p className="text-xs text-muted-foreground">Accounts are drained in this order during retirement</p>
        <AccountOrderList
          accounts={accounts}
          accountOrder={config.accountOrder}
          retirementBalances={retirementBalances}
          onReorder={(newOrder) => onUpdate({ accountOrder: newOrder })}
        />
      </div>
    </SectionCard>
  );
}
