import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  icon,
  title,
  action,
  children,
  className,
  contentClassName
}: SectionCardProps) {
  return (
    <Card className={cn(
      'card-hover card-premium border-border/60 shadow-sm',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 font-display text-2xl font-normal tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1929] to-[#1e3a5f] dark:from-amber-400 dark:to-amber-500">
              <span className="h-5 w-5 text-amber-400 dark:text-[#0c1929]">{icon}</span>
            </span>
            {title}
          </CardTitle>
          {action && (
            <div className="text-sm text-muted-foreground">{action}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
