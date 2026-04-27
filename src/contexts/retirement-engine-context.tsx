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

// Scalar fields only — components that don't need points/stressTests/isaBridgeProgress
export type RetirementSummary = Omit<RetirementProjection, 'points' | 'stressTests' | 'isaBridgeProgress'>;

// Array/heavy fields — components that render charts or stress test data
export type RetirementAnalysis = Pick<RetirementProjection, 'points' | 'stressTests' | 'isaBridgeProgress'>;

export function useRetirementSummary(): RetirementSummary {
  const { points: _, stressTests: __, isaBridgeProgress: ___, ...summary } = useRetirementProjection();
  return summary;
}

export function useRetirementAnalysis(): RetirementAnalysis {
  const { points, stressTests, isaBridgeProgress } = useRetirementProjection();
  return { points, stressTests, isaBridgeProgress };
}
