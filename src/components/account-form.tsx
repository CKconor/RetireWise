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
import { Plus, Trash2 } from 'lucide-react';

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
      <DialogContent className="md:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit account' : 'Add account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="accountName" label="Account name">
            <Input
              id="accountName"
              placeholder="e.g., Vanguard ISA"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>

          <FormField id="accountType" label="Account type">
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger id="accountType">
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

          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="currentBalance" label="Current balance (£)">
              <Input
                id="currentBalance"
                type="number"
                min={0}
                step="any"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
              />
            </FormField>
            <FormField id="monthlyContribution" label="Monthly contribution (£)">
              <Input
                id="monthlyContribution"
                type="number"
                min={0}
                step="any"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
              />
            </FormField>
          </div>

          <FormField
            id="annualContributionIncrease"
            label="Annual contribution increase (%)"
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
            />
          </FormField>

          <div className="hairline-t space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-12">Future contribution changes</span>
              <Button type="button" size="sm" variant="outline" onClick={addContributionChangeRow}>
                <Plus />
                Add change
              </Button>
            </div>
            {contributionChangeRows.map((row) => {
              const rowValid = isRowValid(row);
              return (
                <div key={row.id} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <FormField id={`contribAmount-${row.id}`} label="New monthly (£)" className="flex-1">
                      <Input
                        id={`contribAmount-${row.id}`}
                        type="number"
                        min={0}
                        step="any"
                        value={row.monthlyContribution}
                        onChange={(e) => updateContributionChangeRow(row.id, { monthlyContribution: e.target.value })}
                        required
                      />
                    </FormField>
                    <FormField
                      id={`contribAge-${row.id}`}
                      label="At age"
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
                        required
                      />
                    </FormField>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Remove this change"
                      className="hover:text-red-11"
                      onClick={() => removeContributionChangeRow(row.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {!rowValid && (
                    <p className="text-xs text-red-11">
                      Age must be between {profile.currentAge + 1} and {profile.retirementAge - 1}.
                    </p>
                  )}
                </div>
              );
            })}
            {contributionChangeRows.length === 0 && (
              <p className="text-xs text-ink-10">
                Model a pay rise, bonus or contribution pause at a future age.
              </p>
            )}
          </div>

          <FormField
            id="annualReturnRate"
            label="Expected annual return (%)"
            hint="Typical: stocks 5–10%, bonds 2–4%, savings 1–4%"
          >
            <Input
              id="annualReturnRate"
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={annualReturnRate}
              onChange={(e) => setAnnualReturnRate(e.target.value)}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!contributionChangesValid}>
              {account ? 'Save changes' : 'Add account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
