'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useRange } from '@/lib/useFilters';
import type { RepDetail } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { TimeRange, appendRange } from '@/components/TimeRange';
import { RepDashboard } from '@/components/RepDashboard';
import { ErrorState } from '@/components/ui/EmptyState';

export default function RepPage({ params }: { params: { id: string } }) {
  const [range, setRange] = useRange();
  const id = params.id.toUpperCase();
  const { data, error, loading } = useApi<RepDetail>(appendRange(`/reps/${id}`, range));

  return (
    <>
      <PageHeader
        title={data ? data.name : 'Rep'}
        icon={<Users size={18} />}
        crumb={
          <>
            <Link href="/reps" className="hover:text-primary">
              Sales reps
            </Link>{' '}
            / {data?.branch ?? ''}
          </>
        }
      >
        <TimeRange value={range} onChange={setRange} />
      </PageHeader>

      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}
        <RepDashboard data={data} loading={loading} />
      </div>
    </>
  );
}
