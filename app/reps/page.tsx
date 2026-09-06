'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, GraduationCap, Users } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useBranch, useRange } from '@/lib/useFilters';
import { formatINR, pct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { LeaderRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { BranchFilter } from '@/components/BranchFilter';
import { TimeRange, appendBranch, appendRange } from '@/components/TimeRange';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

type Metric = 'revenue' | 'delivered' | 'avg_deal';

export default function RepsPage() {
  const [metric, setMetric] = useState<Metric>('revenue');
  const [coachingOnly, setCoachingOnly] = useState(false);
  const [range, setRange] = useRange();
  const [branch, setBranch] = useBranch();
  const { data, error, loading } = useApi<LeaderRow[]>(appendBranch(appendRange('/reps', range), branch));

  const coachCount = useMemo(() => (data ? data.filter((r) => r.needs_coaching).length : 0), [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    // Coaching view: worst follow-up discipline first. Otherwise the chosen
    // performance metric, best first.
    if (coachingOnly) return data.filter((r) => r.needs_coaching).sort((a, b) => a.contact_rate - b.contact_rate);
    return [...data].sort((a, b) => (b[metric] as number) - (a[metric] as number));
  }, [data, metric, coachingOnly]);

  return (
    <>
      <PageHeader title="Sales Reps" subtitle={data ? `${data.length} sales reps` : 'Sales representatives'} icon={<Users size={18} />}>
        <BranchFilter value={branch} onChange={setBranch} />
        <TimeRange value={range} onChange={setRange} />
        <Segmented<Metric>
          value={metric}
          onChange={(m) => {
            setMetric(m);
            setCoachingOnly(false);
          }}
          options={[
            { label: 'Revenue', value: 'revenue' },
            { label: 'Units', value: 'delivered' },
            { label: 'Avg deal', value: 'avg_deal' },
          ]}
        />
      </PageHeader>

      <div className="p-lg flex flex-col gap-md">
        {error && <ErrorState error={error} />}

        {/* Coaching callout: who to develop, not just who's winning. Keyed on
            contact rate (an individual signal); team-wide slow response is a
            separate systemic fix, noted but not used to single people out. */}
        {data && coachCount > 0 && (
          <button
            type="button"
            onClick={() => setCoachingOnly((v) => !v)}
            className={cn(
              'flex items-center gap-3 rounded border border-border bg-surface p-3 text-left transition-shadow duration-fast hover:shadow-[var(--shadow-card)]',
              coachingOnly && 'ring-2 ring-warning',
            )}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-warning-soft text-warning">
              <GraduationCap size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">
                {coachCount} {coachCount === 1 ? 'rep needs' : 'reps need'} coaching
              </div>
              <p className="mt-0.5 text-xs text-muted">
                Leaving too many assigned leads uncontacted. {coachingOnly ? 'Showing them below · tap to clear' : 'Tap to see who.'}
              </p>
            </div>
          </button>
        )}

        <Card title={coachingOnly ? 'Reps to coach' : 'Leaderboard'} hint={data ? `${rows.length} reps` : ''}>
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
                    <div className="flex items-center gap-2">
                      <Link href={`/reps/${r.id}`} className="font-semibold hover:text-primary">
                        {r.name}
                        <span className="block text-xs font-normal text-faint">{r.branch}</span>
                      </Link>
                      {r.needs_coaching && <Badge tone="warning">Coach</Badge>}
                    </div>
                  ),
                },
                { key: 'delivered', header: 'Units', align: 'right', sortable: true, sortValue: (r) => r.delivered, render: (r) => <span className="font-mono">{r.delivered}</span> },
                {
                  key: 'contact_rate',
                  header: 'Contacted',
                  align: 'right',
                  sortable: true,
                  sortValue: (r) => r.contact_rate,
                  render: (r) => <span className={cn('font-mono', r.contact_rate < 0.65 ? 'font-semibold text-danger' : 'text-muted')}>{pct(r.contact_rate)}</span>,
                },
                {
                  key: 'avg_response_hours',
                  header: 'Response',
                  align: 'right',
                  sortable: true,
                  sortValue: (r) => r.avg_response_hours,
                  render: (r) => <span className="font-mono text-muted">{Math.round(r.avg_response_hours)}h</span>,
                },
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
