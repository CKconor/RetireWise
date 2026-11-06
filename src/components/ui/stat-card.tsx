import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface FigureProps {
  label: React.ReactNode;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  className?: string;
}

/** A strong number with its label directly under it */
export function Figure({ label, value, subValue, className }: FigureProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-2xl tabular-nums text-ink-12">{value}</p>
      <p className="text-sm text-ink-11">{label}</p>
      {subValue && <p className="mt-0.5 text-xs tabular-nums text-ink-10">{subValue}</p>}
    </div>
  );
}

interface StatCardProps extends FigureProps {
  /** Only for a figure that carries a status */
  valueClassName?: string;
}

export function StatCard({ valueClassName, className, value, ...figure }: StatCardProps) {
  return (
    <Card className={cn('px-5 py-4', className)}>
      <Figure {...figure} value={valueClassName ? <span className={valueClassName}>{value}</span> : value} />
    </Card>
  );
}
