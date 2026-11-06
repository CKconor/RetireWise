'use client';

import { Coins } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatRow } from '@/components/ui/stat-row';
import { formatCurrency } from '@/lib/calculations';
import { Input } from '@/components/ui/input';

interface AnnuityEstimatorProps {
  defaultPot: number;
  defaultPurchaseAge: number;
}

// Discount rates used to price UK annuities (approximate, gilt-based)
const LEVEL_RATE = 0.045;        // ~4.5% — flat payment throughout
const INFLATION_LINKED_RATE = 0.015; // ~1.5% real — income rises with CPI

function estimateAnnuityIncome(pot: number, purchaseAge: number, lifeExpectancy: number, inflationLinked: boolean): number {
  const n = Math.max(1, lifeExpectancy - purchaseAge);
  const r = inflationLinked ? INFLATION_LINKED_RATE : LEVEL_RATE;
  // Standard present-value annuity formula: PMT = PV × r / (1 − (1+r)^-n)
  return (pot * r) / (1 - Math.pow(1 + r, -n));
}

export function AnnuityEstimator({ defaultPot, defaultPurchaseAge }: AnnuityEstimatorProps) {
  const [pot, setPot] = useState(String(Math.round(defaultPot)));
  const [purchaseAge, setPurchaseAge] = useState(String(defaultPurchaseAge));
  const [lifeExpectancy, setLifeExpectancy] = useState('87');
  const [inflationLinked, setInflationLinked] = useState(false);

  // Sync defaults when parent data loads
  useEffect(() => {
    setPot(String(Math.round(defaultPot)));
  }, [defaultPot]);

  useEffect(() => {
    setPurchaseAge(String(defaultPurchaseAge));
  }, [defaultPurchaseAge]);

  const result = useMemo(() => {
    const potVal = parseFloat(pot);
    const ageVal = parseFloat(purchaseAge);
    const leVal = parseFloat(lifeExpectancy);
    if (isNaN(potVal) || isNaN(ageVal) || isNaN(leVal) || potVal <= 0 || ageVal >= leVal) return null;
    const annual = estimateAnnuityIncome(potVal, ageVal, leVal, inflationLinked);
    return {
      annual,
      monthly: annual / 12,
      percentOfPot: (annual / potVal) * 100,
    };
  }, [pot, purchaseAge, lifeExpectancy, inflationLinked]);

  return (
    <SectionCard title="Annuity estimator" icon={<Coins />} contentClassName="space-y-4">
      {/* Type toggle */}
      <div className="space-y-2">
        <SegmentedControl
          label="Annuity type"
          value={inflationLinked ? 'linked' : 'level'}
          options={[
            { value: 'level', label: 'Level' },
            { value: 'linked', label: 'Inflation-linked' },
          ]}
          onChange={(v) => setInflationLinked(v === 'linked')}
          fullWidth
        />
        <p className="text-xs text-ink-10">
          {inflationLinked
            ? 'Payments rise with CPI each year: lower initial income, but it keeps its purchasing power.'
            : 'Fixed payments throughout: higher initial income, but it erodes with inflation.'}
        </p>
      </div>

      {/* Inputs */}
      <FormField id="annuityPot" label="Pot to annuitise (£)" hint="Portion of your retirement pot converted to an annuity">
        <Input
          id="annuityPot"
          type="number"
          min={0}
          step={5000}
          value={pot}
          onChange={(e) => setPot(e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="purchaseAge" label="Purchase age" hint="Age when you buy the annuity">
          <Input
            id="purchaseAge"
            type="number"
            min={55}
            max={85}
            value={purchaseAge}
            onChange={(e) => setPurchaseAge(e.target.value)}
          />
        </FormField>
        <FormField id="lifeExpectancy" label="Life expectancy" hint="Estimated age to plan payments to">
          <Input
            id="lifeExpectancy"
            type="number"
            min={70}
            max={110}
            value={lifeExpectancy}
            onChange={(e) => setLifeExpectancy(e.target.value)}
          />
        </FormField>
      </div>

      {/* Results */}
      {result ? (
        <div className="hairline-t hairline-list tabular-nums">
          <StatRow label="Annual income" value={formatCurrency(Math.round(result.annual))} />
          <StatRow label="Monthly equivalent" value={formatCurrency(Math.round(result.monthly))} />
          <StatRow label="Annuity rate" value={`${result.percentOfPot.toFixed(2)}% of pot a year`} />
        </div>
      ) : (
        <p className="text-sm text-ink-11">Enter valid inputs to see estimated income.</p>
      )}

      <p className="text-xs text-ink-10">
        Estimates based on standard annuity pricing (level: ~4.5% discount rate; inflation-linked: ~1.5% real). Actual quotes vary by provider, health, and market conditions. This is not financial advice.
      </p>
    </SectionCard>
  );
}
