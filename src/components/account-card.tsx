'use client';

import { useState } from 'react';
import { Account, UserProfile, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function AccountCard({ account, profile, onEdit, onDelete }: AccountCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const months = getMonthsToRetirement(profile);
  const realReturn = calculateRealReturn(account.annualReturnRate, profile.expectedInflation);

  const projectedValueReal = calculateFutureValue(
    account.currentBalance,
    account.monthlyContribution,
    Math.max(0, realReturn),
    months
  );

  const projectedValueNominal = calculateFutureValue(
    account.currentBalance,
    account.monthlyContribution,
    account.annualReturnRate,
    months
  );

  const growth = projectedValueReal - account.currentBalance;
  const growthPercentage = calculateGrowthPercentage(account.currentBalance, projectedValueReal);
  const colors = ACCOUNT_TYPE_COLORS[account.type];

  return (
    <Card className="card-hover card-premium overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
              <svg className="h-5 w-5 text-amber-400 dark:text-[#0c1929]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-2xl">{account.name}</h3>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {ACCOUNT_TYPE_LABELS[account.type]}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(account)}
              className="h-8 w-8 p-0 text-muted-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 w-8 p-0 text-muted-foreground transition-colors hover:bg-red-50 dark:hover:bg-red-950 hover:text-destructive"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/80 p-2.5">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-display text-lg">{formatCurrency(account.currentBalance)}</p>
          </div>
          <div className="rounded-lg bg-slate-50/80 dark:bg-slate-800/80 p-2.5">
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className="font-display text-lg">{formatCurrency(account.monthlyContribution)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50/80 dark:bg-slate-800/80 p-2.5">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-teal-500 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs text-muted-foreground">Expected Return</span>
          </div>
          <div className="text-right">
            <span className="font-semibold">{account.annualReturnRate}%</span>
            <span className="ml-1 text-xs text-muted-foreground">({realReturn.toFixed(1)}% real)</span>
          </div>
        </div>

        <div className="divider-gradient" />

        <div className="rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-900/30 dark:to-emerald-900/30 p-3 ring-1 ring-teal-200 dark:ring-teal-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-teal-700 dark:text-teal-300">Projected Value</p>
              <p className="text-xs text-teal-600/70 dark:text-teal-400/70">at retirement (real terms)</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl text-teal-700 dark:text-teal-300">{formatCurrency(Math.round(projectedValueReal))}</p>
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                +{formatCurrency(Math.round(growth))} ({growthPercentage}%)
              </p>
              <p className="mt-1 text-xs text-teal-600/70 dark:text-teal-400/70">
                {formatCurrency(Math.round(projectedValueNominal))} before inflation
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{account.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(account.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
