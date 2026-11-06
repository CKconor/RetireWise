import { cn, type Tone } from '@/lib/utils';

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return <span className={cn(`badge tone-${tone}`, className)}>{children}</span>;
}
