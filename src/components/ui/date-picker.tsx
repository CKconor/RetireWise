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
            'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-1 text-sm shadow-xs transition-colors',
            'hover:bg-secondary/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{displayValue}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="p-3 space-y-3">
          {/* Year nav */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={prevYear} aria-label="Previous year">
              <ChevronLeft className="h-3.5 w-3.5" />
              <ChevronLeft className="h-3.5 w-3.5 -ml-2.5" />
            </Button>
            <span className="text-sm font-display font-semibold tracking-tight">{viewYear}</span>
            <Button variant="ghost" size="icon-sm" onClick={nextYear} disabled={maxDate != null && viewYear >= maxDate.year} aria-label="Next year">
              <ChevronRight className="h-3.5 w-3.5" />
              <ChevronRight className="h-3.5 w-3.5 -ml-2.5" />
            </Button>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{MONTH_NAMES[viewMonth]}</span>
            <Button variant="ghost" size="icon-sm" onClick={nextMonth} disabled={!canGoNext} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="flex h-8 w-8 items-center justify-center text-[11px] font-medium text-muted-foreground">
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
                    'flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:ring-2 focus-visible:ring-ring outline-none',
                    disabled && 'pointer-events-none opacity-30',
                    selected && 'bg-primary text-primary-foreground hover:bg-primary/90 font-semibold',
                    !selected && today && 'ring-1 ring-primary/40 font-medium',
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
