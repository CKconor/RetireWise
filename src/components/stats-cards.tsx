'use client';

import { UserProfile } from '@/types';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/calculations';
import { useRetirementProjection } from '@/contexts/retirement-engine-context';

interface StatsCardsProps {
  profile: UserProfile;
}

const WalletIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const TrendIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TargetIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export function StatsCards({ profile }: StatsCardsProps) {
  const { totalBalance, totalContributions: monthlyContributions } = useRetirementProjection();

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        icon={<WalletIcon />}
        label="Portfolio"
        value={formatCurrency(totalBalance)}
      />
      <StatCard
        icon={<TrendIcon />}
        label="Monthly"
        value={formatCurrency(monthlyContributions)}
      />
      <StatCard
        icon={<TargetIcon />}
        label="Target"
        value={formatCurrency(profile.targetAmount)}
      />
    </div>
  );
}
