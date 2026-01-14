'use client';

import { Account, UserProfile, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatRow } from '@/components/ui/stat-row';
import {
  formatCurrency,
  calculateFutureValue,
  calculateRealReturn,
  getMonthsToRetirement,
  calculateGrowthPercentage,
} from '@/lib/calculations';

interface AccountCardProps {
  account: Account;
  profile: UserProfile;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}

const TrendIcon = () => (
  <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export function AccountCard({ account, profile, onEdit, onDelete }: AccountCardProps) {
  const months = getMonthsToRetirement(profile);
  const realReturn = calculateRealReturn(account.annualReturnRate, profile.expectedInflation);

  const projectedValueReal = calculateFutureValue(
    account.currentBalance,
    account.monthlyContribution,
    Math.max(0, realReturn),
    months
  );

  const growth = projectedValueReal - account.currentBalance;
  const growthPercentage = calculateGrowthPercentage(account.currentBalance, projectedValueReal);
  const colors = ACCOUNT_TYPE_COLORS[account.type];

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">{account.name}</h3>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {ACCOUNT_TYPE_LABELS[account.type]}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(account)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(account.id)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatRow label="Current Balance" value={formatCurrency(account.currentBalance)} />
        <StatRow label="Monthly Contribution" value={formatCurrency(account.monthlyContribution)} />
        <StatRow
          label="Expected Return"
          value={<>{account.annualReturnRate}% p.a.</>}
          icon={<TrendIcon />}
          hint={`${realReturn.toFixed(1)}% real return`}
        />

        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Projected at Retirement <span className="text-xs">(real terms)</span>
            </span>
            <div className="text-right">
              <span className="text-xl font-bold">{formatCurrency(Math.round(projectedValueReal))}</span>
              <p className="text-xs font-medium text-emerald-600">
                +{formatCurrency(Math.round(growth))} ({growthPercentage}%)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
