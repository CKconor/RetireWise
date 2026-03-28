'use client';

import { useState, useEffect, useMemo } from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
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

const TrendingUpIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

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
    <SectionCard icon={<TrendingUpIcon />} title="Annuity Estimator" contentClassName="space-y-4">
      {/* Type toggle */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Annuity Type</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setInflationLinked(false)}
            className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              !inflationLinked
                ? 'bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] text-white dark:from-amber-400 dark:to-amber-500 dark:text-[#0c1929] shadow-lg'
                : 'bg-secondary/50 text-muted-foreground ring-1 ring-border/60 hover:bg-secondary'
            }`}
          >
            Level
          </button>
          <button
            onClick={() => setInflationLinked(true)}
            className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              inflationLinked
                ? 'bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] text-white dark:from-amber-400 dark:to-amber-500 dark:text-[#0c1929] shadow-lg'
                : 'bg-secondary/50 text-muted-foreground ring-1 ring-border/60 hover:bg-secondary'
            }`}
          >
            Inflation-Linked
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {inflationLinked
            ? 'Payments rise with CPI each year — lower initial income but maintains purchasing power.'
            : 'Fixed payments throughout — higher initial income but erodes with inflation over time.'}
        </p>
      </div>

      {/* Inputs */}
      <FormField id="annuityPot" label="Pot to Annuitise (£)" hint="Portion of your retirement pot converted to an annuity">
        <Input
          id="annuityPot"
          type="number"
          min={0}
          step={5000}
          value={pot}
          onChange={(e) => setPot(e.target.value)}
          className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="purchaseAge" label="Purchase Age" hint="Age when you buy the annuity">
          <Input
            id="purchaseAge"
            type="number"
            min={55}
            max={85}
            value={purchaseAge}
            onChange={(e) => setPurchaseAge(e.target.value)}
            className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
          />
        </FormField>
        <FormField id="lifeExpectancy" label="Life Expectancy" hint="Estimated age to plan payments to">
          <Input
            id="lifeExpectancy"
            type="number"
            min={70}
            max={110}
            value={lifeExpectancy}
            onChange={(e) => setLifeExpectancy(e.target.value)}
            className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
          />
        </FormField>
      </div>

      {/* Results */}
      {result ? (
        <div className="rounded-xl bg-gradient-to-br from-[#0c1929]/5 to-[#1e3a5f]/10 dark:from-amber-400/10 dark:to-amber-500/5 p-4 ring-1 ring-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Annual income</span>
            <span className="text-lg font-semibold font-display">
              £{Math.round(result.annual).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly equivalent</span>
            <span className="text-base font-medium">
              £{Math.round(result.monthly).toLocaleString()}
            </span>
          </div>
          <div className="divider-gradient" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Annuity rate</span>
            <span className="text-sm font-medium">{result.percentOfPot.toFixed(2)}% of pot/yr</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-secondary/30 p-4 ring-1 ring-border/60 text-center text-sm text-muted-foreground">
          Enter valid inputs to see estimated income
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Estimates based on standard annuity pricing (level: ~4.5% discount rate; inflation-linked: ~1.5% real). Actual quotes vary by provider, health, and market conditions. This is not financial advice.
      </p>
    </SectionCard>
  );
}
