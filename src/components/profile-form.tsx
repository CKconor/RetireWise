'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import { getYearsToRetirement, formatCurrency } from '@/lib/calculations';

interface ProfileFormProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
}

const UserIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CalendarIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const TargetIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const PensionIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [currentAge, setCurrentAge] = useState(String(profile.currentAge));
  const [retirementAge, setRetirementAge] = useState(String(profile.retirementAge));
  const [targetAmount, setTargetAmount] = useState(String(profile.targetAmount));
  const [expectedInflation, setExpectedInflation] = useState(String(profile.expectedInflation));
  const [statePensionAmount, setStatePensionAmount] = useState(String(profile.statePensionAmount));
  const [statePensionAge, setStatePensionAge] = useState(String(profile.statePensionAge));

  // Sync local state when profile changes externally
  useEffect(() => {
    setCurrentAge(String(profile.currentAge));
    setRetirementAge(String(profile.retirementAge));
    setTargetAmount(String(profile.targetAmount));
    setExpectedInflation(String(profile.expectedInflation));
    setStatePensionAmount(String(profile.statePensionAmount));
    setStatePensionAge(String(profile.statePensionAge));
  }, [profile.currentAge, profile.retirementAge, profile.targetAmount, profile.expectedInflation, profile.statePensionAmount, profile.statePensionAge]);

  const handleBlur = (field: keyof UserProfile, value: string) => {
    const useFloat = field === 'expectedInflation' || field === 'statePensionAmount';
    const numValue = useFloat ? parseFloat(value) : parseInt(value);
    if (!isNaN(numValue)) {
      onUpdate({ [field]: numValue });
    } else {
      // Reset to profile value if invalid
      if (field === 'currentAge') setCurrentAge(String(profile.currentAge));
      if (field === 'retirementAge') setRetirementAge(String(profile.retirementAge));
      if (field === 'targetAmount') setTargetAmount(String(profile.targetAmount));
      if (field === 'expectedInflation') setExpectedInflation(String(profile.expectedInflation));
      if (field === 'statePensionAmount') setStatePensionAmount(String(profile.statePensionAmount));
      if (field === 'statePensionAge') setStatePensionAge(String(profile.statePensionAge));
    }
  };

  const annualStatePension = profile.statePensionAmount * 52;

  const yearsToRetirement = getYearsToRetirement(profile);

  return (
    <SectionCard
      icon={<UserIcon />}
      title="Your Details"
      contentClassName="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField id="currentAge" label="Current Age" icon={<CalendarIcon />}>
          <Input
            id="currentAge"
            type="number"
            min={18}
            max={100}
            value={currentAge}
            onChange={(e) => setCurrentAge(e.target.value)}
            onBlur={() => handleBlur('currentAge', currentAge)}
            className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
          />
        </FormField>
        <FormField id="retirementAge" label="Retirement Age" icon={<CalendarIcon />}>
          <Input
            id="retirementAge"
            type="number"
            min={18}
            max={100}
            value={retirementAge}
            onChange={(e) => setRetirementAge(e.target.value)}
            onBlur={() => handleBlur('retirementAge', retirementAge)}
            className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
          />
        </FormField>
      </div>

      {yearsToRetirement > 0 && (
        <div className="card-hero rounded-2xl p-4 text-white dark:text-[#1a1a1a] shadow-xl shadow-[#0c1929]/30 dark:shadow-amber-900/40">
          <p className="relative z-10 text-center font-display text-xl text-wh">
            {yearsToRetirement} <span className="text-xs font-sans text-white/60 dark:text-[#1a1a1a]/60">years to retirement</span>
          </p>
        </div>
      )}

      <FormField
        id="targetAmount"
        label="Retirement Target (£)"
        icon={<TargetIcon />}
        hint="In today's money. A common rule: 25x your desired annual income"
      >
        <Input
          id="targetAmount"
          type="number"
          min={0}
          step={10000}
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          onBlur={() => handleBlur('targetAmount', targetAmount)}
          className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
        />
      </FormField>

      <FormField
        id="inflation"
        label="Expected Inflation (%)"
        icon={<TrendIcon />}
        hint="UK historical average is around 2-3% per year"
      >
        <Input
          id="inflation"
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={expectedInflation}
          onChange={(e) => setExpectedInflation(e.target.value)}
          onBlur={() => handleBlur('expectedInflation', expectedInflation)}
          className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
        />
      </FormField>

      <div className="divider-gradient" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 text-muted-foreground">
              <PensionIcon />
            </div>
            <span className="text-sm font-medium">State Pension</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeStatePension"
              checked={profile.includeStatePension}
              onCheckedChange={(checked) => onUpdate({ includeStatePension: checked === true })}
            />
            <label htmlFor="includeStatePension" className="text-sm text-muted-foreground cursor-pointer">
              Include in projections
            </label>
          </div>
        </div>

        {profile.includeStatePension && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                id="statePensionAmount"
                label="Weekly Amount (£)"
                hint="Full rate: £221.20/week"
              >
                <Input
                  id="statePensionAmount"
                  type="number"
                  min={0}
                  max={500}
                  step={0.01}
                  value={statePensionAmount}
                  onChange={(e) => setStatePensionAmount(e.target.value)}
                  onBlur={() => handleBlur('statePensionAmount', statePensionAmount)}
                  className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
                />
              </FormField>
              <FormField
                id="statePensionAge"
                label="Start Age"
                hint="Currently 66-68 in UK"
              >
                <Input
                  id="statePensionAge"
                  type="number"
                  min={60}
                  max={75}
                  value={statePensionAge}
                  onChange={(e) => {
                    setStatePensionAge(e.target.value);
                    const numValue = parseInt(e.target.value);
                    if (!isNaN(numValue)) {
                      onUpdate({ statePensionAge: numValue });
                    }
                  }}
                  className="bg-secondary/30 transition-colors focus:bg-white dark:focus:bg-secondary"
                />
              </FormField>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-2.5 ring-1 ring-border/60">
              <span className="text-xs text-muted-foreground">Annual income</span>
              <span className="font-semibold">{formatCurrency(annualStatePension)}<span className="text-xs text-muted-foreground font-normal">/yr from {profile.statePensionAge}</span></span>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
