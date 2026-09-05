'use client';

import { useState } from 'react';
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
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T, i: number) => string;
  empty?: React.ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

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
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-xl text-center text-faint">
                {empty ?? 'No data'}
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr
              key={getKey(row, i)}
              className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors duration-fast"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn('px-sm py-sm align-middle', c.align === 'right' && 'text-right whitespace-nowrap')}
                >
                  {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
