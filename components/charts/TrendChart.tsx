'use client';

import { PackageOpen } from 'lucide-react';
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthPoint } from '@/types';
import { formatINR } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { InsightNote } from '@/components/InsightNote';

const MON: Record<string, string> = {
  '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

// Revenue axis in crores, compact so the right gutter stays narrow.
const crore = (v: number) => `${(v / 1e7).toFixed(0)}Cr`;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as MonthPoint; // full month row
  const delivered = payload.find((p: any) => p.dataKey === 'delivered');
  const revenue = payload.find((p: any) => p.dataKey === 'revenue');
  const parts = point.by_rep ?? point.by_branch; // per-rep when scoped, else per-branch
  return (
    <div className="min-w-[210px] overflow-hidden rounded-sm border border-border bg-surface text-xs shadow-md">
      <div className="px-3 pt-2 pb-2">
        <div className="font-mono text-faint">{MON[String(label).slice(5)] ?? label}</div>
        {delivered && <div className="mt-0.5 font-mono font-semibold text-primary">{delivered.value} delivered</div>}
        {revenue && <div className="font-mono font-semibold text-success">{formatINR(revenue.value)}</div>}
      </div>
      {parts && parts.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 pt-2 pb-2.5">
          {parts.map((b) => {
            const nm = ('rep' in b ? b.rep : b.branch) ?? '';
            return (
              <div key={nm} className="flex items-center justify-between gap-6">
                <span className="text-muted">{nm}</span>
                <span className="font-mono font-semibold tabular-nums">
                  {b.count} · <span className="text-success">{formatINR(b.revenue)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TrendChart({ data, note }: { data: MonthPoint[]; note?: React.ReactNode }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <EmptyState title="No deliveries yet" hint="Try a wider time range" icon={<PackageOpen size={20} strokeWidth={1.75} />} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* legend — which mark is which */}
      <div className="mb-1.5 flex items-center gap-4 text-2xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-primary" />
          Cars delivered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-3.5 rounded-pill bg-success" />
          Revenue
        </span>
      </div>

      <div className="min-h-[200px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tickFormatter={(m) => MON[String(m).slice(5)] ?? m}
              tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-faint)' }}
              axisLine={false}
              tickLine={false}
            />
            {/* left axis — cars delivered (count) */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-faint)' }}
              axisLine={false}
              tickLine={false}
              width={26}
            />
            {/* right axis — revenue (₹ crore), its own scale */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={crore}
              tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-faint)' }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar
              yAxisId="left"
              dataKey="delivered"
              fill="var(--primary-500)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="var(--success)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--success)' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {note && <InsightNote>{note}</InsightNote>}
    </div>
  );
}
