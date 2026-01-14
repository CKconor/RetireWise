'use client';

import { useState } from 'react';
import { Account, UserProfile } from '@/types';
import { AccountCard } from '@/components/account-card';
import { AccountForm } from '@/components/account-form';

interface AccountListProps {
  accounts: Account[];
  profile: UserProfile;
  onAdd: (account: Omit<Account, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Account>) => void;
  onDelete: (id: string) => void;
}

export function AccountList({ accounts, profile, onAdd, onUpdate, onDelete }: AccountListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleSave = (accountData: Omit<Account, 'id'>) => {
    if (editingAccount) {
      onUpdate(editingAccount.id, accountData);
    } else {
      onAdd(accountData);
    }
    setEditingAccount(null);
  };

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingAccount(null);
    }
  };

  const handleAddClick = () => {
    setEditingAccount(null);
    setFormOpen(true);
  };

  return (
    <>
      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="mt-4 font-medium">No accounts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first account to start tracking your retirement savings.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              profile={profile}
              onEdit={handleEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <AccountForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        account={editingAccount}
        onSave={handleSave}
      />
    </>
  );
}
