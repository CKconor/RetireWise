'use client';

import { useState, useEffect } from 'react';
import { Account, LumpSumWithdrawal, LumpSumType, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/calculations';
import { Pencil, Trash2 } from 'lucide-react';

interface LumpSumWithdrawalsProps {
  withdrawals: LumpSumWithdrawal[];
  accounts: Account[];
  profile: UserProfile;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onAdd: (data: Omit<LumpSumWithdrawal, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Omit<LumpSumWithdrawal, 'id'>>) => void;
  onDelete: (id: string) => void;
}

interface FormState {
  name: string;
  amount: string;
  age: string;
  accountId: string;
  type: LumpSumType;
}

const EMPTY_FORM: FormState = { name: '', amount: '', age: '', accountId: '', type: 'withdrawal' };

const WithdrawalIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

export function LumpSumWithdrawals({
  withdrawals,
  accounts,
  profile,
  enabled,
  onToggleEnabled,
  onAdd,
  onUpdate,
  onDelete,
}: LumpSumWithdrawalsProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!formOpen) {
      setForm(EMPTY_FORM);
      setEditingId(null);
    }
  }, [formOpen]);

  const handleEdit = (w: LumpSumWithdrawal) => {
    setEditingId(w.id);
    setForm({
      name: w.name,
      amount: String(w.amount),
      age: String(w.age),
      accountId: w.accountId,
      type: w.type ?? 'withdrawal',
    });
    setFormOpen(true);
  };

  const handleAddNew = (type: LumpSumType) => {
    setForm({ ...EMPTY_FORM, type });
    setEditingId(null);
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name.trim() || (form.type === 'deposit' ? 'Lump Sum' : 'Withdrawal'),
      amount: parseFloat(form.amount) || 0,
      age: parseInt(form.age) || profile.currentAge,
      accountId: form.accountId,
      type: form.type,
    };
    if (editingId) {
      onUpdate(editingId, data);
    } else {
      onAdd(data);
    }
    setFormOpen(false);
  };

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Unknown';

  const sorted = [...withdrawals].sort((a, b) => a.age - b.age);

  return (
    <>
      <SectionCard
        icon={<WithdrawalIcon />}
        title="Planned Withdrawals & Lump Sums"
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleAddNew('withdrawal')} disabled={accounts.length === 0}>
              + Withdrawal
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleAddNew('deposit')} disabled={accounts.length === 0}>
              + Lump Sum
            </Button>
          </div>
        }
      >
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No planned withdrawals or lump sums. Add a one-off withdrawal or deposit to see how it affects your projection.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/60">
              <Checkbox
                id="lumpSumsEnabled"
                checked={enabled}
                onCheckedChange={(checked) => onToggleEnabled(checked === true)}
              />
              <label htmlFor="lumpSumsEnabled" className="text-sm text-muted-foreground cursor-pointer">
                Include in projections
              </label>
            </div>
            <div className={cn('space-y-2', !enabled && 'opacity-50')}>
            {sorted.map((w) => {
              const isDeposit = w.type === 'deposit';
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    <p
                      className={cn(
                        'text-xs',
                        isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                      )}
                    >
                      {isDeposit ? '+' : '-'}
                      {formatCurrency(w.amount)} at age {w.age} &middot; {accountName(w.accountId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(w)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(w.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </SectionCard>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? form.type === 'deposit' ? 'Edit Lump Sum' : 'Edit Withdrawal'
                : form.type === 'deposit' ? 'Add Planned Lump Sum' : 'Add Planned Withdrawal'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/50 p-1">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: 'withdrawal' }))}
                className={cn(
                  'rounded-md py-1.5 text-sm font-medium transition-colors',
                  form.type === 'withdrawal' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Withdrawal
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: 'deposit' }))}
                className={cn(
                  'rounded-md py-1.5 text-sm font-medium transition-colors',
                  form.type === 'deposit' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Lump Sum
              </button>
            </div>

            <FormField id="wName" label="Description">
              <Input
                id="wName"
                placeholder={form.type === 'deposit' ? 'e.g., Inheritance, Bonus' : 'e.g., House deposit, New car'}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-secondary/50"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="wAmount" label="Amount (£)">
                <Input
                  id="wAmount"
                  type="number"
                  min={0}
                  step="any"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="bg-secondary/50"
                  required
                />
              </FormField>
              <FormField id="wAge" label="At Age">
                <Input
                  id="wAge"
                  type="number"
                  min={profile.currentAge + 1}
                  max={profile.retirementAge}
                  step={1}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  className="bg-secondary/50"
                  required
                />
              </FormField>
            </div>

            <FormField id="wAccount" label={form.type === 'deposit' ? 'Into Account' : 'From Account'}>
              <Select value={form.accountId} onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <DialogFooter className="gap-4 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary ml-4" disabled={!form.accountId || !form.amount || !form.age}>
                {editingId ? 'Save Changes' : form.type === 'deposit' ? 'Add Lump Sum' : 'Add Withdrawal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
