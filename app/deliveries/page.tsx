'use client';

import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import type { DeliveriesResp, ModelRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card } from '@/components/ui/Card';
import { ReasonBars } from '@/components/ReasonBars';
import { DataTable } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

export default function DeliveriesPage() {
  const { data, error, loading } = useApi<DeliveriesResp>('/deliveries');
  const a = data?.analysis;
  const topRev = data ? [...data.model_mix].sort((x, y) => y.revenue - x.revenue)[0] : undefined;

  return (
    <>
      <PageHeader title="Deliveries & Demand" crumb="Toyota Dealer Group" />
      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

        <div className="grid grid-cols-2 gap-md md:grid-cols-4">
          {loading || !a ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard stripe="success" label="Cars delivered" value={a.total} sub="Jun–Dec" />
              <KpiCard stripe="warning" label="On-time rate" value={pct(a.on_time_rate)} sub={`${a.delayed} ran late`} />
              <KpiCard stripe="success" label="On-time speed" value={a.avg_days_on_time} unit="days" />
              <KpiCard alarm label="When delayed" value={a.avg_days_delayed} unit="days" sub="nearly 2× slower" />
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
