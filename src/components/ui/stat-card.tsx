import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  className?: string;
}

export function StatCard({ icon, label, value, subValue, className }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] p-4',
      'dark:from-amber-400 dark:to-amber-500',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="h-5 w-5 text-amber-400 dark:text-[#0c1929]">{icon}</div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-white/60 dark:text-[#0c1929]/70">{label}</p>
        <p className="font-display text-xl text-white dark:text-[#0c1929]">{value}</p>
        {subValue && (
          <p className="text-xs text-white/60 dark:text-[#0c1929]/70">{subValue}</p>
        )}
      </div>
    </div>
  );
}
