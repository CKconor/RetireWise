'use client';

import { useState } from 'react';
import { Account, UserProfile, ProjectionBaseline } from '@/types';
import { AccountCard } from '@/components/account-card';
import { AccountForm } from '@/components/account-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-card';
import { Plus, Wallet } from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
  profile: UserProfile;
  onAdd: (account: Omit<Account, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Account>) => void;
  onDelete: (id: string) => void;
  onSaveSnapshot?: () => void;
  projectionBaseline?: ProjectionBaseline;
  onSetBaseline?: () => void;
  onClearBaseline?: () => void;
  pausedContribAccounts?: Set<string>;
  onToggleContribPause?: (id: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AccountList({ accounts, profile, onAdd, onUpdate, onDelete, onSaveSnapshot, projectionBaseline, onSetBaseline, onClearBaseline, pausedContribAccounts, onToggleContribPause }: AccountListProps) {
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

  // Find baseline point for current month to pass per-account expected balances
  const nowDate = new Date();
  const baselineThisMonth = projectionBaseline?.monthlyPoints.find(
    (p) => p.year === nowDate.getFullYear() && p.monthOfYear === nowDate.getMonth() + 1
  );

  return (
    <section className="space-y-4">
      {accounts.length === 0 ? (
        <Card className="px-5">
          <EmptyState
            icon={<Wallet />}
            title="No accounts yet"
            description="Add your first account to start tracking your retirement savings."
            action={
              <Button onClick={handleAddClick}>
                <Plus />
                Add account
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <SectionHeader
            title="Accounts"
            description={
              projectionBaseline ? (
                <>
                  Baseline set {formatDate(projectionBaseline.setDate)}.{' '}
                  <button
                    onClick={onClearBaseline}
                    className="cursor-pointer rounded-sm underline underline-offset-2 outline-none hover:text-ink-12 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Clear baseline
                  </button>
                </>
              ) : (
                'Set a baseline to track actual against expected growth.'
              )
            }
            action={
              <>
                {onSetBaseline && (
                  <Button variant="outline" onClick={onSetBaseline}>
                    {projectionBaseline ? 'Reset baseline' : 'Set baseline'}
                  </Button>
                )}
                <Button onClick={handleAddClick}>
                  <Plus />
                  Add account
                </Button>
              </>
            }
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                profile={profile}
                onEdit={handleEdit}
                onDelete={onDelete}
                baselineExpectedBalance={baselineThisMonth?.expectedAccountBalances[account.id]}
                contributionsPaused={pausedContribAccounts?.has(account.id) ?? false}
                onToggleContribPause={onToggleContribPause ? () => onToggleContribPause(account.id) : undefined}
              />
            ))}
          </div>
        </>
      )}

      <AccountForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        account={editingAccount}
        profile={profile}
        onSave={handleSave}
      />

      <Dialog open={snapshotPromptOpen} onOpenChange={setSnapshotPromptOpen}>
        <DialogContent className="md:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Save a snapshot?</DialogTitle>
            <DialogDescription>
              Record today&apos;s balances as a net worth snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshotPromptOpen(false)}>
              Skip
            </Button>
            <Button onClick={() => { onSaveSnapshot?.(); setSnapshotPromptOpen(false); }}>
              Save snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
