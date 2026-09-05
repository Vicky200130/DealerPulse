'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtRange } from '@/lib/dates';
import { Calendar } from './ui/Calendar';

export type RangePreset = 'week' | 'month' | 'quarter' | 'lastquarter' | 'all';
// A range is either a named preset or a custom { from, to } window.
export type Range = RangePreset | { from: string; to: string };
// Back-compat alias so existing pages (`useState<RangeKey>`) keep compiling.
export type RangeKey = Range;

// The dataset spans Jun–Dec 2025 with "now" ≈ 31 Dec — the custom picker clamps
// to this window since nothing exists outside it.
export const DATA_MIN = '2025-06-01';
export const DATA_MAX = '2025-12-31';

export const RANGES: { label: string; value: RangePreset; past?: boolean }[] = [
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'This quarter', value: 'quarter' },
  { label: 'Last quarter', value: 'lastquarter', past: true },
  { label: 'All time', value: 'all' },
];

const isCustom = (r: Range): r is { from: string; to: string } => typeof r === 'object';

/** Human label for a range — a preset name or the custom span "12 Oct – 31 Dec". */
export function rangeLabel(r: Range): string {
  if (isCustom(r)) return fmtRange(r.from, r.to);
  return RANGES.find((o) => o.value === r)?.label ?? 'This quarter';
}

/** A range is "past" when it ends before the data's now-anchor (Dec 2025). */
export function isPastRange(r: Range): boolean {
  if (isCustom(r)) return r.to < '2025-12-25';
  return RANGES.find((o) => o.value === r)?.past ?? false;
}

/** Caption for a period-over-period delta, matching the selected range. */
export function prevLabel(r: Range): string {
  if (isCustom(r)) return 'vs prior period';
  switch (r) {
    case 'week':
      return 'vs last week';
    case 'month':
      return 'vs last month';
    case 'quarter':
    case 'lastquarter':
      return 'vs prior quarter';
    default:
      return '';
  }
}

// Windows are anchored to the dataset (activity runs Jun–Dec 2025, "now" ≈ 31 Dec).
export function rangeParams(r: Range): string {
  if (isCustom(r)) return `?from=${r.from}&to=${r.to}`;
  switch (r) {
    case 'week':
      return '?from=2025-12-25&to=2025-12-31';
    case 'month':
      return '?from=2025-12-01&to=2025-12-31';
    case 'quarter':
      return '?from=2025-10-01&to=2025-12-31';
    case 'lastquarter':
      return '?from=2025-07-01&to=2025-09-30';
    default:
      return '';
  }
}

/** Merge a query fragment into a path, respecting an existing query string. */
function merge(path: string, q: string): string {
  if (!q) return path;
  return path.includes('?') ? `${path}&${q.slice(1)}` : `${path}${q}`;
}

/** Append the selected range to an API path. */
export function appendRange(path: string, r: Range): string {
  return merge(path, rangeParams(r));
}

/** Append a branch filter to an API path (empty branch = all branches). */
export function appendBranch(path: string, branch?: string): string {
  return branch ? merge(path, `?branch=${branch}`) : path;
}

export function TimeRange({ value, onChange }: { value: Range; onChange: (v: Range) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const custom = isCustom(value);
  const draft = custom ? value : { from: '', to: '' };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors duration-fast hover:bg-surface-2"
      >
        <CalendarDays size={15} className="text-muted" />
        {rangeLabel(value)}
        <ChevronDown size={15} className={cn('text-faint transition-transform duration-fast', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-[288px] rounded-md border border-border bg-surface p-3 shadow-lg">
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  'rounded-sm px-2.5 py-1 text-xs font-semibold transition-colors',
                  !custom && value === o.value ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted hover:text-text',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="my-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-faint">
            <span className="h-px flex-1 bg-border" />
            Custom range
            <span className="h-px flex-1 bg-border" />
          </div>
          <Calendar
            value={draft}
            min={DATA_MIN}
            max={DATA_MAX}
            onChange={(from, to) => {
              onChange({ from, to });
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
