'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR } from '@/lib/format';
import type { LeaderRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { TimeRange, appendRange, type RangeKey } from '@/components/TimeRange';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

type Metric = 'revenue' | 'delivered' | 'avg_deal';

export default function RepsPage() {
  const [metric, setMetric] = useState<Metric>('revenue');
  const [range, setRange] = useState<RangeKey>('all');
  const { data, error, loading } = useApi<LeaderRow[]>(appendRange('/reps', range));
  const rows = data ? [...data].sort((a, b) => (b[metric] as number) - (a[metric] as number)) : [];

  return (
    <>
      <PageHeader title="Sales Reps" subtitle="30 reps across 5 branches">
        <TimeRange value={range} onChange={setRange} />
        <Segmented<Metric>
          value={metric}
          onChange={setMetric}
          options={[
            { label: 'Revenue', value: 'revenue' },
            { label: 'Units', value: 'delivered' },
            { label: 'Avg deal', value: 'avg_deal' },
          ]}
        />
      </PageHeader>

      <div className="p-lg">
        {error && <ErrorState error={error} />}
        <Card title="Leaderboard" hint={data ? `${data.length} reps with leads` : ''}>
          {loading || !data ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <DataTable<LeaderRow>
              rows={rows}
              getKey={(r) => r.id}
              rowHref={(r) => `/reps/${r.id}`}
              columns={[
                { key: 'rank', header: '#', render: (r) => <span className="font-mono text-faint">{rows.indexOf(r) + 1}</span> },
                {
                  key: 'name',
                  header: 'Rep',
                  render: (r) => (
                    <Link href={`/reps/${r.id}`} className="font-semibold hover:text-primary">
                      {r.name}
                      <span className="block text-xs font-normal text-faint">{r.branch}</span>
                    </Link>
                  ),
                },
                { key: 'delivered', header: 'Units', align: 'right', sortable: true, sortValue: (r) => r.delivered, render: (r) => <span className="font-mono">{r.delivered}</span> },
                { key: 'avg_deal', header: 'Avg deal', align: 'right', sortable: true, sortValue: (r) => r.avg_deal, render: (r) => <span className="font-mono">{formatINR(r.avg_deal)}</span> },
                {
                  key: 'active_deals',
                  header: 'Active',
                  align: 'right',
                  render: (r) =>
                    r.overloaded ? (
                      <Badge tone="warning" mono>
                        {r.active_deals} ⚠
                      </Badge>
                    ) : (
                      <span className="font-mono">{r.active_deals}</span>
                    ),
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
          )}
        </Card>
      </div>
    </>
  );
}
