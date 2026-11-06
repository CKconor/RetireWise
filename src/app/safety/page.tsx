'use client';

import { useRetirementState } from '@/contexts/retirement-store-context';
import { PageLoading, PageShell } from '@/components/page-shell';
import { EnoughSection } from '@/components/safety/enough-section';
import { JobLossSection } from '@/components/safety/job-loss-section';
import { OverSavingSection } from '@/components/safety/over-saving-section';

export default function SafetyPage() {
  const { isLoaded } = useRetirementState();

  if (!isLoaded) return <PageLoading />;

  return (
    <PageShell>
      <EnoughSection />
      <div className="grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <JobLossSection />
        <OverSavingSection />
      </div>
    </PageShell>
  );
}
