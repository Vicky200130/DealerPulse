'use client';

// URL-backed filter state. The time range and branch filter live in the query
// string, so a filtered view is shareable, survives a refresh, and works with
// the browser's back/forward. Both hooks return a [value, setter] pair shaped
// exactly like useState, so a page swaps `useState('all')` for `useRange()`
// (and `useState('')` for `useBranch()`) with no other change — the TimeRange /
// BranchFilter components still take the same value + onChange.
//
// Defaults are omitted from the URL: no `range` param means all-time, no
// `branch` param means all branches (matching the app-wide broadest-view
// default). Writes use router.replace (not push) so tweaking a filter doesn't
// pile up history entries — Back returns to the previous page, not the previous
// filter click.
import { type ReadonlyURLSearchParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Range } from '@/components/TimeRange';

const PRESETS = new Set(['week', 'month', 'quarter', 'lastquarter', 'all']);

function readRange(sp: ReadonlyURLSearchParams): Range {
  const from = sp.get('from');
  const to = sp.get('to');
  if (from && to) return { from, to };
  const r = sp.get('range') ?? '';
  return (PRESETS.has(r) ? r : 'all') as Range;
}

export function useRange(): [Range, (r: Range) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setRange = (r: Range) => {
    const next = new URLSearchParams(sp.toString());
    next.delete('range');
    next.delete('from');
    next.delete('to');
    if (typeof r === 'object') {
      next.set('from', r.from);
      next.set('to', r.to);
    } else if (r !== 'all') {
      next.set('range', r);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return [readRange(sp), setRange];
}

export function useBranch(): [string, (b: string) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setBranch = (b: string) => {
    const next = new URLSearchParams(sp.toString());
    if (b) next.set('branch', b);
    else next.delete('branch');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return [sp.get('branch') ?? '', setBranch];
}
