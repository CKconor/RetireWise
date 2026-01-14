'use client';

import { Account, UserProfile } from '@/types';
import { Card } from '@/components/ui/card';
import {
  calculateTotalBalance,
  calculateTotalContributions,
  formatCurrency,
} from '@/lib/calculations';

interface StatsCardsProps {
  accounts: Account[];
  profile: UserProfile;
}

export function StatsCards({ accounts, profile }: StatsCardsProps) {
  const totalBalance = calculateTotalBalance(accounts);
  const monthlyContributions = calculateTotalContributions(accounts);

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="p-3 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Current Portfolio</p>
        <p className="text-base font-bold">{formatCurrency(totalBalance)}</p>
      </Card>

      <Card className="p-3 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
          <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Monthly</p>
        <p className="text-base font-bold">{formatCurrency(monthlyContributions)}</p>
      </Card>

      <Card className="p-3 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
          <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Target</p>
        <p className="text-base font-bold">{formatCurrency(profile.targetAmount)}</p>
      </Card>
    </div>
  );
}
