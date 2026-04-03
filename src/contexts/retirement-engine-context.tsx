'use client';

import { createContext, useContext, useMemo } from 'react';
import { Account, UserProfile, LumpSumWithdrawal } from '@/types';
import { computeRetirement, RetirementProjection } from '@/lib/retirement-engine';

const RetirementEngineContext = createContext<RetirementProjection | null>(null);

interface RetirementEngineProviderProps {
  accounts: Account[];
  profile: UserProfile;
  withdrawals?: LumpSumWithdrawal[];
  children: React.ReactNode;
}

export function RetirementEngineProvider({
  accounts,
  profile,
  withdrawals = [],
  children,
}: RetirementEngineProviderProps) {
  const projection = useMemo(
    () => computeRetirement(accounts, profile, withdrawals),
    [accounts, profile, withdrawals]
  );

  return (
    <RetirementEngineContext.Provider value={projection}>
      {children}
    </RetirementEngineContext.Provider>
  );
}

export function useRetirementProjection(): RetirementProjection {
  const ctx = useContext(RetirementEngineContext);
  if (!ctx) throw new Error('useRetirementProjection must be used inside RetirementEngineProvider');
  return ctx;
}
