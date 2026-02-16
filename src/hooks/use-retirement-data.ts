'use client';

import { useState, useEffect, useCallback } from 'react';
import { Account, UserProfile, AppState, DrawdownConfig, NetWorthSnapshot } from '@/types';
import { loadState, saveState, createAccount, DEFAULT_DRAWDOWN_CONFIG } from '@/lib/storage';
import { calculateAgeFromBirthday } from '@/lib/calculations';

export function useRetirementData() {
  const [state, setState] = useState<AppState>(() => ({
    profile: {
      birthday: `${new Date().getFullYear() - 30}-01-01`,
      currentAge: 30,
      retirementAge: 57,
      targetAmount: 1000000,
      expectedInflation: 2.5,
      statePensionAmount: 221.20,
      statePensionAge: 67,
      includeStatePension: true,
    },
    accounts: [],
    drawdownConfig: DEFAULT_DRAWDOWN_CONFIG,
    netWorthHistory: [],
  }));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState(state);
    }
  }, [state, isLoaded]);

  const buildSnapshot = useCallback((accounts: Account[], date?: string): NetWorthSnapshot => {
    const now = new Date();
    const snapshotDate = date || now.toISOString().split('T')[0];
    const accountBalances: NetWorthSnapshot['accountBalances'] = {};
    let totalBalance = 0;
    for (const acc of accounts) {
      accountBalances[acc.id] = { balance: acc.currentBalance, name: acc.name, type: acc.type };
      totalBalance += acc.currentBalance;
    }
    return { date: snapshotDate, timestamp: now.getTime(), totalBalance, accountBalances };
  }, []);

  const upsertSnapshot = useCallback((history: NetWorthSnapshot[], snapshot: NetWorthSnapshot): NetWorthSnapshot[] => {
    const filtered = history.filter((s) => s.date !== snapshot.date);
    return [...filtered, snapshot].sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setState((prev) => {
      const newProfile = { ...prev.profile, ...updates };
      if (updates.birthday) {
        newProfile.currentAge = calculateAgeFromBirthday(updates.birthday);
      }
      return { ...prev, profile: newProfile };
    });
  }, []);

  const updateDrawdownConfig = useCallback((updates: Partial<DrawdownConfig>) => {
    setState((prev) => ({
      ...prev,
      drawdownConfig: { ...(prev.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG), ...updates },
    }));
  }, []);

  const addAccount = useCallback(
    (accountData: Omit<Account, 'id'>) => {
      const newAccount = createAccount(accountData as Account);
      setState((prev) => ({
        ...prev,
        accounts: [...prev.accounts, newAccount],
        drawdownConfig: {
          ...(prev.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG),
          accountOrder: [...(prev.drawdownConfig?.accountOrder ?? []), newAccount.id],
        },
      }));
      return newAccount;
    },
    []
  );

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((account) =>
        account.id === id ? { ...account, ...updates } : account
      ),
    }));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((account) => account.id !== id),
      drawdownConfig: {
        ...(prev.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG),
        accountOrder: (prev.drawdownConfig?.accountOrder ?? []).filter((accId) => accId !== id),
      },
    }));
  }, []);

  const saveSnapshot = useCallback(() => {
    setState((prev) => {
      const snapshot = buildSnapshot(prev.accounts);
      return {
        ...prev,
        netWorthHistory: upsertSnapshot(prev.netWorthHistory, snapshot),
      };
    });
  }, [buildSnapshot, upsertSnapshot]);

  const addManualSnapshot = useCallback((date: string, accountBalances: NetWorthSnapshot['accountBalances']) => {
    let totalBalance = 0;
    for (const entry of Object.values(accountBalances)) {
      totalBalance += entry.balance;
    }
    const snapshot: NetWorthSnapshot = { date, timestamp: Date.now(), totalBalance, accountBalances };
    setState((prev) => ({
      ...prev,
      netWorthHistory: upsertSnapshot(prev.netWorthHistory, snapshot),
    }));
  }, [upsertSnapshot]);

  const deleteSnapshot = useCallback((date: string) => {
    setState((prev) => ({
      ...prev,
      netWorthHistory: prev.netWorthHistory.filter((s) => s.date !== date),
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, netWorthHistory: [] }));
  }, []);

  return {
    profile: state.profile,
    accounts: state.accounts,
    drawdownConfig: state.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG,
    netWorthHistory: state.netWorthHistory,
    isLoaded,
    updateProfile,
    addAccount,
    updateAccount,
    deleteAccount,
    updateDrawdownConfig,
    saveSnapshot,
    addManualSnapshot,
    deleteSnapshot,
    clearHistory,
  };
}
