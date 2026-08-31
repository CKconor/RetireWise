'use client';

import { useState, useEffect } from 'react';
import { Account, AccountType, ContributionChange, UserProfile, ACCOUNT_TYPE_LABELS, DEFAULT_RETURN_RATES } from '@/types';
import { generateContributionChangeId } from '@/lib/storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  profile: UserProfile;
  onSave: (account: Omit<Account, 'id'>) => void;
}

const ACCOUNT_TYPES: AccountType[] = ['isa', 'sipp', 'pension', 'gia', 'savings'];

export function AccountForm({ open, onOpenChange, account, profile, onSave }: AccountFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('isa');
  const [currentBalance, setCurrentBalance] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [annualReturnRate, setAnnualReturnRate] = useState('');
  const [annualContributionIncrease, setAnnualContributionIncrease] = useState('0');
  const [contributionChangeRows, setContributionChangeRows] = useState<
    { id: string; age: string; monthlyContribution: string }[]
  >([]);

  useEffect(() => {
    if (open) {
      if (account) {
        setName(account.name);
        setType(account.type);
        setCurrentBalance(String(account.currentBalance));
        setMonthlyContribution(String(account.monthlyContribution));
        setAnnualReturnRate(String(account.annualReturnRate));
        setAnnualContributionIncrease(String(account.annualContributionIncrease ?? 0));
        setContributionChangeRows(
          (account.contributionChanges ?? []).map((c) => ({
            id: c.id,
            age: String(c.age),
            monthlyContribution: String(c.monthlyContribution),
          }))
        );
      } else {
        setName('');
        setType('isa');
        setCurrentBalance('');
        setMonthlyContribution('');
        setAnnualReturnRate(String(DEFAULT_RETURN_RATES['isa']));
        setAnnualContributionIncrease('0');
        setContributionChangeRows([]);
      }
    }
  }, [open, account]);

  const handleTypeChange = (newType: AccountType) => {
    setType(newType);
    if (!account) {
      setAnnualReturnRate(String(DEFAULT_RETURN_RATES[newType]));
    }
  };

  const isRowValid = (row: { age: string; monthlyContribution: string }) => {
    const ageNum = parseInt(row.age, 10);
    return (
      row.monthlyContribution.trim() !== '' &&
      !isNaN(ageNum) &&
      ageNum > profile.currentAge &&
      ageNum < profile.retirementAge
    );
  };

  const contributionChangesValid = contributionChangeRows.every(isRowValid);

  const addContributionChangeRow = () => {
    setContributionChangeRows((rows) => [
      ...rows,
      { id: generateContributionChangeId(), age: '', monthlyContribution: '' },
    ]);
  };

  const updateContributionChangeRow = (id: string, updates: Partial<{ age: string; monthlyContribution: string }>) => {
    setContributionChangeRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeContributionChangeRow = (id: string) => {
    setContributionChangeRows((rows) => rows.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionChangesValid) return;
    const contributionChanges: ContributionChange[] = contributionChangeRows.map((r) => ({
      id: r.id,
      age: parseInt(r.age, 10),
      monthlyContribution: parseFloat(r.monthlyContribution) || 0,
    }));
    onSave({
      name: name.trim() || ACCOUNT_TYPE_LABELS[type],
      type,
      currentBalance: parseFloat(currentBalance) || 0,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      annualReturnRate: parseFloat(annualReturnRate) || 0,
      annualContributionIncrease: parseFloat(annualContributionIncrease) || 0,
      contributionChanges: contributionChanges.length > 0 ? contributionChanges : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Account' : 'Add Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="accountName" label="Account Name">
            <Input
              id="accountName"
              placeholder="e.g., Vanguard ISA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary/50"
            />
          </FormField>

          <FormField id="accountType" label="Account Type">
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="currentBalance" label="Current Balance (£)">
              <Input
                id="currentBalance"
                type="number"
                min={0}
                step="any"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="bg-secondary/50"
              />
            </FormField>
            <FormField id="monthlyContribution" label="Monthly Contribution (£)">
              <Input
                id="monthlyContribution"
                type="number"
                min={0}
                step="any"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="bg-secondary/50"
              />
            </FormField>
          </div>

          <FormField
            id="annualContributionIncrease"
            label="Annual Contribution Increase (%)"
            hint="e.g. 2% to match expected salary growth"
          >
            <Input
              id="annualContributionIncrease"
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={annualContributionIncrease}
              onChange={(e) => setAnnualContributionIncrease(e.target.value)}
              className="bg-secondary/50"
            />
          </FormField>

          <div className="rounded-lg border border-border/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Future contribution changes</span>
              <Button type="button" size="sm" variant="outline" onClick={addContributionChangeRow}>
                + Add change
              </Button>
            </div>
            {contributionChangeRows.map((row) => {
              const rowValid = isRowValid(row);
              return (
                <div key={row.id} className="space-y-1">
                  <div className="flex items-end gap-2">
                    <FormField id={`contribAmount-${row.id}`} label="New Monthly Contribution (£)" className="flex-1">
                      <Input
                        id={`contribAmount-${row.id}`}
                        type="number"
                        min={0}
                        step="any"
                        value={row.monthlyContribution}
                        onChange={(e) => updateContributionChangeRow(row.id, { monthlyContribution: e.target.value })}
                        className="bg-secondary/50"
                        required
                      />
                    </FormField>
                    <FormField
                      id={`contribAge-${row.id}`}
                      label="At Age"
                      hint={`${profile.currentAge + 1}–${profile.retirementAge - 1}`}
                      className="flex-1"
                    >
                      <Input
                        id={`contribAge-${row.id}`}
                        type="number"
                        min={profile.currentAge + 1}
                        max={profile.retirementAge - 1}
                        step={1}
                        value={row.age}
                        onChange={(e) => updateContributionChangeRow(row.id, { age: e.target.value })}
                        className="bg-secondary/50"
                        required
                      />
                    </FormField>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="mb-2 h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeContributionChangeRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {!rowValid && (
                    <p className="text-xs text-destructive">
                      Age must be between {profile.currentAge + 1} and {profile.retirementAge - 1}.
                    </p>
                  )}
                </div>
              );
            })}
            {contributionChangeRows.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add a change to model a pay rise, bonus, or contribution pause at a future age.
              </p>
            )}
          </div>

          <FormField
            id="annualReturnRate"
            label="Expected Annual Return (%)"
            hint="Typical: Stocks 5-10%, Bonds 2-4%, Savings 1-4%"
          >
            <Input
              id="annualReturnRate"
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={annualReturnRate}
              onChange={(e) => setAnnualReturnRate(e.target.value)}
              className="bg-secondary/50"
            />
          </FormField>

          <DialogFooter className="gap-4 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary ml-4" disabled={!contributionChangesValid}>
              {account ? 'Save Changes' : 'Add Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
