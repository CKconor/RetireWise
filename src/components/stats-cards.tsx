'use client';

import { Account, UserProfile } from '@/types';
import { StatCard } from '@/components/ui/stat-card';
import {
  calculateTotalBalance,
  calculateTotalContributions,
  formatCurrency,
} from '@/lib/calculations';

interface StatsCardsProps {
  accounts: Account[];
  profile: UserProfile;
}

const WalletIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const TrendIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TargetIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export function StatsCards({ accounts, profile }: StatsCardsProps) {
  const totalBalance = calculateTotalBalance(accounts);
  const monthlyContributions = calculateTotalContributions(accounts);

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        icon={<WalletIcon />}
        iconColor="blue"
        label="Current Portfolio"
        value={formatCurrency(totalBalance)}
      />
      <StatCard
        icon={<TrendIcon />}
        iconColor="emerald"
        label="Monthly"
        value={formatCurrency(monthlyContributions)}
      />
      <StatCard
        icon={<TargetIcon />}
        iconColor="purple"
        label="Target"
        value={formatCurrency(profile.targetAmount)}
      />
    </div>
  );
}
