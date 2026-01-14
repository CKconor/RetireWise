import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionCardProps {
  icon: React.ReactNode;
  iconColor?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  icon,
  iconColor = 'text-slate-500',
  title,
  action,
  children,
  className,
  contentClassName
}: SectionCardProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className={cn('h-5 w-5', iconColor)}>{icon}</span>
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
