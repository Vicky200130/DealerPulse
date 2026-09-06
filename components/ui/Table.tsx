'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'right';
  sortable?: boolean;
  sortValue?: (row: T) => number | string;
  render?: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty,
  rowHref,
  expandable,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T, i: number) => string;
  empty?: React.ReactNode;
  /** When set, the whole row is clickable and navigates here. */
  rowHref?: (row: T) => string;
  /**
   * When set, each row gets a chevron and clicking it toggles an inline detail
   * panel (this render) below the row. Multiple rows can be open at once.
   */
  expandable?: (row: T) => React.ReactNode;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) =>
    setOpen((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  let data = rows;
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (col?.sortValue) {
      data = [...rows].sort((a, b) => {
        const av = col.sortValue!(a);
        const bv = col.sortValue!(b);
        const r = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.dir === 'asc' ? r : -r;
      });
    }
  }

  const toggle = (key: string) =>
    setSort((s) =>
      s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    );

  return (
    <div className="overflow-x-auto">
      {/* min-width only below md so wide tables scroll on mobile but fit their card on desktop */}
      <table className="w-full max-md:min-w-[600px] border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={c.sortable ? () => toggle(c.key) : undefined}
                className={cn(
                  'border-b border-border pb-sm px-sm text-xs font-mono uppercase tracking-wide text-faint font-semibold whitespace-nowrap',
                  c.align === 'right' ? 'text-right' : 'text-left',
                  c.sortable && 'cursor-pointer select-none hover:text-primary',
                )}
              >
                {c.header}
                {c.sortable && (
                  <span className="text-primary">
                    {sort?.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                  </span>
                )}
              </th>
            ))}
            {expandable && <th aria-hidden className="w-8 border-b border-border pb-sm" />}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + (expandable ? 1 : 0)} className="py-xl text-center text-faint">
                {empty ?? 'No data'}
              </td>
            </tr>
          )}
          {data.map((row, i) => {
            const key = getKey(row, i);
            const isOpen = expandable ? open.has(key) : false;
            return (
              <Fragment key={key}>
                <tr
                  // Staggered reveal, matching the Overview's list rows. Capped so a
                  // 30-row leaderboard doesn't take a second to finish appearing.
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                  // Whole-row action: toggle the detail panel when expandable,
                  // else navigate when rowHref is set. Clicks on an inner link
                  // are left to that link.
                  onClick={
                    expandable
                      ? (e) => {
                          if ((e.target as HTMLElement).closest('a')) return;
                          toggleRow(key);
                        }
                      : rowHref
                        ? (e) => {
                            if ((e.target as HTMLElement).closest('a')) return;
                            router.push(rowHref(row));
                          }
                        : undefined
                  }
                  className={cn(
                    'group dp-rise border-b border-border transition-colors duration-fast',
                    !isOpen && 'last:border-0',
                    (rowHref || expandable) && 'cursor-pointer',
                    isOpen ? 'bg-surface-2' : 'hover:bg-surface-2',
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn('px-sm py-sm align-middle', c.align === 'right' && 'text-right whitespace-nowrap')}
                    >
                      {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as React.ReactNode)}
                    </td>
                  ))}
                  {expandable && (
                    <td className="px-sm py-sm text-right align-middle">
                      <ChevronDown
                        size={16}
                        className={cn('text-faint transition-transform duration-fast', isOpen && 'rotate-180 text-primary')}
                      />
                    </td>
                  )}
                </tr>
                {isOpen && (
                  <tr className="border-b border-border last:border-0">
                    <td colSpan={columns.length + 1} className="bg-surface-2 p-0 align-top">
                      {expandable!(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
