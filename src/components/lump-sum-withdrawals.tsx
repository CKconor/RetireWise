'use client';

import { useState, useEffect } from 'react';
import { Account, LumpSumWithdrawal, LumpSumType, UserProfile } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
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
import { Pencil, Plus, Trash2, Banknote } from 'lucide-react';

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

const TYPE_OPTIONS: { value: LumpSumType; label: string }[] = [
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'deposit', label: 'Lump sum' },
];

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
        title="Planned withdrawals and lump sums" icon={<Banknote />}
        action={
          <>
            <Button size="sm" variant="outline" onClick={() => handleAddNew('withdrawal')} disabled={accounts.length === 0}>
              <Plus />
              Withdrawal
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleAddNew('deposit')} disabled={accounts.length === 0}>
              <Plus />
              Lump sum
            </Button>
          </>
        }
      >
        {sorted.length === 0 ? (
          <p className="text-sm text-ink-11">
            Nothing planned. Add a one-off withdrawal or deposit to see how it affects your projection.
          </p>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm text-ink-11">
              <Checkbox
                checked={enabled}
                onCheckedChange={(checked) => onToggleEnabled(checked === true)}
              />
              Include in projections
            </label>
            <div className={cn('hairline-t hairline-list', !enabled && 'opacity-60')}>
              {sorted.map((w) => {
                const isDeposit = w.type === 'deposit';
                return (
                  <div key={w.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-12" title={w.name}>{w.name}</p>
                      <p className="text-xs tabular-nums text-ink-10">
                        <span className={isDeposit ? 'text-green-11' : undefined}>
                          {isDeposit ? '+' : '-'}{formatCurrency(w.amount)}
                        </span>
                        {' '}at age {w.age} &middot; {accountName(w.accountId)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button size="icon-sm" variant="ghost" onClick={() => handleEdit(w)} aria-label={`Edit ${w.name}`}>
                        <Pencil />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="hover:text-red-11" onClick={() => onDelete(w.id)} aria-label={`Delete ${w.name}`}>
                        <Trash2 />
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
        <DialogContent className="md:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? form.type === 'deposit' ? 'Edit lump sum' : 'Edit withdrawal'
                : form.type === 'deposit' ? 'Add planned lump sum' : 'Add planned withdrawal'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <SegmentedControl
              label="Type"
              value={form.type}
              options={TYPE_OPTIONS}
              onChange={(type) => setForm((f) => ({ ...f, type }))}
              fullWidth
            />

            <FormField id="wName" label="Description">
              <Input
                id="wName"
                placeholder={form.type === 'deposit' ? 'e.g., Inheritance, bonus' : 'e.g., House deposit, new car'}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                  required
                />
              </FormField>
              <FormField id="wAge" label="At age">
                <Input
                  id="wAge"
                  type="number"
                  min={profile.currentAge + 1}
                  max={profile.retirementAge}
                  step={1}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  required
                />
              </FormField>
            </div>

            <FormField id="wAccount" label={form.type === 'deposit' ? 'Into account' : 'From account'}>
              <Select value={form.accountId} onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}>
                <SelectTrigger id="wAccount">
                  <SelectValue placeholder="Select account…" />
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!form.accountId || !form.amount || !form.age}>
                {editingId ? 'Save changes' : form.type === 'deposit' ? 'Add lump sum' : 'Add withdrawal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
