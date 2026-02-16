'use client';

import { useState } from 'react';
import { Account, UserProfile } from '@/types';
import { AccountCard } from '@/components/account-card';
import { AccountForm } from '@/components/account-form';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
  profile: UserProfile;
  onAdd: (account: Omit<Account, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Account>) => void;
  onDelete: (id: string) => void;
  onSaveSnapshot?: () => void;
}

const PlusIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

export function AccountList({ accounts, profile, onAdd, onUpdate, onDelete, onSaveSnapshot }: AccountListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [snapshotPromptOpen, setSnapshotPromptOpen] = useState(false);

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleSave = (accountData: Omit<Account, 'id'>) => {
    const wasEditing = !!editingAccount;
    if (editingAccount) {
      onUpdate(editingAccount.id, accountData);
    } else {
      onAdd(accountData);
    }
    setEditingAccount(null);
    if (wasEditing && onSaveSnapshot) {
      setSnapshotPromptOpen(true);
    }
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
        <div
          onClick={handleAddClick}
          className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center transition-all hover:border-muted-foreground/30 hover:bg-card/80"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0c1929] to-[#1e3a5f]">
            <PlusIcon className="h-8 w-8 text-amber-400" />
          </div>
          <h3 className="mt-6 font-display text-xl text-foreground">Add your first account</h3>
          <p className="mt-2 text-muted-foreground">
            Start tracking your retirement savings by adding an account.
          </p>
          <p className="mt-4 text-sm font-medium text-muted-foreground">Click to get started</p>
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
          <Card
            onClick={handleAddClick}
            className="card-hover flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-border bg-card/50 transition-all hover:border-muted-foreground/30 hover:bg-card/80"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f]">
              <PlusIcon className="h-5 w-5 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="font-display text-lg text-foreground">Add Account</p>
              <p className="text-sm text-muted-foreground">Track another retirement account</p>
            </div>
          </Card>
        </div>
      )}

      <AccountForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        account={editingAccount}
        onSave={handleSave}
      />

      <Dialog open={snapshotPromptOpen} onOpenChange={setSnapshotPromptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Camera className="h-5 w-5 text-muted-foreground" />
              Save Snapshot?
            </DialogTitle>
            <DialogDescription>
              Would you like to record today&apos;s balances as a net worth snapshot?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSnapshotPromptOpen(false)}>
              Skip
            </Button>
            <Button onClick={() => { onSaveSnapshot?.(); setSnapshotPromptOpen(false); }}>
              Save Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
