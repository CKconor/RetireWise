import { cn } from '@/lib/utils';

interface StatRowProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function StatRow({ label, value, hint, icon, className }: StatRowProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="flex items-center justify-end gap-1 font-semibold">
          {icon}
          {value}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
