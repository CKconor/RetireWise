'use client';

import { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/calculations';

interface ProfileFormProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
}

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const yearsToRetirement = profile.retirementAge - profile.currentAge;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Your Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentAge" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Current Age
            </Label>
            <Input
              id="currentAge"
              type="number"
              min={18}
              max={100}
              value={profile.currentAge}
              onChange={(e) =>
                onUpdate({ currentAge: parseInt(e.target.value) || 0 })
              }
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retirementAge" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Retirement Age
            </Label>
            <Input
              id="retirementAge"
              type="number"
              min={profile.currentAge + 1}
              max={100}
              value={profile.retirementAge}
              onChange={(e) =>
                onUpdate({ retirementAge: parseInt(e.target.value) || 0 })
              }
              className="bg-secondary/50"
            />
          </div>
        </div>

        {yearsToRetirement > 0 && (
          <div className="rounded-lg bg-secondary/50 px-4 py-2 text-center text-sm">
            <span className="font-semibold">{yearsToRetirement} years</span>
            <span className="text-muted-foreground"> until retirement</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="targetAmount" className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Retirement Target (£)
          </Label>
          <Input
            id="targetAmount"
            type="number"
            min={0}
            step={10000}
            value={profile.targetAmount}
            onChange={(e) =>
              onUpdate({ targetAmount: parseInt(e.target.value) || 0 })
            }
            className="bg-secondary/50"
          />
          <p className="text-xs text-muted-foreground">
            In today's money. A common rule: 25x your desired annual income
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inflation" className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Expected Inflation (%)
          </Label>
          <Input
            id="inflation"
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={profile.expectedInflation}
            onChange={(e) =>
              onUpdate({ expectedInflation: parseFloat(e.target.value) || 0 })
            }
            className="bg-secondary/50"
          />
          <p className="text-xs text-muted-foreground">
            UK historical average is around 2-3% per year
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
