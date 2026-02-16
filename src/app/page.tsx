'use client';

import { useState } from 'react';
import { useRetirementData } from '@/hooks/use-retirement-data';
import { ProfileForm } from '@/components/profile-form';
import { AccountList } from '@/components/account-list';
import { SummaryCard } from '@/components/summary-card';
import { StatsCards } from '@/components/stats-cards';
import { ProjectionChart } from '@/components/projection-chart';
import { PeaceOfMindCard } from '@/components/peace-of-mind-card';
import { IsaBridgeCard } from '@/components/isa-bridge-card';
import { MilestoneTracker } from '@/components/milestone-tracker';
import { WhatIfScenarios } from '@/components/what-if-scenarios';
import { generatePdfReport } from '@/lib/pdf-report';
import { NetWorthChart } from '@/components/net-worth-chart';
import { Header } from '@/components/header';
import { Account } from '@/types';

export default function Home() {
  const {
    profile,
    accounts,
    netWorthHistory,
    isLoaded,
    updateProfile,
    addAccount,
    updateAccount,
    deleteAccount,
    saveSnapshot,
    addManualSnapshot,
    deleteSnapshot,
    clearHistory,
  } = useRetirementData();

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePdfReport(accounts, profile);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#1e3a5f]/30 dark:bg-amber-500/30" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500" />
          </div>
          <span className="font-display text-lg text-muted-foreground">Loading your forecast...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Header onDownloadPdf={handleDownloadPdf} isGeneratingPdf={isGeneratingPdf} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Your Details & Summary */}
          <div className="space-y-4 lg:col-span-4">
            <div className="opacity-0 animate-fade-in stagger-1">
              <ProfileForm profile={profile} onUpdate={updateProfile} />
            </div>
            <div className="opacity-0 animate-fade-in stagger-2">
              <SummaryCard accounts={accounts} profile={profile} />
            </div>
            <div className="opacity-0 animate-fade-in stagger-3">
              <StatsCards accounts={accounts} profile={profile} />
            </div>
            <div className="opacity-0 animate-fade-in stagger-4">
              <PeaceOfMindCard accounts={accounts} profile={profile} />
            </div>
          </div>

          {/* Right Column - Accounts & Chart */}
          <div className="space-y-6 lg:col-span-8">
            {/* Account Cards Grid */}
            <div className="opacity-0 animate-fade-in stagger-2">
              <AccountList
                accounts={accounts}
                profile={profile}
                onAdd={addAccount}
                onUpdate={updateAccount}
                onDelete={deleteAccount}
                onSaveSnapshot={saveSnapshot}
              />
            </div>

            {/* Projection Chart */}
            <div className="opacity-0 animate-fade-in stagger-3">
              <ProjectionChart accounts={accounts} profile={profile} />
            </div>

            {/* Net Worth History */}
            <div className="opacity-0 animate-fade-in stagger-4">
              <NetWorthChart
                accounts={accounts}
                netWorthHistory={netWorthHistory}
                onAddManualSnapshot={addManualSnapshot}
                onDeleteSnapshot={deleteSnapshot}
                onClearHistory={clearHistory}
              />
            </div>

            {/* Milestone Tracker */}
            <div className="opacity-0 animate-fade-in stagger-5">
              <MilestoneTracker accounts={accounts} profile={profile} />
            </div>

            {/* What-If Scenarios & ISA Bridge */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="opacity-0 animate-fade-in stagger-6">
                <WhatIfScenarios accounts={accounts} profile={profile} />
              </div>
              <div className="opacity-0 animate-fade-in stagger-7">
                <IsaBridgeCard accounts={accounts} profile={profile} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>All projections are estimates and do not constitute financial advice.</p>
            <p className="font-display text-foreground/60">RetireWise</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
