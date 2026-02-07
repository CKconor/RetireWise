'use client';

import { Account, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/types';
import { formatCurrency } from '@/lib/calculations';

interface AccountOrderListProps {
  accounts: Account[];
  accountOrder: string[];
  retirementBalances: Record<string, number>;
  onReorder: (newOrder: string[]) => void;
}

const ArrowUpIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

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
    return (
      <div className="rounded-lg bg-secondary/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">Add accounts on the Dashboard to set withdrawal order</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orderedIds.map((id, index) => {
        const account = accountMap.get(id);
        if (!account) return null;
        const colors = ACCOUNT_TYPE_COLORS[account.type];
        const balance = retirementBalances[id] ?? 0;

        return (
          <div
            key={id}
            className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3 ring-1 ring-border/60"
          >
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowUpIcon />
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === orderedIds.length - 1}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowDownIcon />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                <span className="font-medium text-sm truncate">{account.name}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                  {ACCOUNT_TYPE_LABELS[account.type]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Projected: {formatCurrency(Math.round(balance))}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
