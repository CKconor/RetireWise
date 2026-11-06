import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/** A bare centred panel: what's missing, and what to do about it */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-md bg-ink-2 px-6 py-10 text-center dark:bg-ink-3', className)}>
      {icon && <div className="mb-3 text-ink-10 [&_svg]:size-[18px]">{icon}</div>}
      <p className="text-sm text-ink-12">{title}</p>
      <p className="max-w-sm text-sm text-ink-11">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
