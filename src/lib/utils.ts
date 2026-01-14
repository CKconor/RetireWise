import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Status color utilities for consistent styling across components
 */
export interface StatusColors {
  text: string;
  bg: string;
  border: string;
  fill: string;
}

export function getOnTrackColors(isOnTrack: boolean): StatusColors {
  return isOnTrack
    ? { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', fill: 'bg-emerald-500' }
    : { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', fill: 'bg-amber-500' };
}

export function getConfidenceColors(score: number): StatusColors {
  if (score >= 8) return { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', fill: 'bg-emerald-400' };
  if (score >= 6) return { text: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', fill: 'bg-blue-400' };
  if (score >= 4) return { text: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', fill: 'bg-amber-400' };
  return { text: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', fill: 'bg-slate-300' };
}

export function getDiffColors(diff: number): string {
  return diff > 0 ? 'text-emerald-600' : 'text-amber-600';
}
