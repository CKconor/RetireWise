'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import { getYearsToRetirement } from '@/lib/calculations';

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

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [currentAge, setCurrentAge] = useState(String(profile.currentAge));
  const [retirementAge, setRetirementAge] = useState(String(profile.retirementAge));
  const [targetAmount, setTargetAmount] = useState(String(profile.targetAmount));
  const [expectedInflation, setExpectedInflation] = useState(String(profile.expectedInflation));

  // Sync local state when profile changes externally
  useEffect(() => {
    setCurrentAge(String(profile.currentAge));
    setRetirementAge(String(profile.retirementAge));
    setTargetAmount(String(profile.targetAmount));
    setExpectedInflation(String(profile.expectedInflation));
  }, [profile.currentAge, profile.retirementAge, profile.targetAmount, profile.expectedInflation]);

  const handleBlur = (field: keyof UserProfile, value: string) => {
    const numValue = field === 'expectedInflation' ? parseFloat(value) : parseInt(value);
    if (!isNaN(numValue)) {
      onUpdate({ [field]: numValue });
    } else {
      // Reset to profile value if invalid
      if (field === 'currentAge') setCurrentAge(String(profile.currentAge));
      if (field === 'retirementAge') setRetirementAge(String(profile.retirementAge));
      if (field === 'targetAmount') setTargetAmount(String(profile.targetAmount));
      if (field === 'expectedInflation') setExpectedInflation(String(profile.expectedInflation));
    }
  };

  const yearsToRetirement = getYearsToRetirement(profile);

  return (
    <SectionCard
      icon={<UserIcon />}
      iconColor="text-[#0c1929]"
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
            className="bg-secondary/30 transition-colors focus:bg-white"
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
            className="bg-secondary/30 transition-colors focus:bg-white"
          />
        </FormField>
      </div>

      {yearsToRetirement > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-[#0c1929] to-[#1e3a5f] px-4 py-3 text-center">
          <span className="font-display text-2xl text-white">{yearsToRetirement}</span>
          <span className="ml-2 text-sm text-white/70">years until retirement</span>
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
          className="bg-secondary/30 transition-colors focus:bg-white"
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
          className="bg-secondary/30 transition-colors focus:bg-white"
        />
      </FormField>
    </SectionCard>
  );
}
