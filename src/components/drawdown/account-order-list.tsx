'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Account, ACCOUNT_TYPE_LABELS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/calculations';

interface AccountOrderListProps {
  accounts: Account[];
  accountOrder: string[];
  retirementBalances: Record<string, number>;
  onReorder: (newOrder: string[]) => void;
}

export function AccountOrderList({ accounts, accountOrder, retirementBalances, onReorder }: AccountOrderListProps) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Build the ordered list: accounts in accountOrder first, then remaining
  const orderedIds = [
    ...accountOrder.filter((id) => accountMap.has(id)),
    ...accounts.filter((a) => !accountOrder.includes(a.id)).map((a) => a.id),
  ];

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...orderedIds];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onReorder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= orderedIds.length - 1) return;
    const newOrder = [...orderedIds];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onReorder(newOrder);
  };

  if (orderedIds.length === 0) {
    return <p className="text-sm text-ink-11">Add accounts on the dashboard to set withdrawal order.</p>;
  }

  return (
    <div className="hairline-list">
      {orderedIds.map((id, index) => {
        const account = accountMap.get(id);
        if (!account) return null;
        const balance = retirementBalances[id] ?? 0;

        return (
          <div key={id} className="flex items-center gap-3 py-2">
            <span className="w-4 shrink-0 text-sm tabular-nums text-ink-10">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm text-ink-12" title={account.name}>{account.name}</span>
                <Badge tone={account.type}>{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
              </div>
              <p className="mt-0.5 text-xs tabular-nums text-ink-10">
                Projected: {formatCurrency(Math.round(balance))}
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                aria-label={`Move ${account.name} up`}
                className="disabled:opacity-40"
              >
                <ChevronUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => moveDown(index)}
                disabled={index === orderedIds.length - 1}
                aria-label={`Move ${account.name} down`}
                className="disabled:opacity-40"
              >
                <ChevronDown />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
