import { cn } from '@/lib/utils';

type ProgressHeight = 'sm' | 'md' | 'lg';

const HEIGHT_MAP: Record<ProgressHeight, string> = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

interface ProgressBarProps {
  value: number;
  color?: string;
  bgColor?: string;
  height?: ProgressHeight;
  className?: string;
}

export function ProgressBar({
  value,
  color = 'bg-emerald-500',
  bgColor = 'bg-slate-100 dark:bg-slate-700',
  height = 'md',
  className
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full overflow-hidden rounded-full', HEIGHT_MAP[height], bgColor, className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
