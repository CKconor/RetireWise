'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Plus, Trash2, Pencil } from 'lucide-react';
import { Account, AccountType, NetWorthSnapshot, ACCOUNT_TYPE_LABELS } from '@/types';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form-field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrency, formatCurrencyCompact } from '@/lib/calculations';
import { useChartColors } from '@/hooks/use-chart-colors';

// Hex colors for each account type (for Recharts fills/strokes)
const ACCOUNT_TYPE_HEX: Record<AccountType, string> = {
  isa: '#10b981',
  sipp: '#f43f5e',
  pension: '#8b5cf6',
  gia: '#0ea5e9',
  savings: '#f59e0b',
};

interface NetWorthChartProps {
  accounts: Account[];
  netWorthHistory: NetWorthSnapshot[];
  onAddManualSnapshot: (date: string, accountBalances: NetWorthSnapshot['accountBalances']) => void;
  onDeleteSnapshot: (date: string) => void;
  onClearHistory: () => void;
}

const ChartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

function formatDateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function NetWorthChart({
  accounts,
  netWorthHistory,
  onAddManualSnapshot,
  onDeleteSnapshot,
  onClearHistory,
}: NetWorthChartProps) {
  const chartColors = useChartColors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null); // null = adding new, string = editing existing
  const [snapshotDate, setSnapshotDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>({});
  const [showList, setShowList] = useState(false);

  // Collect all unique account IDs that appear in the history
  const allAccountKeys = useMemo(() => {
    const keys = new Map<string, { name: string; type: AccountType }>();
    for (const snap of netWorthHistory) {
      for (const [id, info] of Object.entries(snap.accountBalances)) {
        if (!keys.has(id)) keys.set(id, { name: info.name, type: info.type });
      }
    }
    return keys;
  }, [netWorthHistory]);

  // Build chart data: one row per snapshot, one key per account
  const chartData = useMemo(() => {
    return netWorthHistory.map((snap) => {
      const row: Record<string, number | string> = {
        date: snap.date,
        dateLabel: formatDateLabel(snap.date),
        total: snap.totalBalance,
      };
      for (const id of allAccountKeys.keys()) {
        row[id] = snap.accountBalances[id]?.balance ?? 0;
      }
      return row;
    });
  }, [netWorthHistory, allAccountKeys]);

  const openAddDialog = () => {
    setEditingDate(null);
    setSnapshotDate(new Date().toISOString().split('T')[0]);
    const inputs: Record<string, string> = {};
    for (const acc of accounts) {
      inputs[acc.id] = String(acc.currentBalance);
    }
    setBalanceInputs(inputs);
    setDialogOpen(true);
  };

  const openEditDialog = (snap: NetWorthSnapshot) => {
    setEditingDate(snap.date);
    setSnapshotDate(snap.date);
    const inputs: Record<string, string> = {};
    for (const acc of accounts) {
      inputs[acc.id] = String(snap.accountBalances[acc.id]?.balance ?? 0);
    }
    setBalanceInputs(inputs);
    setDialogOpen(true);
  };

  const handleSaveSnapshot = () => {
    const accountBalances: NetWorthSnapshot['accountBalances'] = {};
    for (const acc of accounts) {
      accountBalances[acc.id] = {
        balance: parseFloat(balanceInputs[acc.id] || '0') || 0,
        name: acc.name,
        type: acc.type,
      };
    }
    // If editing and the date changed, remove the old snapshot first
    if (editingDate && editingDate !== snapshotDate) {
      onDeleteSnapshot(editingDate);
    }
    onAddManualSnapshot(snapshotDate, accountBalances);
    setDialogOpen(false);
  };

  const hasEnoughData = netWorthHistory.length >= 2;

  return (
    <>
      <SectionCard
        icon={<ChartIcon />}
        title="Net Worth History"
        action={
          <div className="flex items-center gap-2">
            {netWorthHistory.length > 0 && (
              <button
                onClick={() => setShowList(!showList)}
                className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                {showList ? 'Chart' : `${netWorthHistory.length} snapshots`}
              </button>
            )}
            <Button variant="outline" size="sm" onClick={openAddDialog} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Snapshot
            </Button>
          </div>
        }
      >
        {!hasEnoughData ? (
          <div className="flex h-[300px] flex-col items-center justify-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
              <TrendingUp className="h-8 w-8 text-amber-400 dark:text-[#0c1929]" />
            </div>
            <p className="font-display text-2xl text-foreground">Track your progress</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs text-center">
              {netWorthHistory.length === 0
                ? 'Add or edit accounts to start recording snapshots, or add a past snapshot manually.'
                : 'One more snapshot needed to display your net worth chart.'}
            </p>
          </div>
        ) : showList ? (
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {[...netWorthHistory].reverse().map((snap) => (
              <div
                key={snap.date}
                className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{formatDateLabel(snap.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {Object.values(snap.accountBalances).map((a) => `${a.name}: ${formatCurrency(a.balance)}`).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold font-mono">{formatCurrency(snap.totalBalance)}</span>
                  <button
                    onClick={() => openEditDialog(snap)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteSnapshot(snap.date)}
                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {netWorthHistory.length > 1 && (
              <div className="pt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={onClearHistory} className="text-destructive hover:text-destructive">
                  Clear all history
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <defs>
                  {Array.from(allAccountKeys.entries()).map(([id, info]) => (
                    <linearGradient key={id} id={`nw-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCOUNT_TYPE_HEX[info.type]} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={ACCOUNT_TYPE_HEX[info.type]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartColors.axis, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartColors.axis, fontSize: 12 }}
                  tickFormatter={(value) => formatCurrencyCompact(value)}
                  dx={-10}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const dataPoint = payload[0]?.payload;
                    const total = dataPoint?.total as number;

                    return (
                      <div
                        style={{
                          backgroundColor: chartColors.tooltipBg,
                          border: `1px solid ${chartColors.tooltipBorder}`,
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px -10px rgba(12, 25, 41, 0.15)',
                          padding: '12px 16px',
                        }}
                      >
                        <p style={{ color: chartColors.tooltipMuted, fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
                          {formatDateLabel(dataPoint?.date as string)}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
                          <span style={{ color: chartColors.tooltipMuted, fontSize: '13px' }}>Total</span>
                          <span style={{ color: chartColors.tooltipText, fontSize: '13px', fontWeight: 700 }}>
                            {formatCurrency(total)}
                          </span>
                        </div>
                        <div style={{ borderTop: `1px solid ${chartColors.tooltipBorder}`, paddingTop: '8px' }}>
                          {Array.from(allAccountKeys.entries()).map(([id, info]) => {
                            const val = (dataPoint?.[id] as number) ?? 0;
                            if (val === 0) return null;
                            return (
                              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '2px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ACCOUNT_TYPE_HEX[info.type], flexShrink: 0 }} />
                                  <span style={{ color: chartColors.tooltipMuted, fontSize: '12px' }}>{info.name}</span>
                                </span>
                                <span style={{ color: chartColors.tooltipText, fontSize: '12px', fontWeight: 500 }}>
                                  {formatCurrency(val)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                {Array.from(allAccountKeys.entries()).map(([id, info]) => (
                  <Area
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={info.name}
                    stackId="1"
                    stroke={ACCOUNT_TYPE_HEX[info.type]}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#nw-${id})`}
                    dot={false}
                    activeDot={{ r: 4, fill: ACCOUNT_TYPE_HEX[info.type], stroke: chartColors.activeDotStroke, strokeWidth: 2 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              {Array.from(allAccountKeys.entries()).map(([id, info]) => (
                <div key={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCOUNT_TYPE_HEX[info.type] }} />
                  {info.name}
                  <span className="text-[10px] opacity-60">({ACCOUNT_TYPE_LABELS[info.type]})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Add Snapshot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingDate ? 'Edit Snapshot' : 'Add Past Snapshot'}</DialogTitle>
            <DialogDescription>
              {editingDate ? 'Update the account balances for this snapshot.' : 'Record your account balances for a specific date.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField id="snapshot-date" label="Date">
              <DatePicker
                value={snapshotDate}
                onChange={setSnapshotDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </FormField>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts yet. Add accounts first.</p>
            ) : (
              accounts.map((acc) => (
                <FormField key={acc.id} id={`snap-${acc.id}`} label={acc.name}>
                  <Input
                    id={`snap-${acc.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={balanceInputs[acc.id] ?? '0'}
                    onChange={(e) =>
                      setBalanceInputs((prev) => ({ ...prev, [acc.id]: e.target.value }))
                    }
                  />
                </FormField>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSnapshot} disabled={accounts.length === 0}>
              {editingDate ? 'Update Snapshot' : 'Save Snapshot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
