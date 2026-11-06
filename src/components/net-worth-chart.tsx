'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Plus, Trash2, Pencil, ArrowRight, LineChart } from 'lucide-react';
import { Account, AccountType, NetWorthSnapshot, ProjectionBaseline, ACCOUNT_TYPE_LABELS } from '@/types';
import { EmptyState } from '@/components/ui/empty-state';
import {
  CHART_COLORS,
  ChartLegend,
  ChartTooltipCard,
  ChartTooltipDivider,
  ChartTooltipRow,
  chartActiveDot,
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
} from '@/components/ui/chart';
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
import { formatCurrency, calculateNetWorthForecast } from '@/lib/calculations';
import { ACCOUNT_TYPE_CHART_COLORS } from '@/lib/constants';

const TABLE_DATES_KEY = 'retirewise-table-dates';

function getProjectionEndDate(): { month: number; year: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(TABLE_DATES_KEY);
    if (saved) {
      const { endDate } = JSON.parse(saved);
      if (endDate?.month && endDate?.year) return endDate;
    }
  } catch { /* ignore */ }
  return null;
}

interface NetWorthChartProps {
  accounts: Account[];
  netWorthHistory: NetWorthSnapshot[];
  currentAge: number;
  retirementAge: number;
  onAddManualSnapshot: (date: string, accountBalances: NetWorthSnapshot['accountBalances']) => void;
  onDeleteSnapshot: (date: string) => void;
  onClearHistory: () => void;
  projectionBaseline?: ProjectionBaseline;
}

function formatDateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function NetWorthChart({
  accounts,
  netWorthHistory,
  currentAge,
  retirementAge,
  onAddManualSnapshot,
  onDeleteSnapshot,
  onClearHistory,
  projectionBaseline,
}: NetWorthChartProps) {
  const [showForecast, setShowForecast] = useState(false);
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
    const rows = netWorthHistory.map((snap) => {
      const snapDate = new Date(snap.date + 'T00:00:00');
      const snapYear = snapDate.getFullYear();
      const snapMonth = snapDate.getMonth() + 1;
      const baselinePoint = projectionBaseline?.monthlyPoints.find(
        (p) => p.year === snapYear && p.monthOfYear === snapMonth
      );
      const row: Record<string, number | string | undefined> = {
        date: snap.date,
        dateLabel: formatDateLabel(snap.date),
        total: snap.totalBalance,
        baselineExpected: baselinePoint?.expectedTotal,
      };
      for (const id of allAccountKeys.keys()) {
        row[id] = snap.accountBalances[id]?.balance ?? 0;
      }
      return row;
    });

    if (!showForecast || netWorthHistory.length < 2) return rows;

    // Use growth projection end date if set, otherwise fall back to retirement age
    const projectionEnd = getProjectionEndDate();
    let forecastMonths: number;
    if (projectionEnd) {
      const now = new Date();
      forecastMonths = (projectionEnd.year - now.getFullYear()) * 12 + (projectionEnd.month - (now.getMonth() + 1));
    } else {
      forecastMonths = Math.max(1, retirementAge - currentAge) * 12;
    }
    forecastMonths = Math.max(12, forecastMonths);

    const forecastPoints = calculateNetWorthForecast(netWorthHistory, forecastMonths, 12);
    if (forecastPoints.length === 0) return rows;

    // Bridge: set forecast on last actual point so the line connects
    if (rows.length > 0) {
      rows[rows.length - 1].forecast = rows[rows.length - 1].total as number;
    }

    // Append forecast rows (account keys zeroed, only forecast + total set)
    for (const pt of forecastPoints) {
      const row: Record<string, number | string | undefined> = {
        date: pt.date,
        dateLabel: formatDateLabel(pt.date),
        total: undefined, // don't stack in area
        forecast: pt.total,
      };
      for (const id of allAccountKeys.keys()) {
        row[id] = undefined; // no stacked area for forecast points
      }
      rows.push(row);
    }

    return rows;
  }, [netWorthHistory, allAccountKeys, showForecast, currentAge, retirementAge]);

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
  const seriesEntries = Array.from(allAccountKeys.entries());

  return (
    <>
      <SectionCard
        title="Net worth history" icon={<LineChart />}
        action={
          <>
            {hasEnoughData && (
              <Button variant="ghost" size="sm" aria-pressed={showForecast} onClick={() => setShowForecast(!showForecast)}>
                <ArrowRight />
                Forecast
              </Button>
            )}
            {netWorthHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowList(!showList)}>
                {showList ? 'Chart' : `${netWorthHistory.length} snapshots`}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <Plus />
              Add snapshot
            </Button>
          </>
        }
      >
        {!hasEnoughData ? (
          <EmptyState
            icon={<TrendingUp />}
            title={netWorthHistory.length === 0 ? 'No snapshots yet' : 'One snapshot so far'}
            description={
              netWorthHistory.length === 0
                ? 'Add or edit accounts to start recording snapshots, or add a past snapshot.'
                : 'Add one more snapshot to see your net worth chart.'
            }
          />
        ) : showList ? (
          <div className="space-y-4">
            <div className="hairline-list max-h-[350px] overflow-y-auto">
              {[...netWorthHistory].reverse().map((snap) => (
                <div key={snap.date} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-12">{formatDateLabel(snap.date)}</p>
                    <p className="text-xs tabular-nums text-ink-10">
                      {Object.values(snap.accountBalances).map((a) => `${a.name}: ${formatCurrency(a.balance)}`).join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <span className="mr-2 text-sm tabular-nums text-ink-12">{formatCurrency(snap.totalBalance)}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(snap)} aria-label={`Edit snapshot from ${formatDateLabel(snap.date)}`}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="hover:text-red-11" onClick={() => onDeleteSnapshot(snap.date)} aria-label={`Delete snapshot from ${formatDateLabel(snap.date)}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="destructive-outline" size="sm" onClick={onClearHistory}>
              Clear all history
            </Button>
          </div>
        ) : (
          <>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="dateLabel" {...chartXAxisProps} />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip
                    isAnimationActive={false}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const dataPoint = payload[0]?.payload;
                      const total = dataPoint?.total as number | undefined;
                      const forecastVal = dataPoint?.forecast as number | undefined;
                      const isForecastOnly = total == null && forecastVal != null;

                      return (
                        <ChartTooltipCard title={formatDateLabel(dataPoint?.date as string)}>
                          {isForecastOnly ? (
                            <ChartTooltipRow label="Forecast" value={formatCurrency(forecastVal)} color={CHART_COLORS.faint} dashed />
                          ) : (
                            <>
                              <ChartTooltipRow label="Total" value={formatCurrency(total ?? 0)} />
                              {dataPoint?.baselineExpected != null && (
                                <ChartTooltipRow
                                  label="Baseline"
                                  value={formatCurrency(dataPoint.baselineExpected as number)}
                                  color={CHART_COLORS.secondary}
                                  dashed
                                />
                              )}
                              <ChartTooltipDivider />
                              {seriesEntries.map(([id, info]) => {
                                const val = (dataPoint?.[id] as number) ?? 0;
                                if (val === 0) return null;
                                return (
                                  <ChartTooltipRow
                                    key={id}
                                    muted
                                    label={info.name}
                                    value={formatCurrency(val)}
                                    color={ACCOUNT_TYPE_CHART_COLORS[info.type]}
                                  />
                                );
                              })}
                            </>
                          )}
                        </ChartTooltipCard>
                      );
                    }}
                  />
                  {seriesEntries.map(([id, info]) => (
                    <Area
                      isAnimationActive={false}
                      key={id}
                      type="monotone"
                      dataKey={id}
                      name={info.name}
                      stackId="1"
                      stroke={ACCOUNT_TYPE_CHART_COLORS[info.type]}
                      strokeWidth={1.5}
                      fill={ACCOUNT_TYPE_CHART_COLORS[info.type]}
                      fillOpacity={0.12}
                      dot={false}
                      activeDot={chartActiveDot(ACCOUNT_TYPE_CHART_COLORS[info.type])}
                    />
                  ))}
                  {showForecast && (
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast"
                      stroke={CHART_COLORS.faint}
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      dot={false}
                      activeDot={chartActiveDot(CHART_COLORS.faint)}
                      connectNulls={false}
                    />
                  )}
                  {projectionBaseline && (
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="baselineExpected"
                      name="Baseline"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={chartActiveDot(CHART_COLORS.secondary)}
                      connectNulls
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend
              className="mt-2"
              items={[
                ...seriesEntries.map(([id, info]) => ({
                  key: id,
                  label: `${info.name} (${ACCOUNT_TYPE_LABELS[info.type]})`,
                  color: ACCOUNT_TYPE_CHART_COLORS[info.type],
                })),
                ...(showForecast ? [{ key: 'forecast', label: 'Forecast', color: CHART_COLORS.faint, dashed: true }] : []),
                ...(projectionBaseline ? [{ key: 'baseline', label: 'Baseline', color: CHART_COLORS.secondary, dashed: true }] : []),
              ]}
            />
          </>
        )}
      </SectionCard>

      {/* Add Snapshot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="md:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingDate ? 'Edit snapshot' : 'Add past snapshot'}</DialogTitle>
            <DialogDescription>
              {editingDate ? 'Update the account balances for this snapshot.' : 'Record your account balances for a specific date.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField id="snapshot-date" label="Date">
              <DatePicker
                value={snapshotDate}
                onChange={setSnapshotDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </FormField>
            {accounts.length === 0 ? (
              <p className="text-sm text-ink-11">No accounts yet. Add accounts first.</p>
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
              {editingDate ? 'Update snapshot' : 'Save snapshot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
