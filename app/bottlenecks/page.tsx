'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Download, Search } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Bottleneck, BottleneckCategory, BottleneckResult } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { BranchFilter } from '@/components/BranchFilter';
import { TimeRange, appendBranch, appendRange, type RangeKey } from '@/components/TimeRange';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { bottleneckColumns } from '@/components/leadColumns';
import { LeadTimeline } from '@/components/LeadTimeline';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { downloadCSV } from '@/lib/csv';

type Idle = '1' | '3' | '7' | '14';
type CatFilter = 'all' | BottleneckCategory;

// The three buckets, in the order they should be worked: recoverable sales
// follow-ups, then delivery chases, then deals to close out.
const CATS: { key: BottleneckCategory; label: string; blurb: string; cls: string; active: string }[] = [
  { key: 'follow_up', label: 'Follow-ups', blurb: 'pre-order, recoverable', cls: 'bg-primary-100 text-primary-700', active: 'ring-2 ring-primary-500' },
  { key: 'delivery', label: 'Deliveries to chase', blurb: 'ordered, awaiting delivery', cls: 'bg-warning-soft text-warning', active: 'ring-2 ring-warning' },
  { key: 'stale', label: 'Likely dead', blurb: '60+ days — close or revive', cls: 'bg-surface-2 text-muted', active: 'ring-2 ring-border' },
];

export default function BottlenecksPage() {
  const [idle, setIdle] = useState<Idle>('7');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CatFilter>('all');
  const [range, setRange] = useState<RangeKey>('all');
  const [branch, setBranch] = useState('');
  const { data, error, loading } = useApi<BottleneckResult>(appendBranch(appendRange(`/bottlenecks?idle=${idle}`, range), branch));

  const rows = useMemo(() => {
    if (!data) return [];
    let rs = data.rows;
    if (cat !== 'all') rs = rs.filter((r) => r.category === cat);
    if (q) {
      const s = q.toLowerCase();
      rs = rs.filter((r) => `${r.customer_name} ${r.model} ${r.rep}`.toLowerCase().includes(s));
    }
    return rs;
  }, [data, q, cat]);

  const exportCSV = () =>
    downloadCSV('dealerpulse-bottlenecks.csv', rows as unknown as Record<string, unknown>[], [
      { key: 'customer_name', header: 'Customer' },
      { key: 'model', header: 'Model' },
      { key: 'status', header: 'Stage' },
      { key: 'category', header: 'Type' },
      { key: 'deal_value', header: 'Deal value' },
      { key: 'next_best_action', header: 'Next best action' },
      { key: 'rep', header: 'Rep' },
      { key: 'branch', header: 'Branch' },
      { key: 'idle_days', header: 'Idle days' },
    ]);

  return (
    <>
      <PageHeader title="Actionable Bottlenecks" subtitle="Stuck deals, sorted by what you can do about them" icon={<AlertTriangle size={18} />}>
        <BranchFilter value={branch} onChange={setBranch} />
        <TimeRange value={range} onChange={setRange} />
        <Button onClick={exportCSV} disabled={!rows.length}>
          <Download size={13} />
          Export CSV
        </Button>
      </PageHeader>

      <div className="p-lg flex flex-col gap-md">
        {error && <ErrorState error={error} />}

        {/* Category summary: the honest split, each chip a filter. The old single
            "capital at risk" number lumped recoverable leads in with months-old
            dead orders — this separates what a manager can actually act on. */}
        {data && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {CATS.map((c) => {
              const stat = data.categories[c.key];
              const selected = cat === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCat(selected ? 'all' : c.key)}
                  className={cn(
                    'rounded border border-border bg-surface p-3 text-left transition-shadow duration-fast hover:shadow-[var(--shadow-card)]',
                    selected && c.active,
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('rounded-pill px-2 py-0.5 text-2xs font-semibold', c.cls)}>{c.label}</span>
                    <span className="font-mono text-lg font-semibold tabular-nums">{stat.count}</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-xs text-faint">{c.blurb}</span>
                    <span className="font-mono text-xs font-semibold text-muted">{formatINR(stat.value)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Idle>
            value={idle}
            onChange={setIdle}
            options={[
              { label: '1d+', value: '1' },
              { label: '3d+', value: '3' },
              { label: '7d+', value: '7' },
              { label: '14d+', value: '14' },
            ]}
          />
          {cat !== 'all' && (
            <button
              type="button"
              onClick={() => setCat('all')}
              className="rounded-sm border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted hover:text-primary"
            >
              Showing {CATS.find((c) => c.key === cat)?.label} · clear
            </button>
          )}
          <div className="ml-auto flex min-w-[200px] items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-1.5 text-xs">
            <Search size={13} className="text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customer, model, rep…"
              className="w-full bg-transparent text-text outline-none placeholder:text-faint"
            />
          </div>
        </div>

        <Card>
          {loading || !data ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <DataTable<Bottleneck>
              rows={rows}
              getKey={(r) => r.id}
              empty="No deals match — nice."
              columns={bottleneckColumns()}
              expandable={(r) => <LeadTimeline lead={r} />}
            />
          )}
        </Card>
      </div>
    </>
  );
}
