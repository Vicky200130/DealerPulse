'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import type { BranchDetail, BranchHealth, Bottleneck, RepRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card } from '@/components/ui/Card';
import { Funnel } from '@/components/Funnel';
import { DataTable } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { bottleneckColumns } from '@/components/leadColumns';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

export default function BranchPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id.toUpperCase();
  const { data, error, loading } = useApi<BranchDetail>(`/branches/${id}`);
  const { data: branches } = useApi<BranchHealth[]>('/branches');

  const contactStep = data?.funnel.find((f) => f.stage === 'contacted');
  const leak = contactStep?.drop ?? null;

  return (
    <>
      <PageHeader
        title={data ? `${data.name} · ${data.city}` : 'Branch'}
        crumb={
          <>
            <Link href="/branches" className="hover:text-primary">
              Branches
            </Link>{' '}
            / {data?.name ?? id}
          </>
        }
      >
        {branches && (
          <Select
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
                label="Delivered"
                value={data.kpis.cars_delivered}
                sub={`${data.kpis.total_leads} leads`}
              />
              <KpiCard stripe="warning" label="Conversion" value={pct(data.kpis.conversion)} sub={`group ${pct(data.group_conversion)}`} />
              <KpiCard stripe="warning" label="Attainment" value={pct(data.kpis.attainment ?? 0)} sub={`target ${data.kpis.target_units}`} />
              <KpiCard stripe="success" label="Revenue" value={formatINR(data.kpis.revenue_booked)} sub="booked" />
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

          <Card title="Reps at this branch" hint={data ? `${data.reps.length} reps` : ''}>
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <DataTable<RepRow>
                rows={data.reps}
                getKey={(r) => r.id}
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
