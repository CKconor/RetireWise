'use client';

import { useState, useEffect, useCallback } from 'react';
import { Account, UserProfile, AppState } from '@/types';
import { loadState, saveState, createAccount } from '@/lib/storage';

export function useRetirementData() {
  const [state, setState] = useState<AppState>(() => ({
    profile: {
      currentAge: 30,
      retirementAge: 57,
      targetAmount: 1000000,
      expectedInflation: 2.5,
      statePensionAmount: 221.20,
      statePensionAge: 67,
      includeStatePension: true,
    },
    accounts: [],
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
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...updates },
    }));
  }, []);

  const addAccount = useCallback(
    (accountData: Omit<Account, 'id'>) => {
      const newAccount = createAccount(accountData as Account);
      setState((prev) => ({
        ...prev,
        accounts: [...prev.accounts, newAccount],
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
    }));
  }, []);

  return {
    profile: state.profile,
    accounts: state.accounts,
    isLoaded,
    updateProfile,
    addAccount,
    updateAccount,
    deleteAccount,
  };
}
