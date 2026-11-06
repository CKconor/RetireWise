import { cn } from '@/lib/utils';

interface StatRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

export function StatRow({ label, value, hint, className }: StatRowProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2', className)}>
      <span className="min-w-0 text-sm text-ink-11">{label}</span>
      <span className="shrink-0 text-right text-sm text-ink-12">
        {value}
        {hint && <span className="ml-1.5 text-xs text-ink-10">{hint}</span>}
      </span>
    </div>
  );
}
