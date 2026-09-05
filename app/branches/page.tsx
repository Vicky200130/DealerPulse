'use client';

import Link from 'next/link';
import { useApi } from '@/lib/useApi';
import { pct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { BranchHealth } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

const stripe: Record<string, string> = { good: 'bg-success', warning: 'bg-warning', critical: 'bg-danger' };
const pill: Record<string, string> = {
  good: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-danger-soft text-danger',
};

export default function BranchesPage() {
  const { data, error, loading } = useApi<BranchHealth[]>('/branches');
  return (
    <>
      <PageHeader title="Branches" crumb="Toyota Dealer Group" />
      <div className="p-lg">
        {error && <ErrorState error={error} />}
        {loading || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
            {data.map((b) => (
              <Link
                key={b.id}
                href={`/branches/${b.id}`}
                className="relative rounded border border-border bg-surface p-md transition-colors duration-fast hover:bg-surface-2"
              >
                <span className={cn('absolute left-0 top-md bottom-md w-[3px] rounded-pill', stripe[b.status])} />
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{b.name}</div>
                  <span className={cn('rounded-pill px-2 py-0.5 text-[10.5px] font-bold font-mono', pill[b.status])}>
                    {b.status === 'critical' ? 'Critical' : b.status === 'warning' ? 'Behind' : 'Healthy'}
                  </span>
                </div>
                <div className="text-xs text-faint">{b.city}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-sm">
                  <div>
                    <div className="text-[10px] uppercase text-faint">Units</div>
                    {b.delivered}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-faint">Attain</div>
                    {pct(b.attainment)}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-faint">Cold</div>
                    {b.cold_leads}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
