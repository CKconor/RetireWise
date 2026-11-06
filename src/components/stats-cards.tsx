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
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard label="Portfolio today" value={formatCurrency(totalBalance)} />
      <StatCard
        label="Saved each month"
        value={formatCurrency(monthlyContributions)}
        subValue={savingsRate !== null ? `${savingsRate}% of salary` : undefined}
      />
      <StatCard label={profile.targetIsEnough ? 'Lifestyle Enough' : 'Retirement target'} value={formatCurrency(profile.targetAmount)} />
    </div>
  );
}
