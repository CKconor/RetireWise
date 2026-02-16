'use client';

import { useState, useEffect, useCallback } from 'react';
import { Account, UserProfile, AppState, DrawdownConfig } from '@/types';
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

  return {
    profile: state.profile,
    accounts: state.accounts,
    drawdownConfig: state.drawdownConfig ?? DEFAULT_DRAWDOWN_CONFIG,
    isLoaded,
    updateProfile,
    addAccount,
    updateAccount,
    deleteAccount,
    updateDrawdownConfig,
  };
}
