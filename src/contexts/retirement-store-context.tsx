'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Account,
  UserProfile,
  AppState,
  DrawdownConfig,
  NetWorthSnapshot,
  LumpSumWithdrawal,
  ProjectionBaseline,
} from '@/types';
import { loadState, saveState, createAccount, createWithdrawal, DEFAULT_DRAWDOWN_CONFIG } from '@/lib/storage';
import { calculateAgeFromBirthday, buildBaselinePoints } from '@/lib/calculations';

// ── State shape (read) ────────────────────────────────────────────────────────

export interface RetirementState {
  profile: UserProfile;
  accounts: Account[];
  drawdownConfig: DrawdownConfig;
  netWorthHistory: NetWorthSnapshot[];
  lumpSumWithdrawals: LumpSumWithdrawal[];
  projectionBaseline: ProjectionBaseline | undefined;
  isLoaded: boolean;
}

// ── Mutations shape (write) ───────────────────────────────────────────────────

export interface RetirementMutations {
  profile: {
    update: (patch: Partial<UserProfile>) => void;
  };
  accounts: {
    add: (data: Omit<Account, 'id'>) => Account;
    update: (id: string, patch: Partial<Account>) => void;
    remove: (id: string) => void; // cascades into drawdownConfig.accountOrder
  };
  drawdown: {
    updateConfig: (patch: Partial<DrawdownConfig>) => void;
  };
  history: {
    saveSnapshot: () => void;
    addManual: (date: string, balances: NetWorthSnapshot['accountBalances']) => void;
    delete: (date: string) => void;
    clear: () => void;
  };
  withdrawals: {
    add: (data: Omit<LumpSumWithdrawal, 'id'>) => LumpSumWithdrawal;
    update: (id: string, patch: Partial<Omit<LumpSumWithdrawal, 'id'>>) => void;
    remove: (id: string) => void;
  };
  baseline: {
    set: () => void;
    clear: () => void;
  };
}

// ── Contexts ──────────────────────────────────────────────────────────────────

const RetirementStateContext = createContext<RetirementState | null>(null);
const RetirementMutationsContext = createContext<RetirementMutations | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function RetirementProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppState>(() => ({
    profile: {
      birthday: `${new Date().getFullYear() - 30}-01-01`,
      currentAge: 30,
      retirementAge: 57,
      targetAmount: 1000000,
      expectedInflation: 2.5,
      annualSalary: 0,
      statePensionAmount: 221.20,
      statePensionAge: 67,
      includeStatePension: true,
    },
    accounts: [],
    drawdownConfig: DEFAULT_DRAWDOWN_CONFIG,
    netWorthHistory: [],
    lumpSumWithdrawals: [],
  }));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setAppState(loadState());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const id = setTimeout(() => saveState(appState), 500);
    return () => clearTimeout(id);
  }, [appState, isLoaded]);

  // ── Profile mutations ──────────────────────────────────────────────────────

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setAppState((prev) => {
      const newProfile = { ...prev.profile, ...patch };
      if (patch.birthday) newProfile.currentAge = calculateAgeFromBirthday(patch.birthday);
      return { ...prev, profile: newProfile };
    });
  }, []);

  // ── Account mutations ──────────────────────────────────────────────────────

  const addAccount = useCallback((data: Omit<Account, 'id'>): Account => {
    const newAccount = createAccount(data as Account);
    setAppState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
      drawdownConfig: {
        ...(prev.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG),
        accountOrder: [...(prev.drawdownConfig?.accountOrder ?? []), newAccount.id],
      },
    }));
    return newAccount;
  }, []);

  const updateAccount = useCallback((id: string, patch: Partial<Account>) => {
    setAppState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const removeAccount = useCallback((id: string) => {
    setAppState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== id),
      drawdownConfig: {
        ...(prev.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG),
        accountOrder: (prev.drawdownConfig?.accountOrder ?? []).filter((accId) => accId !== id),
      },
    }));
  }, []);

  // ── Drawdown mutations ─────────────────────────────────────────────────────

  const updateDrawdownConfig = useCallback((patch: Partial<DrawdownConfig>) => {
    setAppState((prev) => ({
      ...prev,
      drawdownConfig: { ...(prev.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG), ...patch },
    }));
  }, []);

  // ── History mutations ──────────────────────────────────────────────────────

  const saveSnapshot = useCallback(() => {
    setAppState((prev) => {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const accountBalances: NetWorthSnapshot['accountBalances'] = {};
      let totalBalance = 0;
      for (const acc of prev.accounts) {
        accountBalances[acc.id] = { balance: acc.currentBalance, name: acc.name, type: acc.type };
        totalBalance += acc.currentBalance;
      }
      const snapshot: NetWorthSnapshot = { date, timestamp: now.getTime(), totalBalance, accountBalances };
      const filtered = prev.netWorthHistory.filter((s) => s.date !== date);
      return {
        ...prev,
        netWorthHistory: [...filtered, snapshot].sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
  }, []);

  const addManualSnapshot = useCallback((date: string, balances: NetWorthSnapshot['accountBalances']) => {
    setAppState((prev) => {
      let totalBalance = 0;
      for (const entry of Object.values(balances)) totalBalance += entry.balance;
      const snapshot: NetWorthSnapshot = { date, timestamp: Date.now(), totalBalance, accountBalances: balances };
      const filtered = prev.netWorthHistory.filter((s) => s.date !== date);
      return {
        ...prev,
        netWorthHistory: [...filtered, snapshot].sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
  }, []);

  const deleteSnapshot = useCallback((date: string) => {
    setAppState((prev) => ({
      ...prev,
      netWorthHistory: prev.netWorthHistory.filter((s) => s.date !== date),
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setAppState((prev) => ({ ...prev, netWorthHistory: [] }));
  }, []);

  // ── Withdrawal mutations ───────────────────────────────────────────────────

  const addWithdrawal = useCallback((data: Omit<LumpSumWithdrawal, 'id'>): LumpSumWithdrawal => {
    const withdrawal = createWithdrawal(data);
    setAppState((prev) => ({
      ...prev,
      lumpSumWithdrawals: [...(prev.lumpSumWithdrawals ?? []), withdrawal],
    }));
    return withdrawal;
  }, []);

  const updateWithdrawal = useCallback((id: string, patch: Partial<Omit<LumpSumWithdrawal, 'id'>>) => {
    setAppState((prev) => ({
      ...prev,
      lumpSumWithdrawals: (prev.lumpSumWithdrawals ?? []).map((w) =>
        w.id === id ? { ...w, ...patch } : w
      ),
    }));
  }, []);

  const removeWithdrawal = useCallback((id: string) => {
    setAppState((prev) => ({
      ...prev,
      lumpSumWithdrawals: (prev.lumpSumWithdrawals ?? []).filter((w) => w.id !== id),
    }));
  }, []);

  // ── Baseline mutations ─────────────────────────────────────────────────────

  const setProjectionBaseline = useCallback(() => {
    setAppState((prev) => {
      const { monthlyPoints, accountMeta } = buildBaselinePoints(
        prev.accounts,
        prev.profile,
        prev.lumpSumWithdrawals ?? []
      );
      const baseline: ProjectionBaseline = {
        setDate: new Date().toISOString().split('T')[0],
        setTimestamp: Date.now(),
        monthlyPoints,
        accountMeta,
      };
      return { ...prev, projectionBaseline: baseline };
    });
  }, []);

  const clearProjectionBaseline = useCallback(() => {
    setAppState((prev) => ({ ...prev, projectionBaseline: undefined }));
  }, []);

  // ── Context values ────────────────────────────────────────────────────────
  // stateValue updates on every appState change — correct, consumers display data
  const stateValue = useMemo<RetirementState>(
    () => ({
      profile: appState.profile,
      accounts: appState.accounts,
      drawdownConfig: appState.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG,
      netWorthHistory: appState.netWorthHistory,
      lumpSumWithdrawals: appState.lumpSumWithdrawals ?? [],
      projectionBaseline: appState.projectionBaseline,
      isLoaded,
    }),
    [appState, isLoaded]
  );

  // mutationsValue is stable — all callbacks only close over setAppState (stable ref)
  // Components that only mutate will never re-render due to state changes
  const mutationsValue = useMemo<RetirementMutations>(
    () => ({
      profile: { update: updateProfile },
      accounts: { add: addAccount, update: updateAccount, remove: removeAccount },
      drawdown: { updateConfig: updateDrawdownConfig },
      history: {
        saveSnapshot,
        addManual: addManualSnapshot,
        delete: deleteSnapshot,
        clear: clearHistory,
      },
      withdrawals: { add: addWithdrawal, update: updateWithdrawal, remove: removeWithdrawal },
      baseline: { set: setProjectionBaseline, clear: clearProjectionBaseline },
    }),
    [
      updateProfile,
      addAccount, updateAccount, removeAccount,
      updateDrawdownConfig,
      saveSnapshot, addManualSnapshot, deleteSnapshot, clearHistory,
      addWithdrawal, updateWithdrawal, removeWithdrawal,
      setProjectionBaseline, clearProjectionBaseline,
    ]
  );

  return (
    <RetirementStateContext.Provider value={stateValue}>
      <RetirementMutationsContext.Provider value={mutationsValue}>
        {children}
      </RetirementMutationsContext.Provider>
    </RetirementStateContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useRetirementState(): RetirementState {
  const ctx = useContext(RetirementStateContext);
  if (!ctx) throw new Error('useRetirementState must be used inside RetirementProvider');
  return ctx;
}

export function useRetirementMutations(): RetirementMutations {
  const ctx = useContext(RetirementMutationsContext);
  if (!ctx) throw new Error('useRetirementMutations must be used inside RetirementProvider');
  return ctx;
}
