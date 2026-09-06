'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, MapPin, User } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { BranchHealth } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { TimeRange, appendRange, type RangeKey } from '@/components/TimeRange';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

const pill: Record<string, string> = {
  leading: 'bg-success-soft text-success',
  on_pace: 'bg-primary-100 text-primary-700',
  behind: 'bg-danger-soft text-danger',
};
// Comparative wording — the badge ranks branches against the group's pace, not
// against their (aspirational) target, so it must never read as "on track".
const statusLabel: Record<string, string> = { leading: 'Ahead of group', on_pace: 'Mid-pack', behind: 'Lagging' };

export default function BranchesPage() {
  const [range, setRange] = useState<RangeKey>('all');
  const { data, error, loading } = useApi<BranchHealth[]>(appendRange('/branches', range));
  return (
    <>
      <PageHeader title="Branches" subtitle="All 5 branches · ranked vs group pace" icon={<Building2 size={18} />}>
        <TimeRange value={range} onChange={setRange} />
      </PageHeader>
      <div className="p-lg">
        {error && <ErrorState error={error} />}
        {loading || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
            {data.map((b, i) => (
              <Link
                key={b.id}
                href={`/branches/${b.id}`}
                style={{ animationDelay: `${i * 55}ms` }}
                className="dp-rise rounded border border-border bg-surface p-md transition-colors duration-fast hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{b.name}</div>
                  <span className={cn('rounded-pill px-2 py-0.5 text-2xs font-bold font-mono', pill[b.status])}>
                    {statusLabel[b.status]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-faint">
                  <MapPin size={12} className="shrink-0" />
                  {b.city}
                </div>
                {b.manager && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-faint">
                    <User size={12} className="shrink-0" />
                    {b.manager}
                  </div>
                )}
                <div className="mt-2">
                  <div className="text-2xs uppercase text-faint">Total revenue</div>
                  <div className="font-mono text-lg font-semibold">{formatINR(b.revenue)}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-sm">
                  <div className="flex flex-col">
                    <span className="text-2xs uppercase text-faint leading-tight min-h-[24px]">Cars delivered</span>
                    {b.delivered}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xs uppercase text-faint leading-tight min-h-[24px]">Attain</span>
                    {pct(b.attainment)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xs uppercase text-faint leading-tight min-h-[24px]">Cold leads</span>
                    {b.cold_leads}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-sm bg-surface-2 px-2.5 py-2 text-xs">
                  <span className="text-faint">Projected finish</span>
                  <span className="font-mono font-semibold tabular-nums text-text">
                    ~{b.pipeline_forecast.projected_total} cars
                    <span className="ml-1.5 font-normal text-success">+{formatINR(b.pipeline_forecast.expected_additional_revenue)}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
