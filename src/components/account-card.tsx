'use client';

import { useState } from 'react';
import { Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { Account, UserProfile, ACCOUNT_TYPE_LABELS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Figure } from '@/components/ui/stat-card';
import { StatRow } from '@/components/ui/stat-row';
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
  baselineExpectedBalance?: number;
  contributionsPaused?: boolean;
  onToggleContribPause?: () => void;
}

export function AccountCard({ account, profile, onEdit, onDelete, baselineExpectedBalance, contributionsPaused = false, onToggleContribPause }: AccountCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const months = getMonthsToRetirement(profile);
  const realReturn = calculateRealReturn(account.annualReturnRate, profile.expectedInflation);

  const increase = account.annualContributionIncrease ?? 0;

  const effectiveContribution = contributionsPaused ? 0 : account.monthlyContribution;
  const stepUpAccount = contributionsPaused ? undefined : account;
  const stepUpStartAge = contributionsPaused ? undefined : profile.currentAge;

  const projectedValueReal = calculateFutureValue(
    account.currentBalance,
    effectiveContribution,
    Math.max(0, realReturn),
    months,
    increase,
    stepUpAccount,
    stepUpStartAge
  );

  const projectedValueNominal = calculateFutureValue(
    account.currentBalance,
    effectiveContribution,
    account.annualReturnRate,
    months,
    increase,
    stepUpAccount,
    stepUpStartAge
  );

  const growth = projectedValueReal - account.currentBalance;
  const growthPercentage = calculateGrowthPercentage(account.currentBalance, projectedValueReal);
  const baselineDelta = baselineExpectedBalance !== undefined ? account.currentBalance - baselineExpectedBalance : null;
  const sortedChanges = [...(account.contributionChanges ?? [])].sort((a, b) => a.age - b.age);

  return (
    <Card className={`tone-${account.type} overflow-hidden pt-0`}>
      <CardHeader className="flex items-start justify-between gap-3 bg-[var(--tone-3)] py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base text-ink-12" title={account.name}>{account.name}</h3>
          <Badge tone={account.type} className="mt-1">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {onToggleContribPause && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleContribPause}
              title={contributionsPaused ? 'Resume contributions in projection' : 'Pause contributions in projection'}
              aria-label={contributionsPaused ? 'Resume contributions in projection' : 'Pause contributions in projection'}
            >
              {contributionsPaused ? <Play /> : <Pause />}
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(account)} aria-label={`Edit ${account.name}`}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={`Delete ${account.name}`}
            className="hover:text-red-11"
          >
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 gap-4">
          <Figure
            label="Balance"
            value={formatCurrency(account.currentBalance)}
            subValue={
              baselineDelta !== null && (
                <span className={baselineDelta >= 0 ? 'text-green-11' : 'text-red-11'}>
                  {baselineDelta >= 0 ? '+' : ''}{formatCurrency(Math.round(baselineDelta))} vs baseline
                </span>
              )
            }
          />
          <Figure
            label="At retirement"
            value={formatCurrency(Math.round(projectedValueReal))}
            subValue={`+${formatCurrency(Math.round(growth))} (${growthPercentage}%)`}
          />
        </div>

        <div className="hairline-t hairline-list mt-auto tabular-nums">
          <StatRow
            label={contributionsPaused ? 'Monthly, paused' : 'Monthly'}
            value={
              <span className={contributionsPaused ? 'text-ink-10 line-through' : undefined}>
                {formatCurrency(account.monthlyContribution)}
              </span>
            }
            hint={increase > 0 ? `+${increase}% a year` : undefined}
          />
          {sortedChanges.map((change) => (
            <StatRow
              key={change.id}
              label={`From age ${change.age}`}
              value={`${formatCurrency(change.monthlyContribution)}/mo`}
            />
          ))}
          <StatRow
            label="Expected return"
            value={`${account.annualReturnRate}%`}
            hint={`${realReturn.toFixed(1)}% real`}
          />
          <StatRow label="Before inflation" value={formatCurrency(Math.round(projectedValueNominal))} />
        </div>
      </CardContent>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="md:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{account.name}&rdquo;? This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
