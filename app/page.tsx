'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Overview } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card } from '@/components/ui/Card';
import { Funnel } from '@/components/Funnel';
import { TrendChart } from '@/components/charts/TrendChart';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { TimeRange, rangeParams, type RangeKey } from '@/components/TimeRange';

const STATUS_PILL: Record<string, string> = {
  good: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-danger-soft text-danger',
};
const STATUS_STRIPE: Record<string, string> = {
  good: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-danger',
};

export default function OverviewPage() {
  const [range, setRange] = useState<RangeKey>('all');
  const { data, error, loading } = useApi<Overview>(`/overview${rangeParams(range)}`);

  return (
    <>
      <PageHeader title="Group Overview" crumb="Toyota Dealer Group">
        <TimeRange value={range} onChange={setRange} />
      </PageHeader>

      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-md md:grid-cols-5">
          {loading || !data
            ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            : (
              <>
                <KpiCard stripe="success" label="Revenue booked" value={formatINR(data.kpis.revenue_booked)} sub="delivered vehicles" />
                <KpiCard stripe="success" label="Cars delivered" value={data.kpis.cars_delivered} sub={`${data.kpis.total_leads} leads in scope`} />
                <KpiCard stripe="warning" label="Lead → sale" value={pct(data.kpis.conversion)} sub={`win-rate ${pct(data.kpis.win_rate)}`} />
                <KpiCard alarm label="Cold leads" value={data.kpis.cold_leads} sub={`${formatINR(data.kpis.cold_value)} at risk`} />
                <KpiCard stripe="success" label="Avg delivery" value={data.kpis.avg_delivery_days} unit="days" sub="order → handover" />
              </>
            )}
        </div>

        {/* Branch health + attention */}
        <div className="grid gap-md lg:grid-cols-[1.35fr_1fr]">
          <Card title="Branch health" hint="delivered vs full-period target">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="flex flex-col gap-2">
                {data.branch_health.map((b) => (
                  <Link
                    key={b.id}
                    href={`/branches/${b.id}`}
                    className={cn(
                      'grid grid-cols-[10px_1.3fr_1fr_auto] items-center gap-3 rounded-sm border border-border bg-surface px-2.5 py-2 transition-colors duration-fast hover:bg-surface-2',
                      b.status === 'critical' && 'border-danger/40 bg-danger-soft',
                    )}
                  >
                    <span className={cn('h-9 w-2 rounded-sm', STATUS_STRIPE[b.status])} />
                    <div>
                      <div className="text-sm font-semibold">{b.name}</div>
                      <div className="text-xs text-faint">{b.city} · {b.delivered} units</div>
                    </div>
                    <div>
                      <div className="h-2 overflow-hidden rounded-pill bg-surface-2">
                        <div className={cn('h-full rounded-pill', STATUS_STRIPE[b.status])} style={{ width: `${Math.max(2, b.attainment * 100)}%` }} />
                      </div>
                      <div className="mt-1 font-mono text-[10.5px] text-muted">{pct(b.attainment)} to target</div>
                    </div>
                    <span className={cn('rounded-pill px-2 py-0.5 text-[10.5px] font-bold font-mono', STATUS_PILL[b.status])}>
                      {b.status === 'critical' ? 'Critical' : b.status === 'warning' ? 'Behind' : 'Healthy'}
                    </span>
                  </Link>
                ))}
                <p className="mt-1 rounded-sm bg-surface-2 px-2.5 py-2 text-xs text-muted">
                  Deliveries are climbing every month. One planning flag: stated unit targets run well
                  ahead of current pace — worth recalibrating alongside a lead-gen push.
                </p>
              </div>
            )}
          </Card>

          <Card title="Needs your attention" hint="auto-ranked">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="flex flex-col gap-2.5">
                {(() => {
                  const worst = [...data.branch_health].sort((a, b) => a.attainment - b.attainment)[0];
                  const firstDrop = data.funnel.find((f) => f.drop != null);
                  return (
                    <>
                      <Attention tone="danger" icon={<AlertTriangle size={17} />} title={`${worst.name} is behind`} body={`Only ${worst.delivered} delivered at ${pct(worst.attainment)} of target. Half its leads are never contacted.`} href={`/branches/${worst.id}`} />
                      <Attention tone="warning" icon={<Clock size={17} />} title={`${data.kpis.cold_leads} leads going cold`} body={`Worth ${formatINR(data.kpis.cold_value)} in pipeline, untouched 7+ days.`} href="/bottlenecks" />
                      <Attention tone="primary" icon={<TrendingUp size={17} />} title="The funnel leaks early" body={`${firstDrop ? Math.round((firstDrop.drop ?? 0) * 100) : 23}% of leads drop at first contact — the biggest single leak.`} href="/insights" />
                    </>
                  );
                })()}
              </div>
            )}
          </Card>
        </div>

        {/* Funnel + trend */}
        <div className="grid gap-md lg:grid-cols-[1fr_1.1fr]">
          <Card title="Group conversion funnel" hint={data ? `${data.kpis.total_leads} leads` : ''}>
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <Funnel
                steps={data.funnel}
                note={`${data.funnel[0].count - data.funnel[1].count} leads were never contacted, and first contact takes ~${Math.round(data.speed_to_lead.median_hours)} hrs. Speed is the fastest win.`}
              />
            )}
          </Card>
          <Card title="Deliveries per month" hint="momentum">
            {loading || !data ? <Skeleton className="h-[150px] w-full" /> : <TrendChart data={data.monthly} />}
          </Card>
        </div>

        {/* Speed + pipeline */}
        <div className="grid gap-md lg:grid-cols-2">
          <Card title="Speed to first contact" hint="new lead → first call">
            {loading || !data ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[38px] font-semibold leading-none text-warning">
                    {Math.round(data.speed_to_lead.median_hours)}
                  </span>
                  <span className="text-sm font-semibold text-muted">hrs median</span>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Only {pct(data.speed_to_lead.within_24h)} of leads are contacted within a day. Slow first
                  response is the biggest cause of the contact-stage drop.
                </p>
              </div>
            )}
          </Card>
          <Card title="Open pipeline value" hint={data ? `${data.kpis.open_leads} active leads` : ''}>
            {loading || !data ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[38px] font-semibold leading-none">
                    {formatINR(data.kpis.pipeline_value)}
                  </span>
                  <span className="text-sm font-semibold text-muted">live</span>
                </div>
                <div className="mt-3 flex h-3.5 overflow-hidden rounded-pill">
                  <div className="bg-danger" style={{ width: `${(data.kpis.cold_value / data.kpis.pipeline_value) * 100}%` }} />
                  <div className="flex-1 bg-success" />
                </div>
                <div className="mt-2 flex justify-between text-[11.5px] font-semibold">
                  <span className="text-danger">{formatINR(data.kpis.cold_value)} at risk (cold)</span>
                  <span className="text-success">{formatINR(data.kpis.pipeline_value - data.kpis.cold_value)} healthy</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Attention({
  tone,
  icon,
  title,
  body,
  href,
}: {
  tone: 'danger' | 'warning' | 'primary';
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
}) {
  const bg = { danger: 'bg-danger-soft text-danger', warning: 'bg-warning-soft text-warning', primary: 'bg-primary-100 text-primary-700' }[tone];
  return (
    <Link href={href} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-sm border border-border bg-surface p-3 transition-colors duration-fast hover:bg-surface-2">
      <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-sm', bg)}>{icon}</span>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-0.5 text-xs text-muted">{body}</p>
      </div>
      <ArrowRight size={15} className="text-faint" />
    </Link>
  );
}
