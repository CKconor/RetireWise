import { formatCurrencyCompact } from '@/lib/calculations';
import { cn } from '@/lib/utils';

// Chart colours are CSS variables, so they follow the theme without any JS
export const CHART_COLORS = {
  grid: 'var(--line)',
  axis: 'var(--ink-10)',
  label: 'var(--ink-11)',
  surface: 'var(--overlay)',
  strong: 'var(--accent-9)',
  secondary: 'var(--ink-10)',
  faint: 'var(--ink-9)',
  target: 'var(--ink-11)',
  statePension: 'var(--ink-9)',
  danger: 'var(--red-9)',
} as const;

const AXIS_TICK = { fill: CHART_COLORS.axis, fontSize: 12 };

export const chartGridProps = {
  strokeDasharray: '3 3',
  stroke: CHART_COLORS.grid,
  vertical: false,
};

export const chartXAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: AXIS_TICK,
  dy: 10,
  minTickGap: 24,
};

export const chartAgeLabel = {
  value: 'Age',
  position: 'insideBottom' as const,
  offset: -20,
  fill: CHART_COLORS.axis,
  fontSize: 12,
};

export const chartYAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: AXIS_TICK,
  tickFormatter: (value: number) => formatCurrencyCompact(value),
  dx: -10,
};

export function chartActiveDot(fill: string) {
  return { r: 4, fill, stroke: CHART_COLORS.surface, strokeWidth: 2 };
}

/** A small label sitting on a reference line */
export function chartLineLabel(text: string, options: { width: number; color?: string; y?: number; dx?: number }) {
  const { width, color = CHART_COLORS.label, y, dx = 0 } = options;
  const ChartLineLabel = ({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
    const labelX = (viewBox?.x ?? 0) + dx;
    const labelY = y ?? (viewBox?.y ?? 0) - 8;
    return (
      <g>
        <rect x={labelX - 4} y={labelY - 11} width={width} height={16} rx={4} fill={CHART_COLORS.surface} />
        <text x={labelX} y={labelY} fill={color} fontSize={12}>{text}</text>
      </g>
    );
  };
  return ChartLineLabel;
}

export function ChartTooltipCard({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="surface-overlay min-w-[180px] rounded-lg bg-popover px-3 py-2.5 text-xs tabular-nums text-ink-12 shadow-[var(--shadow-menu)]">
      <p className="mb-1.5 text-ink-11">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

interface ChartTooltipRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  color?: string;
  dashed?: boolean;
  muted?: boolean;
}

export function ChartTooltipRow({ label, value, color, dashed = false, muted = false }: ChartTooltipRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-ink-11">
        {color && <ChartSwatch color={color} dashed={dashed} />}
        {label}
      </span>
      <span className={cn(muted ? 'text-ink-11' : 'text-ink-12')}>{value}</span>
    </div>
  );
}

export function ChartTooltipDivider() {
  return <div className="hairline-t !my-2" />;
}

export function ChartSwatch({ color, dashed = false }: { color: string; dashed?: boolean }) {
  if (dashed) {
    return <span className="inline-block w-3 shrink-0 border-t-2 border-dashed" style={{ borderColor: color }} />;
  }
  return <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

interface ChartLegendProps {
  items: { key: string; label: React.ReactNode; color: string; dashed?: boolean }[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5 text-xs text-ink-11">
          <ChartSwatch color={item.color} dashed={item.dashed} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
