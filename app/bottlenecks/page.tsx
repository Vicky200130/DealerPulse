'use client';

import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR } from '@/lib/format';
import type { Bottleneck, BottleneckResult } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { bottleneckColumns } from '@/components/leadColumns';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { downloadCSV } from '@/lib/csv';

type Idle = '1' | '3' | '7' | '14';

export default function BottlenecksPage() {
  const [idle, setIdle] = useState<Idle>('7');
  const [q, setQ] = useState('');
  const { data, error, loading } = useApi<BottleneckResult>(`/bottlenecks?idle=${idle}`);

  const rows = useMemo(() => {
    if (!data) return [];
    if (!q) return data.rows;
    const s = q.toLowerCase();
    return data.rows.filter((r) => `${r.customer_name} ${r.model} ${r.rep}`.toLowerCase().includes(s));
  }, [data, q]);

  const exportCSV = () =>
    downloadCSV('dealerpulse-bottlenecks.csv', rows as unknown as Record<string, unknown>[], [
      { key: 'customer_name', header: 'Customer' },
      { key: 'model', header: 'Model' },
      { key: 'status', header: 'Stage' },
      { key: 'deal_value', header: 'Deal value' },
      { key: 'health', header: 'Health' },
      { key: 'next_best_action', header: 'Next best action' },
      { key: 'rep', header: 'Rep' },
      { key: 'branch', header: 'Branch' },
      { key: 'idle_days', header: 'Idle days' },
    ]);

  return (
    <>
      <PageHeader title="Actionable Bottlenecks" crumb="Toyota Dealer Group">
        <Button onClick={exportCSV} disabled={!rows.length}>
          <Download size={13} />
          Export CSV
        </Button>
      </PageHeader>

      <div className="p-lg flex flex-col gap-md">
        {error && <ErrorState error={error} />}

        {data && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-sm bg-danger-soft px-3.5 py-2.5 text-[12.5px]">
            <span className="font-mono font-semibold text-danger">{data.count}</span> deals idle {idle}+ days
            <span className="text-danger/40">·</span>
            <span className="font-mono font-semibold text-danger">{formatINR(data.value_at_risk)}</span> capital at risk
            <span className="text-danger/40">·</span>
            <span className="text-danger">{data.urgent} need a manager or reassignment</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Idle>
            value={idle}
            onChange={setIdle}
            options={[
              { label: '1d+', value: '1' },
              { label: '3d+', value: '3' },
              { label: '7d+', value: '7' },
              { label: '14d+', value: '14' },
            ]}
          />
          <div className="ml-auto flex min-w-[200px] items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-1.5 text-xs">
            <Search size={13} className="text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customer, model, rep…"
              className="w-full bg-transparent text-text outline-none placeholder:text-faint"
            />
          </div>
        </div>

        <Card>
          {loading || !data ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <DataTable<Bottleneck>
              rows={rows}
              getKey={(r) => r.id}
              empty="No bottlenecks at this threshold."
              columns={bottleneckColumns()}
            />
          )}
        </Card>
      </div>
    </>
  );
}
