'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface DatePickerProps {
  value: string; // ISO YYYY-MM-DD
  onChange: (date: string) => void;
  max?: string; // ISO YYYY-MM-DD
  className?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday-start
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function DatePicker({ value, onChange, max, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseIso(value || new Date().toISOString().split('T')[0]), [value]);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  // Reset view to selected date when opening
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
    setOpen(o);
  };

  const maxDate = max ? parseIso(max) : null;

  const isAfterMax = (y: number, m: number, d: number) => {
    if (!maxDate) return false;
    return new Date(y, m, d) > new Date(maxDate.year, maxDate.month, maxDate.day);
  };

  const canGoNext = !maxDate || !(viewYear === maxDate.year && viewMonth === maxDate.month);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const prevYear = () => setViewYear(viewYear - 1);
  const nextYear = () => {
    if (maxDate && viewYear >= maxDate.year) return;
    setViewYear(viewYear + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const handleSelect = (day: number) => {
    if (isAfterMax(viewYear, viewMonth, day)) return;
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  };

  const isSelected = (day: number) =>
    viewYear === parsed.year && viewMonth === parsed.month && day === parsed.day;

  const isToday = (day: number) => {
    const now = new Date();
    return viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate();
  };

  // Format the display value
  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Pick a date';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-[var(--control-h)] w-full cursor-pointer items-center gap-2 rounded-md bg-ink-3 px-3 text-[length:var(--text-field)] tabular-nums text-ink-12 outline-none transition-[background-color] duration-150 ease-out',
            'hover:bg-ink-4 focus-visible:shadow-[0_0_0_2px_var(--focus-ring)]',
            !value && 'text-ink-10',
            className,
          )}
        >
          <Calendar className="size-3.5 shrink-0 text-ink-10" />
          <span className="truncate">{displayValue}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="p-3 space-y-3">
          {/* Year nav */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon-sm" onClick={prevYear} aria-label="Previous year">
              <ChevronLeft className="h-3.5 w-3.5" />
              <ChevronLeft className="h-3.5 w-3.5 -ml-2.5" />
            </Button>
            <span className="text-sm tabular-nums text-ink-12">{viewYear}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={nextYear} disabled={maxDate != null && viewYear >= maxDate.year} aria-label="Next year">
              <ChevronRight className="h-3.5 w-3.5" />
              <ChevronRight className="h-3.5 w-3.5 -ml-2.5" />
            </Button>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon-sm" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-ink-12">{MONTH_NAMES[viewMonth]}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={nextMonth} disabled={!canGoNext} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="flex h-8 w-8 items-center justify-center text-xs text-ink-10">
                {d}
              </div>
            ))}

            {/* Blank leading cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8 w-8" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const disabled = isAfterMax(viewYear, viewMonth, day);
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(day)}
                  className={cn(
                    'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-sm tabular-nums text-ink-11 outline-none transition-colors duration-150 ease-out',
                    'hover:bg-[var(--ghost-hover)] hover:text-ink-12 focus-visible:outline-2 focus-visible:outline-offset-2',
                    disabled && 'pointer-events-none opacity-40',
                    selected && 'bg-primary text-primary-foreground shadow-[var(--shadow-primary)] hover:bg-[var(--primary-hover)] hover:text-primary-foreground',
                    !selected && today && 'text-ink-12 underline underline-offset-2',
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
