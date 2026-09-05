'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Car, Gauge, IndianRupee, MapPin, Target, User } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import type { BranchDetail, BranchHealth, Bottleneck, RepRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { TimeRange, appendRange, type RangeKey } from '@/components/TimeRange';
import { KpiCard } from '@/components/KpiCard';
import { CountUp } from '@/components/CountUp';
import { Card } from '@/components/ui/Card';
import { Funnel } from '@/components/Funnel';
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

        <div className="grid gap-md lg:grid-cols-[1fr_1.1fr]">
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
                      <Link href={`/reps/${r.id}`} className="font-semibold hover:text-primary">
                        {r.name}
                      </Link>
                    ),
                  },
                  { key: 'leads', header: 'Leads', align: 'right', sortable: true, sortValue: (r) => r.leads, render: (r) => <span className="font-mono">{r.leads}</span> },
                  { key: 'delivered', header: 'Won', align: 'right', sortable: true, sortValue: (r) => r.delivered, render: (r) => <span className="font-mono">{r.delivered}</span> },
                  {
                    key: 'conversion',
                    header: 'Conv.',
                    align: 'right',
                    render: (r) => (
                      <Badge tone={r.conversion < 0.1 ? 'danger' : r.conversion < 0.2 ? 'warning' : 'success'} mono>
                        {pct(r.conversion)}
                      </Badge>
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

        <Card title="Cold leads — act today" hint={data ? `${data.cold_leads.length} idle 7+ days` : ''}>
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
      </div>
    </>
  );
}
