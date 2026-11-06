'use client';

import { Settings2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Account, DrawdownConfig } from '@/types';
import { SegmentedControl } from '@/components/ui/segmented-control';
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

const STRATEGY_OPTIONS: { value: DrawdownConfig['strategy']; label: string }[] = [
  { value: 'fixed', label: 'Fixed income' },
  { value: 'percentage', label: '% of portfolio' },
];

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
    <SectionCard title="Drawdown settings" icon={<Settings2 />} contentClassName="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm text-ink-11">Withdrawal strategy</p>
        <SegmentedControl
          label="Withdrawal strategy"
          value={config.strategy}
          options={STRATEGY_OPTIONS}
          onChange={(strategy) => onUpdate({ strategy })}
          fullWidth
        />
      </div>

      {/* Strategy-specific input */}
      {config.strategy === 'fixed' ? (
        <FormField
          id="fixedAnnualIncome"
          label="Annual income target (£)"
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
          />
        </FormField>
      ) : (
        <FormField
          id="withdrawalRate"
          label="Withdrawal rate (%)"
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
          />
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="drawdownReturnRate"
          label="Return after inflation (%)"
          hint="Yearly growth in retirement, in today's money"
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
          />
        </FormField>
        <FormField
          id="planningHorizon"
          label="Plan to age"
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
          />
        </FormField>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-11">
        <Checkbox
          checked={config.taxModeling}
          onCheckedChange={(checked) => onUpdate({ taxModeling: checked === true })}
        />
        Model tax on withdrawals
      </label>

      {/* Account withdrawal order */}
      <div className="hairline-t pt-4">
        <p className="text-sm text-ink-12">Withdrawal order</p>
        <p className="mb-1 text-xs text-ink-10">Accounts are drained in this order during retirement</p>
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
