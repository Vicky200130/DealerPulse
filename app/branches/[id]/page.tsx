'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Building2, Car, Gauge, IndianRupee, MapPin, Target, User, Users } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import { SOURCE_LABELS } from '@/types';
import type { BranchDetail, BranchHealth, Bottleneck, RepRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { PipelineForecast } from '@/components/PipelineForecast';
import { TimeRange, appendRange, type RangeKey } from '@/components/TimeRange';
import { KpiCard } from '@/components/KpiCard';
import { CountUp } from '@/components/CountUp';
import { Card } from '@/components/ui/Card';
import { Funnel } from '@/components/Funnel';
import { RankedBars } from '@/components/RankedBars';
import { DataTable } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { bottleneckColumns } from '@/components/leadColumns';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

const intFmt = (n: number) => String(Math.round(n));

export default function BranchPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('all');
  const id = params.id.toUpperCase();
  const { data, error, loading } = useApi<BranchDetail>(appendRange(`/branches/${id}`, range));
  const { data: branches } = useApi<BranchHealth[]>('/branches');

  const contactStep = data?.funnel.find((f) => f.stage === 'contacted');
  const leak = contactStep?.drop ?? null;

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

        <div className="grid grid-cols-2 gap-md md:grid-cols-4">
          {loading || !data ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
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
              <KpiCard tone="warning" icon={<Target size={16} />} label="Conversion" value={<CountUp value={data.kpis.conversion} format={(n) => pct(n)} />} sub={`group ${pct(data.group_conversion)}`} />
              <KpiCard tone="warning" icon={<Gauge size={16} />} label="Attainment" value={<CountUp value={data.kpis.attainment ?? 0} format={(n) => pct(n)} />} sub={`target ${data.kpis.target_units}`} />
              <KpiCard tone="success" icon={<IndianRupee size={16} />} label="Revenue" value={<CountUp value={data.kpis.revenue_booked} format={formatINR} />} sub="booked" />
            </>
          )}
        </div>

        {/* Pipeline forecast — full-width row of how this branch's open deals are
            projected to resolve, and the revenue still winnable. */}
        <Card title="Pipeline forecast" hint="projected from open deals">
          {loading || !data ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <PipelineForecast f={data.pipeline_forecast} runRate={data.forecast} />
          )}
        </Card>

        {/* Then the deals to act on today, full-width so the table has room. */}
        <Card title="Stuck deals — act today" hint={data ? `${data.cold_categories.follow_up.count} to follow up · ${data.cold_categories.delivery.count} deliveries · ${data.cold_categories.stale.count} likely dead` : ''}>
          {loading || !data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <DataTable<Bottleneck>
              rows={data.cold_leads}
              getKey={(r) => r.id}
              empty="No cold leads — nice."
              columns={bottleneckColumns({ showRep: true })}
            />
          )}
        </Card>

        {/* Where leads leak + how each rep is performing, side by side. */}
        <div className="grid gap-md lg:grid-cols-[1fr_1.6fr]">
          <Card title="Where this branch loses leads" hint={data ? `${data.kpis.total_leads} leads` : ''}>
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <Funnel
                steps={data.funnel}
                note={
                  leak != null && leak > 0.3
                    ? `${Math.round(leak * 100)}% of leads are never contacted — a follow-up problem, not a demand problem.`
                    : undefined
                }
              />
            )}
          </Card>

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
                    render: (r) => (
                      <div className="flex items-center gap-2">
                        <Link href={`/reps/${r.id}`} className="font-semibold hover:text-primary">
                          {r.name}
                        </Link>
                        <Badge tone={r.conversion < 0.1 ? 'danger' : r.conversion < 0.2 ? 'warning' : 'success'} mono>
                          {pct(r.conversion)}
                        </Badge>
                        {r.needs_coaching && <Badge tone="warning">Coach</Badge>}
                      </div>
                    ),
                  },
                  { key: 'delivered', header: 'Delivered', align: 'right', sortable: true, sortValue: (r) => r.delivered, render: (r) => <span className="font-mono">{r.delivered}</span> },
                  {
                    key: 'contact_rate',
                    header: 'Contacted',
                    align: 'right',
                    sortable: true,
                    sortValue: (r) => r.contact_rate,
                    render: (r) => <span className={`font-mono ${r.contact_rate < 0.65 ? 'text-danger' : 'text-muted'}`}>{pct(r.contact_rate)}</span>,
                  },
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
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
