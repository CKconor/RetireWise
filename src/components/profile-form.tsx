'use client';

import { User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionCard } from '@/components/ui/section-card';
import { FormField } from '@/components/ui/form-field';
import { StatRow } from '@/components/ui/stat-row';
import { DatePicker } from '@/components/ui/date-picker';
import { getYearsToRetirement, formatCurrency } from '@/lib/calculations';

interface ProfileFormProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
}

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [retirementAge, setRetirementAge] = useState(String(profile.retirementAge));
  const [targetAmount, setTargetAmount] = useState(String(profile.targetAmount));
  const [expectedInflation, setExpectedInflation] = useState(String(profile.expectedInflation));
  const [annualSalary, setAnnualSalary] = useState(String(profile.annualSalary ?? 0));
  const [statePensionAmount, setStatePensionAmount] = useState(String(profile.statePensionAmount));
  const [statePensionAge, setStatePensionAge] = useState(String(profile.statePensionAge));

  // Sync local state when profile changes externally
  useEffect(() => {
    setRetirementAge(String(profile.retirementAge));
    setTargetAmount(String(profile.targetAmount));
    setExpectedInflation(String(profile.expectedInflation));
    setAnnualSalary(String(profile.annualSalary ?? 0));
    setStatePensionAmount(String(profile.statePensionAmount));
    setStatePensionAge(String(profile.statePensionAge));
  }, [profile.retirementAge, profile.targetAmount, profile.expectedInflation, profile.annualSalary, profile.statePensionAmount, profile.statePensionAge]);

  const handleBlur = (field: keyof UserProfile, value: string) => {
    const useFloat = field === 'expectedInflation' || field === 'statePensionAmount' || field === 'annualSalary';
    const numValue = useFloat ? parseFloat(value) : parseInt(value);
    if (!isNaN(numValue)) {
      onUpdate({ [field]: numValue });
    } else {
      // Reset to profile value if invalid
      if (field === 'retirementAge') setRetirementAge(String(profile.retirementAge));
      if (field === 'targetAmount') setTargetAmount(String(profile.targetAmount));
      if (field === 'expectedInflation') setExpectedInflation(String(profile.expectedInflation));
      if (field === 'annualSalary') setAnnualSalary(String(profile.annualSalary ?? 0));
      if (field === 'statePensionAmount') setStatePensionAmount(String(profile.statePensionAmount));
      if (field === 'statePensionAge') setStatePensionAge(String(profile.statePensionAge));
    }
  };

  const annualStatePension = profile.statePensionAmount * 52;

  const yearsToRetirement = getYearsToRetirement(profile);

  return (
    <SectionCard
      title="Your details" icon={<User />}
      contentClassName="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField id="birthday" label="Date of birth" hint={`Age ${profile.currentAge}`}>
          <DatePicker
            value={profile.birthday}
            max={new Date().toISOString().split('T')[0]}
            onChange={(date) => onUpdate({ birthday: date })}
          />
        </FormField>
        <FormField
          id="retirementAge"
          label="Retirement age"
          hint={yearsToRetirement > 0 ? `${yearsToRetirement} years to go` : undefined}
        >
          <Input
            id="retirementAge"
            type="number"
            min={18}
            max={100}
            value={retirementAge}
            onChange={(e) => setRetirementAge(e.target.value)}
            onBlur={() => handleBlur('retirementAge', retirementAge)}
          />
        </FormField>
      </div>

      <FormField
        id="targetAmount"
        label="Retirement target (£)"
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
        />
      </FormField>

      <FormField
        id="inflation"
        label="Expected inflation (%)"
        hint="UK historical average is around 2–3% a year"
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
        />
      </FormField>

      <FormField
        id="annualSalary"
        label="Annual salary (£)"
        hint="Used to calculate your savings rate"
      >
        <Input
          id="annualSalary"
          type="number"
          min={0}
          step={1000}
          value={annualSalary}
          onChange={(e) => setAnnualSalary(e.target.value)}
          onBlur={() => handleBlur('annualSalary', annualSalary)}
        />
      </FormField>

      <div className="hairline-t space-y-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-ink-12">State pension</span>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-11">
            <Checkbox
              checked={profile.includeStatePension}
              onCheckedChange={(checked) => onUpdate({ includeStatePension: checked === true })}
            />
            Include in projections
          </label>
        </div>

        {profile.includeStatePension && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                id="statePensionAmount"
                label="Weekly amount (£)"
                hint="Full rate: £221.20 a week"
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
                />
              </FormField>
              <FormField
                id="statePensionAge"
                label="Start age"
                hint="Currently 66–68 in the UK"
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
                />
              </FormField>
            </div>
            <StatRow label="Annual income" value={formatCurrency(annualStatePension)} hint={`a year from ${profile.statePensionAge}`} className="tabular-nums" />
          </>
        )}
      </div>
    </SectionCard>
  );
}
