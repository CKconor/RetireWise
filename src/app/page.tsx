'use client';

import { useRetirementData } from '@/hooks/use-retirement-data';
import { ProfileForm } from '@/components/profile-form';
import { AccountList } from '@/components/account-list';
import { SummaryCard } from '@/components/summary-card';
import { StatsCards } from '@/components/stats-cards';
import { ProjectionChart } from '@/components/projection-chart';
import { PeaceOfMindCard } from '@/components/peace-of-mind-card';
import { MilestoneTracker } from '@/components/milestone-tracker';
import { WhatIfScenarios } from '@/components/what-if-scenarios';
import { StressTestPanel } from '@/components/stress-test-panel';
import { Account } from '@/types';

export default function Home() {
  const {
    profile,
    accounts,
    isLoaded,
    updateProfile,
    addAccount,
    updateAccount,
    deleteAccount,
  } = useRetirementData();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-amber-400 to-teal-500" />
          </div>
          <span className="font-display text-lg text-muted-foreground">Loading your forecast...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f]">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-xl text-foreground">RetireWise</h1>
                <p className="text-xs text-muted-foreground">Your path to financial freedom</p>
              </div>
            </div>
          </div>
        </div>
      </header>

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
              />
            </div>

            {/* Projection Chart */}
            <div className="opacity-0 animate-fade-in stagger-3">
              <ProjectionChart accounts={accounts} profile={profile} />
            </div>

            {/* Milestone Tracker */}
            <div className="opacity-0 animate-fade-in stagger-4">
              <MilestoneTracker accounts={accounts} profile={profile} />
            </div>

            {/* What-If Scenarios & Stress Test */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="opacity-0 animate-fade-in stagger-5">
                <WhatIfScenarios accounts={accounts} profile={profile} />
              </div>
              <div className="opacity-0 animate-fade-in stagger-6">
                <StressTestPanel accounts={accounts} profile={profile} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border/50 bg-white/40">
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
