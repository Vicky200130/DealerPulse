'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Car, Clock, Gauge, Truck } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useBranch, useRange, useRep } from '@/lib/useFilters';
import { formatINR, pct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AwaitingOrder, DeliveriesResp, ModelRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { BranchFilter } from '@/components/BranchFilter';
import { RepFilter } from '@/components/RepFilter';
import { TimeRange, appendBranch, appendRange, rangeLabel } from '@/components/TimeRange';
import { KpiCard } from '@/components/KpiCard';
import { CountUp } from '@/components/CountUp';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { ReasonBars } from '@/components/ReasonBars';
import { InsightNote } from '@/components/InsightNote';
import { DataTable } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

// The waiting-time filter: 'all', the three aging buckets (clickable pills), or a
// minimum-days threshold (the segmented control) for finer cuts.
type Wait = 'all' | 'u30' | '30_59' | '60' | '7' | '9' | '14' | '30';

function keepWaiting(days: number, wait: Wait): boolean {
  switch (wait) {
    case 'all':
      return true;
    case 'u30':
      return days < 30;
    case '30_59':
      return days >= 30 && days < 60;
    case '60':
      return days >= 60;
    default:
      return days >= Number(wait); // '7' | '9' | '14' | '30' → minimum days
  }
}

// Short, one-line labels for the delay-reason bars (full text shows on hover).
const DELAY_LABELS: Record<string, string> = {
  'Customer requested date change': 'Customer changed date',
  'Logistics delay in transit': 'Logistics delay',
  'Vehicle allocation delayed from factory': 'Factory allocation delay',
  'Accessory fitment backlog': 'Accessory fitment',
  'Finance disbursement pending': 'Finance pending',
  'RTO registration delay': 'RTO registration',
  'PDI rework required': 'PDI rework',
};

const intFmt = (n: number) => String(Math.round(n));
// Keeps one decimal without forcing a trailing .0 (12 → "12", 12.5 → "12.5").
const dp1 = (n: number) => String(Math.round(n * 10) / 10);

export default function DeliveriesPage() {
  const [range, setRange] = useRange();
  const [branch, setBranch] = useBranch();
  const [rep, setRep] = useRep();
  const [wait, setWait] = useState<Wait>('all');
  const base = appendBranch(appendRange('/deliveries', range), branch);
  const { data, error, loading } = useApi<DeliveriesResp>(
    rep ? `${base}${base.includes('?') ? '&' : '?'}rep=${rep}` : base,
  );
  const a = data?.analysis;
  const topRev = data ? [...data.model_mix].sort((x, y) => y.revenue - x.revenue)[0] : undefined;
  const topVol = data ? [...data.model_mix].sort((x, y) => y.leads - x.leads)[0] : undefined;
  // The awaiting rows sliced by the selected waiting-time filter.
  const awaitingRows = useMemo(
    () => (data ? data.awaiting.rows.filter((r) => keepWaiting(r.days_waiting, wait)) : []),
    [data, wait],
  );

  return (
    <>
      <PageHeader title="Deliveries & Demand" subtitle="Delivery times and model demand" icon={<Truck size={18} />}>
        <BranchFilter value={branch} onChange={setBranch} />
        <RepFilter branch={branch} value={rep} onChange={setRep} />
        <TimeRange value={range} onChange={setRange} />
      </PageHeader>
      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

        <div className="grid grid-cols-2 gap-md md:grid-cols-4">
          {loading || !a ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard tone="primary" icon={<Car size={16} />} label="Cars delivered" value={<CountUp value={a.total} format={intFmt} />} sub={rangeLabel(range)} />
              <KpiCard tone="warning" icon={<Clock size={16} />} label="On-time rate" value={<CountUp value={a.on_time_rate} format={(n) => pct(n)} />} sub={`${a.delayed} ran late`} />
              <KpiCard tone="success" icon={<Gauge size={16} />} label="On-time speed" value={<CountUp value={a.avg_days_on_time} format={dp1} />} unit="days" />
              <KpiCard alarm icon={<AlertTriangle size={16} />} label="When delayed" value={<CountUp value={a.avg_days_delayed} format={dp1} />} unit="days" sub="nearly 2× slower" />
            </>
          )}
        </div>

        {/* Committed orders awaiting delivery — booked revenue that hasn't been
            collected yet. The oldest ones are the fulfilment backlog behind the
            delay reasons below. */}
        <Card
          title="Committed orders awaiting delivery"
          hint={data ? `${data.awaiting.count} orders · ${formatINR(data.awaiting.value)}` : ''}
        >
          {loading || !data ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                <span className="font-semibold text-text">{formatINR(data.awaiting.value)}</span> of booked revenue is waiting to be delivered
                {data.awaiting.over_60_value > 0 && (
                  <>
                    {' '}— <span className="font-semibold text-danger">{formatINR(data.awaiting.over_60_value)}</span> of it stuck 60+ days
                  </>
                )}
                .
              </p>
              {/* Clickable aging pills — tap one to filter the table to that bucket. */}
              <div className="grid grid-cols-3 gap-2.5">
                <AgingPill label="Under 30 days" count={data.awaiting.buckets.under_30} tone="neutral" active={wait === 'u30'} onClick={() => setWait((w) => (w === 'u30' ? 'all' : 'u30'))} />
                <AgingPill label="30–59 days" count={data.awaiting.buckets['30_59']} tone="warning" active={wait === '30_59'} onClick={() => setWait((w) => (w === '30_59' ? 'all' : '30_59'))} />
                <AgingPill label="60+ days" count={data.awaiting.buckets['60_plus']} tone="danger" active={wait === '60'} onClick={() => setWait((w) => (w === '60' ? 'all' : '60'))} />
              </div>
              {/* Finer waiting-time cuts, like the Bottlenecks day filter. */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xs font-semibold uppercase tracking-wide text-faint">Waiting</span>
                <Segmented<Wait>
                  value={wait}
                  onChange={setWait}
                  options={[
                    { label: 'All', value: 'all' },
                    { label: '7d+', value: '7' },
                    { label: '9d+', value: '9' },
                    { label: '14d+', value: '14' },
                    { label: '30d+', value: '30' },
                    { label: '60d+', value: '60' },
                  ]}
                />
                <span className="ml-auto font-mono text-2xs text-faint">
                  {awaitingRows.length} orders · {formatINR(awaitingRows.reduce((s, r) => s + r.deal_value, 0))}
                </span>
              </div>
              <DataTable<AwaitingOrder>
                rows={awaitingRows.slice(0, 10)}
                getKey={(r) => r.id}
                empty="No orders in this waiting range."
                columns={[
                  {
                    key: 'customer_name',
                    header: 'Customer',
                    render: (r) => (
                      <div>
                        <div className="font-semibold">{r.customer_name}</div>
                        <div className="text-xs text-faint">{r.model} · {r.branch}</div>
                      </div>
                    ),
                  },
                  { key: 'deal_value', header: 'Value', align: 'right', sortable: true, sortValue: (r) => r.deal_value, render: (r) => <span className="font-mono">{formatINR(r.deal_value)}</span> },
                  {
                    key: 'days_waiting',
                    header: 'Waiting',
                    align: 'right',
                    sortable: true,
                    sortValue: (r) => r.days_waiting,
                    render: (r) => (
                      <Badge tone={r.days_waiting >= 60 ? 'danger' : r.days_waiting >= 30 ? 'warning' : 'neutral'} mono>
                        {r.days_waiting}d
                      </Badge>
                    ),
                  },
                ]}
              />
              {data.awaiting.buckets['60_plus'] > 0 && (
                <InsightNote>
                  {data.awaiting.buckets['60_plus']} orders ({formatINR(data.awaiting.over_60_value)}) have been waiting 60+ days — money already earned, sitting on the factory floor. They need a delivery-team escalation, not a sales follow-up.
                </InsightNote>
              )}
            </div>
          )}
        </Card>

        <div className="grid gap-md lg:grid-cols-2">
          <Card title="Why deliveries slip" hint={a ? `${a.delayed} delayed` : ''}>
            {loading || !a ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <>
                <ReasonBars color="danger" items={a.delay_reasons.map((r) => ({ label: DELAY_LABELS[r.reason] ?? r.reason, value: r.count, title: r.reason }))} />
                {a.delay_reasons.length > 0 && (() => {
                  const top = a.delay_reasons[0];
                  const ours = a.delay_reasons.filter((r) => /logistics|factory|allocation/i.test(r.reason)).reduce((s, r) => s + r.count, 0);
                  return (
                    <InsightNote>
                      {a.delayed} of {a.total} deliveries ran late. The top reason — “{(DELAY_LABELS[top.reason] ?? top.reason).toLowerCase()}” ({top.count}) — is often outside our control, but logistics and factory delays ({ours}) are ours to fix.
                    </InsightNote>
                  );
                })()}
              </>
            )}
          </Card>

          <Card title="What people actually buy" hint="leads · won · avg price · revenue">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <>
                <DataTable<ModelRow>
                  rows={data.model_mix}
                  getKey={(r) => r.model}
                  columns={[
                    {
                      key: 'model',
                      header: 'Model',
                      render: (r) => (
                        <span className="font-semibold">
                          {r.model}
                          {topRev && r.model === topRev.model && (
                            <Badge tone="success" className="ml-2">
                              top revenue
                            </Badge>
                          )}
                        </span>
                      ),
                    },
                    { key: 'leads', header: 'Leads', align: 'right', sortable: true, sortValue: (r) => r.leads, render: (r) => <span className="font-mono">{r.leads}</span> },
                    { key: 'delivered', header: 'Won', align: 'right', sortable: true, sortValue: (r) => r.delivered, render: (r) => <span className="font-mono">{r.delivered}</span> },
                    { key: 'avg_price', header: 'Avg price', align: 'right', sortable: true, sortValue: (r) => r.avg_price, render: (r) => <span className="font-mono text-muted">{formatINR(r.avg_price)}</span> },
                    { key: 'revenue', header: 'Revenue', align: 'right', sortable: true, sortValue: (r) => r.revenue, render: (r) => <span className="font-mono font-semibold">{formatINR(r.revenue)}</span> },
                  ]}
                />
                {topVol && topRev && (
                  <InsightNote>
                    {topVol.model} pulls the most interest ({topVol.leads} leads)
                    {topRev.model !== topVol.model ? (
                      <> and {topRev.model} brings the most money ({formatINR(topRev.revenue)} from {topRev.delivered} sold) — the volume model and the profit model.</>
                    ) : (
                      <> and the most money ({formatINR(topRev.revenue)}).</>
                    )}
                  </InsightNote>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function AgingPill({ label, count, tone, active, onClick }: { label: string; count: number; tone: 'neutral' | 'warning' | 'danger'; active?: boolean; onClick?: () => void }) {
  const cls = {
    neutral: 'bg-surface-2 text-muted',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
  }[tone];
  const ring = { neutral: 'ring-border', warning: 'ring-warning', danger: 'ring-danger' }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-sm px-3 py-2 text-left transition-shadow duration-fast hover:shadow-[var(--shadow-card)]', cls, active && `ring-2 ${ring}`)}
    >
      <div className="font-mono text-lg font-semibold tabular-nums">{count}</div>
      <div className="text-2xs font-medium">{label}</div>
    </button>
  );
}
