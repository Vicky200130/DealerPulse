'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MONTHS_SHORT, WEEKDAYS, addMonths, firstOfMonth, monthGrid, monthTitle, parseYmd, ymd } from '@/lib/dates';

// A single-month calendar for picking a from→to range without the native date
// input. Click a start day, then an end day; the pair is reported via onChange.
// Days outside [min, max] are disabled.
export function Calendar({
  value,
  onChange,
  min,
  max,
}: {
  value: { from: string; to: string };
  onChange: (from: string, to: string) => void;
  min: string;
  max: string;
}) {
  const [view, setView] = useState<Date>(firstOfMonth(parseYmd(value.from || max)));
  // The first click of a new range; null once a full range is committed.
  const [anchor, setAnchor] = useState<string | null>(null);
  // 'days' = the day grid; 'months' = a 12-month picker (click the title to switch).
  const [mode, setMode] = useState<'days' | 'months'>('days');

  const minD = parseYmd(min);
  const maxD = parseYmd(max);
  const canPrev = firstOfMonth(view) > firstOfMonth(minD);
  const canNext = firstOfMonth(view) < firstOfMonth(maxD);
  const canPrevYear = view.getFullYear() > minD.getFullYear();
  const canNextYear = view.getFullYear() < maxD.getFullYear();

  const pick = (s: string) => {
    if (!anchor) {
      setAnchor(s);
    } else {
      const [a, b] = anchor <= s ? [anchor, s] : [s, anchor];
      setAnchor(null);
      onChange(a, b);
    }
  };

  return (
    <div className="w-[252px]">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          disabled={mode === 'days' ? !canPrev : !canPrevYear}
          onClick={() => setView(mode === 'days' ? addMonths(view, -1) : new Date(view.getFullYear() - 1, view.getMonth(), 1))}
          aria-label={mode === 'days' ? 'Previous month' : 'Previous year'}
          className="rounded-sm p-1 text-muted transition-colors hover:bg-surface-2 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'days' ? 'months' : 'days')}
          className="rounded-sm px-2 py-1 text-sm font-semibold text-text transition-colors hover:bg-surface-2"
        >
          {mode === 'days' ? monthTitle(view) : view.getFullYear()}
        </button>
        <button
          type="button"
          disabled={mode === 'days' ? !canNext : !canNextYear}
          onClick={() => setView(mode === 'days' ? addMonths(view, 1) : new Date(view.getFullYear() + 1, view.getMonth(), 1))}
          aria-label={mode === 'days' ? 'Next month' : 'Next year'}
          className="rounded-sm p-1 text-muted transition-colors hover:bg-surface-2 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {mode === 'days' ? (
      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center font-mono text-3xs text-faint">{w}</span>
        ))}
        {monthGrid(view).map((d) => {
          const s = ymd(d);
          const outMonth = d.getMonth() !== view.getMonth();
          const disabled = s < min || s > max;
          const isEnd = s === anchor || (!anchor && (s === value.from || s === value.to));
          const inRange = !anchor && Boolean(value.from) && Boolean(value.to) && s >= value.from && s <= value.to;
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => pick(s)}
              className={cn(
                'mx-auto flex h-8 w-8 items-center justify-center rounded-sm text-xs tabular-nums transition-colors',
                disabled
                  ? 'cursor-not-allowed text-faint opacity-40'
                  : isEnd
                    ? 'bg-primary font-semibold text-primary-fg'
                    : inRange
                      ? 'bg-primary-100 text-primary-700'
                      : outMonth
                        ? 'text-faint hover:bg-surface-2'
                        : 'text-text hover:bg-surface-2',
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {MONTHS_SHORT.map((label, i) => {
            const monthFirst = new Date(view.getFullYear(), i, 1);
            const monthLast = new Date(view.getFullYear(), i + 1, 0);
            const disabled = ymd(monthLast) < min || ymd(monthFirst) > max;
            const current = i === view.getMonth();
            return (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setView(monthFirst);
                  setMode('days');
                }}
                className={cn(
                  'rounded-sm py-2.5 text-xs font-semibold transition-colors',
                  disabled
                    ? 'cursor-not-allowed text-faint opacity-40'
                    : current
                      ? 'bg-primary text-primary-fg'
                      : 'text-text hover:bg-surface-2',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
