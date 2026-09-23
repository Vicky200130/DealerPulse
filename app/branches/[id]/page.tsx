'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Building2, Car, Gauge, IndianRupee, Layers, MapPin, Target, User, Users } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useRange } from '@/lib/useFilters';
import { useRequireAdmin } from '@/lib/view';
import { formatINR, frac, pct } from '@/lib/format';
import { SOURCE_LABELS } from '@/types';
import type { BranchDetail, BranchHealth, Bottleneck, RepRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { PipelineForecast } from '@/components/PipelineForecast';
import { TimeRange, appendRange } from '@/components/TimeRange';
import { KpiCard } from '@/components/KpiCard';
import { CountUp } from '@/components/CountUp';
import { Card } from '@/components/ui/Card';
import { Funnel } from '@/components/Funnel';
import { TrendChart } from '@/components/charts/TrendChart';
import { RankedBars } from '@/components/RankedBars';
import { DataTable } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { bottleneckColumns } from '@/components/leadColumns';
import { LeadTimeline } from '@/components/LeadTimeline';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

const intFmt = (n: number) => String(Math.round(n));

export default function BranchPage({ params }: { params: { id: string } }) {
  const ok = useRequireAdmin();
  const router = useRouter();
  const [range, setRange] = useRange();
  const id = params.id.toUpperCase();
  const { data, error, loading } = useApi<BranchDetail>(appendRange(`/branches/${id}`, range));
  const { data: branches } = useApi<BranchHealth[]>('/branches');

  if (!ok) return null; // non-admin roles are redirected to Overview

  return (
    <>
      <PageHeader
        title={data ? data.name : 'Branch'}
        icon={<Building2 size={18} />}
        subtitle={
          data ? (
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} className="shrink-0" />
                {data.city}
              </span>
              {data.manager && (
                <span className="inline-flex items-center gap-1.5">
                  <User size={13} className="shrink-0" />
                  Managed by {data.manager}
                </span>
              )}
            </span>
          ) : undefined
        }
        crumb={
          <>
            <Link href="/branches" className="hover:text-primary">
              Branches
            </Link>{' '}
            / {data?.name ?? id}
          </>
        }
      >
        <TimeRange value={range} onChange={setRange} />
        {branches && (
          <Dropdown
            value={id}
            onChange={(v) => router.push(`/branches/${v}`)}
            options={branches.map((b) => ({ label: b.name, value: b.id }))}
          />
        )}
      </PageHeader>

      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

        <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-5">
          {loading || !data ? (
            Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                alarm={(data.kpis.attainment ?? 0) < 0.05}
                tone="primary"
                icon={<Car size={16} />}
                label="Cars delivered"
                value={<CountUp value={data.kpis.cars_delivered} format={intFmt} />}
                sub={`${data.kpis.total_leads} leads`}
              />
              <KpiCard tone="primary" icon={<Layers size={16} />} label="Open deals" value={<CountUp value={data.kpis.open_leads} format={intFmt} />} sub="in the pipeline now" />
              <KpiCard tone="warning" icon={<Target size={16} />} label="Conversion" value={<CountUp value={data.kpis.conversion} format={(n) => pct(n)} />} sub={`${data.kpis.won_leads + data.kpis.committed_leads} of ${data.kpis.total_leads} became a sale · group ${pct(data.group_conversion)}`} />
              <KpiCard tone="warning" icon={<Gauge size={16} />} label="Target progress" value={<CountUp value={data.kpis.attainment ?? 0} format={(n) => pct(n)} />} sub={`${data.kpis.cars_delivered} of ${data.kpis.target_units} · stretch target`} />
              <KpiCard tone="success" icon={<IndianRupee size={16} />} label="Revenue" value={<CountUp value={data.kpis.revenue_booked} format={formatINR} />} sub={`${pct(data.kpis.revenue_attainment ?? 0)} of ${formatINR(data.kpis.revenue_target ?? 0)} target`} />
            </>
          )}
        </div>

        {/* Pipeline forecast — full-width row of how this branch's open deals are
            projected to resolve, and the revenue still winnable. */}
        <Card title="Pipeline forecast" hint="projected from open deals">
          {loading || !data ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <PipelineForecast f={data.pipeline_forecast} />
          )}
        </Card>

        {/* Then the deals to act on today, full-width so the table has room. The
            exact same Bottlenecks table (expandable rows + full journey), so
            there's one component, not a lesser copy. */}
        <Card title="Stuck deals — act today" hint={data ? `${data.cold_categories.follow_up.count} active · ${data.cold_categories.delivery.count} deliveries · ${data.cold_categories.stale.count} likely dead` : ''}>
          {loading || !data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted">Open deals in this branch, quiet 7+ days.</p>
                <Link href={`/bottlenecks?branch=${id}`} className="whitespace-nowrap text-xs font-semibold text-primary hover:underline">
                  View all in Bottlenecks →
                </Link>
              </div>
              <DataTable<Bottleneck>
                rows={data.cold_leads}
                getKey={(r) => r.id}
                empty="No cold leads — nice."
                columns={bottleneckColumns({ showRep: true })}
                expandable={(r) => <LeadTimeline lead={r} />}
              />
            </>
          )}
        </Card>

        {/* Branch reps — a full-width list; a CEO already knows reps carry no
            per-rep target, so "of N" needs no footnote. */}
        <Card title="Branch Representatives" hint={data ? `${data.reps.length} reps` : ''}>
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <DataTable<RepRow>
                rows={data.reps}
                getKey={(r) => r.id}
                rowHref={(r) => `/reps/${r.id}`}
                columns={[
                  {
                    key: 'name',
                    header: 'Rep',
                    // The % reads as a plain fraction that carries what it's a share
                    // of: "Sold" counts became-a-sale (delivered + ordered) — one
                    // rule app-wide — over leads assigned (NOT a target). This panel
                    // is narrow, so the two fractions stack under the name.
                    render: (r) => (
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/reps/${r.id}`} className="font-semibold hover:text-primary">
                            {r.name}
                          </Link>
                          {r.needs_coaching && <Badge tone="warning">Coach</Badge>}
                        </div>
                        <div className="mt-0.5 flex flex-col gap-0.5 text-xs">
                          <span className={`font-mono ${r.conversion < 0.2 ? 'text-danger' : 'text-muted'}`}>{frac(r.sold, r.leads, 'Sold')}</span>
                          <span className={`font-mono ${r.contact_rate < 0.65 ? 'text-danger' : 'text-faint'}`}>{frac(r.contacted, r.leads, 'Contacted')}</span>
                        </div>
                      </div>
                    ),
                  },
                  { key: 'delivered', header: 'Delivered', align: 'right', sortable: true, sortValue: (r) => r.delivered, render: (r) => <span className="font-mono">{r.delivered}</span> },
                  { key: 'active', header: 'Active', align: 'right', sortable: true, sortValue: (r) => r.active, render: (r) => <span className="font-mono">{r.active}</span> },
                  {
                    key: 'cold',
                    header: 'Cold',
                    align: 'right',
                    sortable: true,
                    sortValue: (r) => r.cold,
                    render: (r) =>
                      r.cold > 0 ? (
                        <Badge tone="warning" mono>
                          {r.cold}
                        </Badge>
                      ) : (
                        <span className="font-mono text-faint">0</span>
                      ),
                  },
                  { key: 'revenue', header: 'Revenue', align: 'right', sortable: true, sortValue: (r) => r.revenue, render: (r) => <span className="font-mono font-semibold">{formatINR(r.revenue)}</span> },
                  {
                    key: 'cold_value',
                    header: 'At risk',
                    align: 'right',
                    sortable: true,
                    sortValue: (r) => r.cold_value,
                    render: (r) =>
                      r.cold_value > 0 ? (
                        <span className="font-mono text-warning">{formatINR(r.cold_value)}</span>
                      ) : (
                        <span className="font-mono text-faint">—</span>
                      ),
                  },
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

        {/* Where leads leak, and the branch's monthly output trend, side by side. */}
        <div className="grid gap-md lg:grid-cols-2">
          <Card title="Where this branch loses leads" hint={data ? `${data.kpis.total_leads} leads` : ''}>
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
                    ? `${never} of ${total} leads (${pct(never / total)}) were never contacted — a follow-up problem, not a demand problem.`
                    : undefined;
                })()}
              />
            )}
          </Card>

          <Card title="Deliveries & revenue" hint="per month">
            {loading || !data ? (
              <Skeleton className="h-full min-h-[200px] w-full" />
            ) : (
              <TrendChart
                data={data.monthly}
                note={(() => {
                  const ms = data.monthly;
                  if (ms.length < 2) return undefined;
                  const monthName = (ym: string) => {
                    const [y, m] = ym.split('-').map(Number);
                    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' });
                  };
                  const topDel = [...ms].sort((a, b) => b.delivered - a.delivered)[0];
                  const topRev = [...ms].sort((a, b) => b.revenue - a.revenue)[0];
                  return topDel.month === topRev.month
                    ? `${monthName(topDel.month)} was this branch's strongest month — ${topDel.delivered} cars and ${formatINR(topRev.revenue)} booked.`
                    : `${monthName(topDel.month)} delivered the most cars (${topDel.delivered}); ${monthName(topRev.month)} booked the most revenue (${formatINR(topRev.revenue)}).`;
                })()}
              />
            )}
          </Card>
        </div>

        {/* Demand: what sells and where leads come from. */}
        <div className="grid gap-md lg:grid-cols-2">
          <Card title="What people are buying" hint="top models · units delivered">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <RankedBars
                color="primary"
                unit="cars"
                emptyLabel="No cars delivered"
                emptyIcon={<Car size={20} strokeWidth={1.75} />}
                items={[...data.model_mix]
                  .sort((a, b) => b.delivered - a.delivered)
                  .slice(0, 6)
                  .map((m) => ({ label: m.model, value: m.delivered }))}
                note={(() => {
                  const ms = [...data.model_mix].sort((a, b) => b.delivered - a.delivered);
                  const totalDel = ms.reduce((a, m) => a + m.delivered, 0);
                  if (!totalDel) return undefined;
                  const top3 = ms.slice(0, 3).reduce((a, m) => a + m.delivered, 0);
                  return `${ms[0].model} is the top seller here with ${ms[0].delivered} cars. The top three make up ${Math.round((top3 / totalDel) * 100)}% of deliveries.`;
                })()}
              />
            )}
          </Card>

          <Card title="Where leads come from" hint="by volume">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <RankedBars
                color="success"
                unit="leads"
                emptyLabel="No leads yet"
                emptyIcon={<Users size={20} strokeWidth={1.75} />}
                items={[...data.source_quality]
                  .sort((a, b) => b.leads - a.leads)
                  .map((s) => ({ label: SOURCE_LABELS[s.source] ?? s.source, value: s.leads }))}
                note={(() => {
                  const ss = data.source_quality;
                  if (!ss.length) return undefined;
                  const topVol = [...ss].sort((a, b) => b.leads - a.leads)[0];
                  const bestConv = [...ss].sort((a, b) => b.rate - a.rate)[0];
                  const lbl = (x: typeof topVol) => SOURCE_LABELS[x.source] ?? x.source;
                  return topVol.source === bestConv.source
                    ? `${lbl(topVol)} brings the most leads (${topVol.leads}) and converts best (${pct(bestConv.rate)}).`
                    : `${lbl(topVol)} brings the most leads (${topVol.leads}); ${lbl(bestConv)} converts best (${pct(bestConv.rate)}).`;
                })()}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
