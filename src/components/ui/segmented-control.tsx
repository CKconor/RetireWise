import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('segmented', fullWidth && 'grid w-full', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          data-active={option.value === value}
          onClick={() => onChange(option.value)}
          className="segmented-option outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
