import { cn, type Tone } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  tone?: Tone;
  className?: string;
}

export function ProgressBar({ value, tone = 'neutral', className }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn(`tone-${tone} h-1.5 w-full overflow-hidden rounded-full bg-ink-4`, className)}>
      <div className="h-full rounded-full bg-[var(--tone-9)]" style={{ width: `${clampedValue}%` }} />
    </div>
  );
}
