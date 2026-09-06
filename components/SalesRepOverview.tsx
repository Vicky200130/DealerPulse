'use client';

import { Users } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { useRange } from '@/lib/useFilters';
import type { RepDetail } from '@/types';
import { PageHeader } from './PageHeader';
import { TimeRange, appendRange } from './TimeRange';
import { RepDashboard } from './RepDashboard';
import { ErrorState } from './ui/EmptyState';

/**
 * A sales executive's own Overview — their personal performance dashboard, with
 * no branch/rep filters (they only ever see themselves). Reuses RepDashboard so
 * it matches the rep drill-down exactly. Rendered by the Overview page when the
 * current view is the sales_rep role.
 */
export function SalesRepOverview({ repId }: { repId: string }) {
  const [range, setRange] = useRange();
  const { data, error, loading } = useApi<RepDetail>(appendRange(`/reps/${repId}`, range));

  return (
    <>
      <PageHeader
        title={data?.name ?? 'My performance'}
        icon={<Users size={18} />}
        subtitle={data ? `${data.role.replace('_', ' ')} · ${data.branch}` : 'My performance'}
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
