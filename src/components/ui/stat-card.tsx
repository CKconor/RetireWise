import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

type IconColor = 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'violet' | 'slate';

const COLOR_MAP: Record<IconColor, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

interface StatCardProps {
  icon: React.ReactNode;
  iconColor?: IconColor;
  label: string;
  value: string;
  className?: string;
}

export function StatCard({ icon, iconColor = 'slate', label, value, className }: StatCardProps) {
  const colors = COLOR_MAP[iconColor];

  return (
    <Card className={cn('p-3 shadow-sm', className)}>
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colors.bg)}>
        <div className={cn('h-4 w-4', colors.text)}>{icon}</div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-bold" style={{ fontFamily: 'Georgia, serif' }}>{value}</p>
    </Card>
  );
}
