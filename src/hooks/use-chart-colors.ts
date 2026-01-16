'use client';

import { useTheme } from '@/contexts/theme-context';

export interface ChartColors {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
  labelBg: string;
  targetLine: string;
  activeDotStroke: string;
}

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();

  if (resolvedTheme === 'dark') {
    return {
      grid: '#374151',
      axis: '#9ca3af',
      tooltipBg: '#1f2937',
      tooltipBorder: '#374151',
      tooltipText: '#f3f4f6',
      tooltipMuted: '#9ca3af',
      labelBg: 'rgba(31, 41, 55, 0.9)',
      targetLine: '#f6ad55',
      activeDotStroke: '#1f2937',
    };
  }

  return {
    grid: '#e8e4de',
    axis: '#6b6560',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e8e4de',
    tooltipText: '#1a1a1a',
    tooltipMuted: '#6b6560',
    labelBg: 'rgba(255, 255, 255, 0.9)',
    targetLine: '#0c1929',
    activeDotStroke: '#ffffff',
  };
}
