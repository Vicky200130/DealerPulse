'use client';

import { Car, Clock, GraduationCap, Target, Users } from 'lucide-react';
import { pct } from '@/lib/format';
import type { Bottleneck, RepDetail } from '@/types';
import { KpiCard } from './KpiCard';
import { CountUp } from './CountUp';
import { Card } from './ui/Card';
import { Funnel } from './Funnel';
import { TrendChart } from './charts/TrendChart';
import { DataTable } from './ui/Table';
import { bottleneckColumns } from './leadColumns';
import { LeadTimeline } from './LeadTimeline';
import { CardSkeleton, Skeleton } from './ui/Skeleton';

const monthName = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' });
};

const intFmt = (n: number) => String(Math.round(n));
// Keeps one decimal without forcing a trailing .0 (12 → "12", 12.5 → "12.5").
const dp1 = (n: number) => String(Math.round(n * 10) / 10);

/**
 * A rep's personal dashboard body — identity line, KPIs, coaching flag, personal
 * funnel and open pipeline. Shared by the Sales-rep drill-down (/reps/[id]) and a
 * sales executive's own Overview, so both stay identical without duplication.
 */
export function RepDashboard({ data, loading }: { data: RepDetail | null; loading: boolean }) {
  const initials = data ? data.name.split(' ').map((w) => w[0]).slice(0, 2).join('') : '';
  const below = data ? data.kpis.conversion < data.branch_conversion : false;

  return (
    <>
      {loading || !data ? (
        <Skeleton className="h-14 w-full" />
      ) : (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-pill bg-primary text-primary-fg font-display text-xl font-bold">
            {initials}
          </span>
          <div className="font-mono text-xs text-muted">
            {data.role.replace('_', ' ')} · {data.branch} · joined {data.joined?.slice(0, 7)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-md md:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard tone="primary" icon={<Users size={16} />} label="Assigned leads" value={<CountUp value={data.kpis.leads} format={intFmt} />} />
            <KpiCard alarm={data.kpis.delivered <= 1} tone="primary" icon={<Car size={16} />} label="Cars delivered" value={<CountUp value={data.kpis.delivered} format={intFmt} />} />
            <KpiCard tone={below ? 'danger' : 'success'} icon={<Target size={16} />} label="Conversion" value={<CountUp value={data.kpis.conversion} format={(n) => pct(n)} />} sub={`became a sale: ${data.kpis.sold} of ${data.kpis.leads} · branch ${pct(data.branch_conversion)}`} />
            <KpiCard tone="warning" icon={<Clock size={16} />} label="Avg response" value={<CountUp value={data.kpis.avg_response_hours} format={dp1} />} unit="hrs" sub={`${pct(data.kpis.contact_rate)} of leads contacted`} />
          </>
        )}
      </div>

      {/* Coaching flag: names the specific follow-up gap, so it's development,
          not just a scoreboard. */}
      {!loading && data?.needs_coaching && (
        <div className="flex items-center gap-2.5 rounded-sm bg-warning-soft px-3.5 py-2.5 text-xs text-warning">
          <GraduationCap size={16} className="shrink-0" />
          <span>
            Follow-up gap — only <span className="font-semibold">{pct(data.kpis.contact_rate)}</span> of assigned leads were ever contacted. A coaching opportunity, not a demand problem.
          </span>
        </div>
      )}

      <div className="grid gap-md lg:grid-cols-2">
        <Card title="Personal funnel" hint="leads reaching each stage">
          {loading || !data ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <Funnel
              steps={data.funnel}
              note={(() => {
                const total = data.funnel[0]?.count ?? 0;
                const contacted = data.funnel[1]?.count ?? 0;
                const never = total - contacted;
                return never > 0
                  ? `${never} of ${total} leads (${pct(never / total)}) never got past the first call — the rep's biggest drop-off.`
                  : undefined;
              })()}
            />
          )}
        </Card>
        {/* Reuses the Overview trend chart, plotting this rep's contacted vs sold. */}
        <Card title="Contacted vs sold" hint="per month">
          {loading || !data ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <TrendChart
              data={data.monthly}
              barKey="sold"
              barLabel="Sold"
              lineKey="contacted"
              lineLabel="Contacted"
              lineColor="var(--warning)"
              lineAxisFormat={(n) => String(n)}
              lineTipFormat={(n) => String(n)}
              note={(() => {
                const ms = data.monthly;
                if (!ms.length) return undefined;
                const best = [...ms].sort((a, b) => b.contacted - a.contacted)[0];
                const last = ms[ms.length - 1];
                return `Best month was ${monthName(best.month)} — ${best.contacted} contacted, ${best.sold} sold. Contacts ${last.contacted <= 1 ? 'dropped to' : 'were'} ${last.contacted} in ${monthName(last.month)}.`;
              })()}
            />
          )}
        </Card>
      </div>

      <Card title="Open pipeline" hint={data ? `${data.pipeline.length} active` : ''}>
        {loading || !data ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <DataTable<Bottleneck>
            rows={data.pipeline}
            getKey={(r) => r.id}
            empty="No open deals."
            columns={bottleneckColumns({ showRep: false })}
            expandable={(r) => <LeadTimeline lead={r} />}
          />
        )}
      </Card>
    </>
  );
}
