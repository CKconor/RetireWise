'use client';

import { useState, useEffect } from 'react';
import { Account, AccountType, ACCOUNT_TYPE_LABELS, DEFAULT_RETURN_RATES } from '@/types';
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

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  onSave: (account: Omit<Account, 'id'>) => void;
}

const ACCOUNT_TYPES: AccountType[] = ['isa', 'sipp', 'pension', 'gia', 'savings'];

export function AccountForm({ open, onOpenChange, account, onSave }: AccountFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('isa');
  const [currentBalance, setCurrentBalance] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [annualReturnRate, setAnnualReturnRate] = useState('');

  useEffect(() => {
    if (open) {
      if (account) {
        setName(account.name);
        setType(account.type);
        setCurrentBalance(String(account.currentBalance));
        setMonthlyContribution(String(account.monthlyContribution));
        setAnnualReturnRate(String(account.annualReturnRate));
      } else {
        setName('');
        setType('isa');
        setCurrentBalance('');
        setMonthlyContribution('');
        setAnnualReturnRate(String(DEFAULT_RETURN_RATES['isa']));
      }
    }
  }, [open, account]);

  const handleTypeChange = (newType: AccountType) => {
    setType(newType);
    if (!account) {
      setAnnualReturnRate(String(DEFAULT_RETURN_RATES[newType]));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || ACCOUNT_TYPE_LABELS[type],
      type,
      currentBalance: parseFloat(currentBalance) || 0,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      annualReturnRate: parseFloat(annualReturnRate) || 0,
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
            <Button type="submit" className="bg-gradient ml-4">
              {account ? 'Save Changes' : 'Add Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
