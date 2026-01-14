'use client';

import { useState } from 'react';
import { useRetirementData } from '@/hooks/use-retirement-data';
import { ProfileForm } from '@/components/profile-form';
import { AccountList } from '@/components/account-list';
import { SummaryCard } from '@/components/summary-card';
import { StatsCards } from '@/components/stats-cards';
import { ProjectionChart } from '@/components/projection-chart';
import { AccountForm } from '@/components/account-form';
import { PeaceOfMindCard } from '@/components/peace-of-mind-card';
import { MilestoneTracker } from '@/components/milestone-tracker';
import { WhatIfScenarios } from '@/components/what-if-scenarios';
import { StressTestPanel } from '@/components/stress-test-panel';
import { Button } from '@/components/ui/button';
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

  const [showAddForm, setShowAddForm] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Retirement Forecast</h1>
            <p className="text-muted-foreground">Track your path to financial freedom</p>
          </div>
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Account
          </Button>
        </div>

        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column - Your Details & Summary */}
          <div className="space-y-3 lg:col-span-4">
            <ProfileForm profile={profile} onUpdate={updateProfile} />
            <SummaryCard accounts={accounts} profile={profile} />
            <StatsCards accounts={accounts} profile={profile} />
            <PeaceOfMindCard accounts={accounts} profile={profile} />
          </div>

          {/* Right Column - Accounts & Chart */}
          <div className="space-y-6 lg:col-span-8">
            {/* Milestone Tracker */}
            <MilestoneTracker accounts={accounts} profile={profile} />

            {/* Account Cards Grid */}
            <AccountList
              accounts={accounts}
              profile={profile}
              onAdd={addAccount}
              onUpdate={updateAccount}
              onDelete={deleteAccount}
            />

            {/* Projection Chart */}
            <ProjectionChart accounts={accounts} profile={profile} />

            {/* What-If Scenarios & Stress Test */}
            <div className="grid gap-6 lg:grid-cols-2">
              <WhatIfScenarios accounts={accounts} profile={profile} />
              <StressTestPanel accounts={accounts} profile={profile} />
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Form Dialog */}
      <AccountForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        account={null}
        onSave={(data) => {
          addAccount(data);
          setShowAddForm(false);
        }}
      />
    </div>
  );
}
