'use client';

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
  const yearsToRetirement = getYearsToRetirement(profile);

  return (
    <SectionCard
      icon={<UserIcon />}
      iconColor="text-primary"
      title="Your Details"
      contentClassName="space-y-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField id="currentAge" label="Current Age" icon={<CalendarIcon />}>
          <Input
            id="currentAge"
            type="number"
            min={18}
            max={100}
            value={profile.currentAge}
            onChange={(e) => onUpdate({ currentAge: parseInt(e.target.value) || 0 })}
            className="bg-secondary/50"
          />
        </FormField>
        <FormField id="retirementAge" label="Retirement Age" icon={<CalendarIcon />}>
          <Input
            id="retirementAge"
            type="number"
            min={profile.currentAge + 1}
            max={100}
            value={profile.retirementAge}
            onChange={(e) => onUpdate({ retirementAge: parseInt(e.target.value) || 0 })}
            className="bg-secondary/50"
          />
        </FormField>
      </div>

      {yearsToRetirement > 0 && (
        <div className="rounded-lg bg-secondary/50 px-4 py-2 text-center text-sm">
          <span className="font-semibold">{yearsToRetirement} years</span>
          <span className="text-muted-foreground"> until retirement</span>
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
          value={profile.targetAmount}
          onChange={(e) => onUpdate({ targetAmount: parseInt(e.target.value) || 0 })}
          className="bg-secondary/50"
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
          value={profile.expectedInflation}
          onChange={(e) => onUpdate({ expectedInflation: parseFloat(e.target.value) || 0 })}
          className="bg-secondary/50"
        />
      </FormField>
    </SectionCard>
  );
}
