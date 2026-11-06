'use client';

import { Info, ArrowLeftRight } from 'lucide-react';
import { UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionCard } from '@/components/ui/section-card';
import { Figure } from '@/components/ui/stat-card';
import { StatRow } from '@/components/ui/stat-row';
import { formatCurrency } from '@/lib/calculations';
import { PRIVATE_PENSION_ACCESS_AGE } from '@/lib/uk-figures';
import { onTrackTone } from '@/lib/utils';
import { useRetirementAnalysis } from '@/contexts/retirement-engine-context';

interface IsaBridgeCardProps {
  profile: UserProfile;
}

export function IsaBridgeCard({ profile }: IsaBridgeCardProps) {
  const { isaBridgeProgress: bridgeProgress } = useRetirementAnalysis();

  // Don't show if no bridge period needed
  if (bridgeProgress.bridgeYears <= 0) {
    return null;
  }

  const isOnTrack = bridgeProgress.shortfall === 0;
  const progressPercent = Math.round(bridgeProgress.progress);

  return (
    <SectionCard
      title="ISA bridge" icon={<ArrowLeftRight />}
      action={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="About the ISA bridge">
              <Info />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 text-ink-11">
            The amount you need in accessible accounts (ISAs, GIAs, savings) to fund your retirement until you can access your private pension at age {PRIVATE_PENSION_ACCESS_AGE}.
          </PopoverContent>
        </Popover>
      }
      contentClassName="space-y-4"
    >
      <Figure
        label="Bridge period"
        value={`${bridgeProgress.bridgeYears} years`}
        subValue={`Ages ${profile.retirementAge} to ${PRIVATE_PENSION_ACCESS_AGE}`}
      />

      <div className="hairline-list tabular-nums">
        <StatRow label="Annual expenses (4% rule)" value={formatCurrency(bridgeProgress.annualExpenses)} />
        <StatRow label="Bridge amount needed" value={formatCurrency(bridgeProgress.required)} />
        <StatRow label="Projected accessible balance" value={formatCurrency(bridgeProgress.accessible)} />
      </div>

      <div className="space-y-2">
        <ProgressBar value={progressPercent} tone={onTrackTone(isOnTrack)} />
        <div className="flex justify-between text-xs tabular-nums text-ink-10">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
      </div>

      {isOnTrack ? (
        <Callout tone="success" title="On track">
          Your accessible accounts are projected to cover your pre-state pension years
          {bridgeProgress.accessible > bridgeProgress.required && (
            <> with a {formatCurrency(bridgeProgress.accessible - bridgeProgress.required)} surplus</>
          )}.
        </Callout>
      ) : (
        <Callout tone="warning" title={`Shortfall of ${formatCurrency(bridgeProgress.shortfall)}`}>
          Consider increasing contributions to ISA, GIA or savings accounts to bridge the gap.
        </Callout>
      )}
    </SectionCard>
  );
}
