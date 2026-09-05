'use client';

import Link from 'next/link';
import { useApi } from '@/lib/useApi';
import { pct } from '@/lib/format';
import type { Bottleneck, RepDetail } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card } from '@/components/ui/Card';
import { Funnel } from '@/components/Funnel';
import { DataTable } from '@/components/ui/Table';
import { bottleneckColumns } from '@/components/leadColumns';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

export default function RepPage({ params }: { params: { id: string } }) {
  const id = params.id.toUpperCase();
  const { data, error, loading } = useApi<RepDetail>(`/reps/${id}`);
  const initials = data ? data.name.split(' ').map((w) => w[0]).slice(0, 2).join('') : '';
  const below = data ? data.kpis.conversion < data.branch_conversion : false;

  return (
    <>
      <PageHeader
        title={data ? data.name : 'Rep'}
        crumb={
          <>
            <Link href="/reps" className="hover:text-primary">
              Sales reps
            </Link>{' '}
            / {data?.branch ?? ''}
          </>
        }
      />

      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

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
              <KpiCard stripe="warning" label="Assigned leads" value={data.kpis.leads} />
              <KpiCard alarm={data.kpis.delivered <= 1} label="Delivered" value={data.kpis.delivered} />
              <KpiCard stripe={below ? 'danger' : 'success'} label="Conversion" value={pct(data.kpis.conversion)} sub={`branch ${pct(data.branch_conversion)}`} />
              <KpiCard stripe="warning" label="Avg response" value={data.kpis.avg_response_hours} unit="hrs" />
            </>
          )}
        </div>

        <div className="grid gap-md lg:grid-cols-[1fr_1.2fr]">
          <Card title="Personal funnel" hint="leads reaching each stage">
            {loading || !data ? <Skeleton className="h-56 w-full" /> : <Funnel steps={data.funnel} />}
          </Card>
          <Card title="Open pipeline" hint={data ? `${data.pipeline.length} active` : ''}>
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <DataTable<Bottleneck>
                rows={data.pipeline}
                getKey={(r) => r.id}
                empty="No open deals."
                columns={bottleneckColumns({ showRep: false })}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
