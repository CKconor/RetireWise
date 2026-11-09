'use client';

import { UserProfile } from '@/types';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/calculations';
import { useRetirementSummary } from '@/contexts/retirement-engine-context';

interface StatsCardsProps {
  profile: UserProfile;
}

export function StatsCards({ profile }: StatsCardsProps) {
  const { totalBalance, totalContributions: monthlyContributions } = useRetirementSummary();

  const savingsRate = profile.annualSalary > 0
    ? Math.round((monthlyContributions * 12 / profile.annualSalary) * 100)
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Portfolio today" value={formatCurrency(totalBalance)} />
      <StatCard label="Saved each month" value={formatCurrency(monthlyContributions)} />
      <StatCard
        label="Of salary saved"
        value={savingsRate !== null ? `${savingsRate}%` : '–'}
        subValue={savingsRate !== null ? undefined : 'Add your salary in Your details to see this'}
      />
      <StatCard label={profile.targetIsEnough ? 'Lifestyle Enough' : 'Retirement target'} value={formatCurrency(profile.targetAmount)} />
    </div>
  );
}
