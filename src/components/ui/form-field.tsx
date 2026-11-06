import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  id: string;
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ id, label, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-ink-10">{hint}</p>}
    </div>
  );
}
