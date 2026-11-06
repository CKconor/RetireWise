'use client';

import { useState, useMemo } from 'react';
import { useRetirementState, useRetirementMutations } from '@/contexts/retirement-store-context';
import { ProfileForm } from '@/components/profile-form';
import { AccountList } from '@/components/account-list';
import { SummaryCard } from '@/components/summary-card';
import { StatsCards } from '@/components/stats-cards';
import { ProjectionChart } from '@/components/projection-chart';
import { DashboardResult } from '@/components/safety/dashboard-result';
import { IsaBridgeCard } from '@/components/isa-bridge-card';
import { MilestoneTracker } from '@/components/milestone-tracker';
import { WhatIfScenarios } from '@/components/what-if-scenarios';
import { generatePdfReport } from '@/lib/pdf-report';
import { NetWorthChart } from '@/components/net-worth-chart';
import { PageLoading, PageShell } from '@/components/page-shell';
import { LumpSumWithdrawals } from '@/components/lump-sum-withdrawals';
import { RetirementEngineProvider } from '@/contexts/retirement-engine-context';

export default function Home() {
  const { profile, accounts, retirementAccounts, netWorthHistory, lumpSumWithdrawals, lumpSumsEnabled, effectiveLumpSumWithdrawals, projectionBaseline, isLoaded } =
    useRetirementState();
  const { profile: profileMut, accounts: accountsMut, history, withdrawals, baseline } =
    useRetirementMutations();

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pausedContribAccounts, setPausedContribAccounts] = useState<Set<string>>(new Set());

  const toggleContribPause = (id: string) =>
    setPausedContribAccounts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const effectiveAccounts = useMemo(
    () =>
      pausedContribAccounts.size === 0
        ? retirementAccounts
        : retirementAccounts.map((a) =>
            pausedContribAccounts.has(a.id) ? { ...a, monthlyContribution: 0 } : a
          ),
    [retirementAccounts, pausedContribAccounts]
  );

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfReport(retirementAccounts, profile, effectiveLumpSumWithdrawals);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isLoaded) {
    return <PageLoading />;
  }

  return (
    <RetirementEngineProvider accounts={effectiveAccounts} profile={profile} withdrawals={effectiveLumpSumWithdrawals}>
      <PageShell onDownloadPdf={handleDownloadPdf} isGeneratingPdf={isGeneratingPdf}>
        {/* The answer first: am I on track? */}
        <div className="space-y-4">
          <SummaryCard profile={profile} projectionBaseline={projectionBaseline} />
          <StatsCards profile={profile} />
          <DashboardResult />
        </div>

        <AccountList
          accounts={accounts}
          profile={profile}
          onAdd={accountsMut.add}
          onUpdate={accountsMut.update}
          onDelete={accountsMut.remove}
          onSaveSnapshot={history.saveSnapshot}
          projectionBaseline={projectionBaseline}
          onSetBaseline={baseline.set}
          onClearBaseline={baseline.clear}
          pausedContribAccounts={pausedContribAccounts}
          onToggleContribPause={toggleContribPause}
        />

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-4">
            <ProfileForm profile={profile} onUpdate={profileMut.update} />
          </div>

          <div className="min-w-0 space-y-4 lg:col-span-8">
            <ProjectionChart accounts={retirementAccounts} profile={profile} lumpSumWithdrawals={effectiveLumpSumWithdrawals} pausedContribAccounts={pausedContribAccounts} />
            <LumpSumWithdrawals
              withdrawals={lumpSumWithdrawals}
              accounts={accounts}
              profile={profile}
              enabled={lumpSumsEnabled}
              onToggleEnabled={withdrawals.setEnabled}
              onAdd={withdrawals.add}
              onUpdate={withdrawals.update}
              onDelete={withdrawals.remove}
            />
            <NetWorthChart
              accounts={accounts}
              netWorthHistory={netWorthHistory}
              currentAge={profile.currentAge}
              retirementAge={profile.retirementAge}
              onAddManualSnapshot={history.addManual}
              onDeleteSnapshot={history.delete}
              onClearHistory={history.clear}
              projectionBaseline={projectionBaseline}
            />
            <MilestoneTracker profile={profile} />
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <WhatIfScenarios accounts={retirementAccounts} profile={profile} lumpSumWithdrawals={effectiveLumpSumWithdrawals} />
              <IsaBridgeCard profile={profile} />
            </div>
          </div>
        </div>
      </PageShell>
    </RetirementEngineProvider>
  );
}
