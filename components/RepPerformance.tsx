'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatINR, pct } from '@/lib/format';
import type { LeaderRow } from '@/types';
import { DataTable } from './ui/Table';
import { Badge } from './ui/Badge';

// The "Sales rep performance" table shown on the Overview when it's scoped to a
// single branch (a manager's view, or a CEO who picked a branch) — in place of
// the cross-branch ranking, which is meaningless for one branch. Reuses the same
// DataTable as every other table, so the look is unchanged.
export function RepPerformance({ reps }: { reps: LeaderRow[] }) {
  return (
    <DataTable<LeaderRow>
      rows={reps}
      getKey={(r) => r.id}
      rowHref={(r) => `/reps/${r.id}`}
      empty="No reps in scope."
      columns={[
        {
          key: 'name',
          header: 'Rep',
          render: (r) => (
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/reps/${r.id}`} className="font-semibold hover:text-primary">
                  {r.name}
                </Link>
                <Badge tone={r.conversion < 0.1 ? 'danger' : r.conversion < 0.2 ? 'warning' : 'success'} mono>
                  {pct(r.conversion)}
                </Badge>
                {r.needs_coaching && <Badge tone="warning">Coach</Badge>}
              </div>
              <div className="mt-0.5 text-xs text-faint">
                Contacted{' '}
                <span className={`font-mono ${r.contact_rate < 0.65 ? 'text-danger' : 'text-muted'}`}>{pct(r.contact_rate)}</span>
              </div>
            </div>
          ),
        },
        { key: 'delivered', header: 'Delivered', align: 'right', sortable: true, sortValue: (r) => r.delivered, render: (r) => <span className="font-mono">{r.delivered}</span> },
        {
          key: 'cold',
          header: 'Cold',
          align: 'right',
          sortable: true,
          sortValue: (r) => r.cold,
          render: (r) => (r.cold > 0 ? <Badge tone="warning" mono>{r.cold}</Badge> : <span className="font-mono text-faint">0</span>),
        },
        { key: 'revenue', header: 'Revenue', align: 'right', sortable: true, sortValue: (r) => r.revenue, render: (r) => <span className="font-mono font-semibold">{formatINR(r.revenue)}</span> },
        {
          key: 'go',
          header: '',
          align: 'right',
          render: (r) => (
            <Link
              href={`/reps/${r.id}`}
              aria-label={`View ${r.name}`}
              className="flex justify-end text-primary opacity-0 transition-all duration-fast group-hover:translate-x-0.5 group-hover:opacity-100"
            >
              <ArrowUpRight size={16} />
            </Link>
          ),
        },
      ]}
    />
  );
}
