'use client';

import { useState } from 'react';
import { AlertTriangle, Car, Clock, Gauge } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import type { DeliveriesResp, ModelRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { BranchFilter } from '@/components/BranchFilter';
import { TimeRange, appendBranch, appendRange, rangeLabel, type RangeKey } from '@/components/TimeRange';
import { KpiCard } from '@/components/KpiCard';
import { CountUp } from '@/components/CountUp';
import { Card } from '@/components/ui/Card';
import { ReasonBars } from '@/components/ReasonBars';
import { DataTable } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

const intFmt = (n: number) => String(Math.round(n));
// Keeps one decimal without forcing a trailing .0 (12 → "12", 12.5 → "12.5").
const dp1 = (n: number) => String(Math.round(n * 10) / 10);

export default function DeliveriesPage() {
  const [range, setRange] = useState<RangeKey>('all');
  const [branch, setBranch] = useState('');
  const { data, error, loading } = useApi<DeliveriesResp>(appendBranch(appendRange('/deliveries', range), branch));
  const a = data?.analysis;
  const topRev = data ? [...data.model_mix].sort((x, y) => y.revenue - x.revenue)[0] : undefined;

  return (
    <>
      <PageHeader title="Deliveries & Demand" subtitle="Delivery times and model demand">
        <BranchFilter value={branch} onChange={setBranch} />
        <TimeRange value={range} onChange={setRange} />
      </PageHeader>
      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

        <div className="grid grid-cols-2 gap-md md:grid-cols-4">
          {loading || !a ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard tone="primary" icon={<Car size={16} />} label="Cars delivered" value={<CountUp value={a.total} format={intFmt} />} sub={rangeLabel(range)} />
              <KpiCard tone="warning" icon={<Clock size={16} />} label="On-time rate" value={<CountUp value={a.on_time_rate} format={(n) => pct(n)} />} sub={`${a.delayed} ran late`} />
              <KpiCard tone="success" icon={<Gauge size={16} />} label="On-time speed" value={<CountUp value={a.avg_days_on_time} format={dp1} />} unit="days" />
              <KpiCard alarm icon={<AlertTriangle size={16} />} label="When delayed" value={<CountUp value={a.avg_days_delayed} format={dp1} />} unit="days" sub="nearly 2× slower" />
            </>
          )}
        </div>

        <div className="grid gap-md lg:grid-cols-2">
          <Card title="Why deliveries slip" hint={a ? `${a.delayed} delayed` : ''}>
            {loading || !a ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ReasonBars color="danger" items={a.delay_reasons.map((r) => ({ label: r.reason, value: r.count }))} />
            )}
          </Card>

          <Card title="What people actually buy" hint="leads · won · avg price">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <DataTable<ModelRow>
                rows={data.model_mix}
                getKey={(r) => r.model}
                columns={[
                  {
                    key: 'model',
                    header: 'Model',
                    render: (r) => (
                      <span className="font-semibold">
                        {r.model}
                        {topRev && r.model === topRev.model && (
                          <Badge tone="success" className="ml-2">
                            top revenue
                          </Badge>
                        )}
                      </span>
                    ),
                  },
                  { key: 'leads', header: 'Leads', align: 'right', sortable: true, sortValue: (r) => r.leads, render: (r) => <span className="font-mono">{r.leads}</span> },
                  { key: 'delivered', header: 'Won', align: 'right', sortable: true, sortValue: (r) => r.delivered, render: (r) => <span className="font-mono">{r.delivered}</span> },
                  { key: 'avg_price', header: 'Avg price', align: 'right', sortable: true, sortValue: (r) => r.avg_price, render: (r) => <span className="font-mono">{formatINR(r.avg_price)}</span> },
                ]}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
