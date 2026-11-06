import { cn, type Tone } from '@/lib/utils';

interface CalloutProps {
  tone?: Tone;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** A tinted note: the title in the tone's text colour, the detail in secondary ink */
export function Callout({ tone = 'neutral', title, children, action, className }: CalloutProps) {
  return (
    <div className={cn(`callout tone-${tone} flex items-start justify-between gap-3`, className)}>
      <div className="min-w-0">
        <p className="text-sm text-[var(--tone-11)]">{title}</p>
        {children && <div className="mt-0.5 text-sm text-ink-11">{children}</div>}
      </div>
      {action && <div className="shrink-0 text-sm tabular-nums text-[var(--tone-11)]">{action}</div>}
    </div>
  );
}
