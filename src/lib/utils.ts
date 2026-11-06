import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** A status or identity hue, defined as a `.tone-*` class in globals.css */
export type Tone =
  | 'accent'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'isa'
  | 'sipp'
  | 'pension'
  | 'gia'
  | 'savings';

export function onTrackTone(isOnTrack: boolean): Tone {
  return isOnTrack ? 'success' : 'warning';
}

/** Text colour for a positive or negative change */
export function deltaTextClass(delta: number): string {
  if (delta === 0) return 'text-ink-11';
  return delta > 0 ? 'text-green-11' : 'text-amber-11';
}
