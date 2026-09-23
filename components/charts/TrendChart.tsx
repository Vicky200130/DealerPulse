'use client';

import { PackageOpen } from 'lucide-react';
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '@/lib/format';
import type { MonthPoint, RepMonthPoint } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { InsightNote } from '@/components/InsightNote';

const MON: Record<string, string> = {
  '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

// Revenue axis in crores, compact so the right gutter stays narrow.
const crore = (v: number) => `${(v / 1e7).toFixed(0)}Cr`;

// A month row: the default plots delivered (bar) + revenue (line); the rep page
// reuses it to plot sold (bar) + contacted (line).
type Row = MonthPoint | RepMonthPoint;

interface Cfg {
  barKey: string;
  barLabel: string;
  barColor: string;
  lineKey: string;
  lineLabel: string;
  lineColor: string;
  lineAxisFormat: (n: number) => string;
  lineTipFormat: (n: number) => string;
}

function ChartTooltip({ active, payload, label, cfg }: any) {
  if (!active || !payload?.length) return null;
  const c = cfg as Cfg;
  const point = payload[0].payload as { by_rep?: any[]; by_branch?: any[] };
  const bar = payload.find((p: any) => p.dataKey === c.barKey);
  const line = payload.find((p: any) => p.dataKey === c.lineKey);
  const parts = point.by_rep ?? point.by_branch; // per-rep when scoped, else per-branch
  return (
    <div className="min-w-[210px] overflow-hidden rounded-sm border border-border bg-surface text-xs shadow-md">
      <div className="px-3 pt-2 pb-2">
        <div className="font-mono text-faint">{MON[String(label).slice(5)] ?? label}</div>
        {bar && <div className="mt-0.5 font-mono font-semibold text-primary">{bar.value} {c.barLabel.toLowerCase()}</div>}
        {line && <div className="font-mono font-semibold text-success">{c.lineTipFormat(line.value)} {c.lineLabel.toLowerCase()}</div>}
      </div>
      {parts && parts.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border px-3 pt-2 pb-2.5">
          {parts.map((b: any) => {
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

export function TrendChart({
  data,
  note,
  barKey = 'delivered',
  barLabel = 'Cars delivered',
  barColor = 'var(--primary-500)',
  lineKey = 'revenue',
  lineLabel = 'Revenue',
  lineColor = 'var(--success)',
  lineAxisFormat = crore,
  lineTipFormat = formatINR,
}: {
  data: Row[];
  note?: React.ReactNode;
  barKey?: string;
  barLabel?: string;
  barColor?: string;
  lineKey?: string;
  lineLabel?: string;
  lineColor?: string;
  lineAxisFormat?: (n: number) => string;
  lineTipFormat?: (n: number) => string;
}) {
  const cfg: Cfg = { barKey, barLabel, barColor, lineKey, lineLabel, lineColor, lineAxisFormat, lineTipFormat };
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <EmptyState title="No data yet" hint="Try a wider time range" icon={<PackageOpen size={20} strokeWidth={1.75} />} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* legend — which mark is which */}
      <div className="mb-1.5 flex items-center gap-4 text-2xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: barColor }} />
          {barLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-3.5 rounded-pill" style={{ background: lineColor }} />
          {lineLabel}
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
            {/* left axis — the bar series (count) */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-faint)' }}
              axisLine={false}
              tickLine={false}
              width={26}
            />
            {/* right axis — the line series, its own scale */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={lineAxisFormat}
              tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-faint)' }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip content={<ChartTooltip cfg={cfg} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar yAxisId="left" dataKey={barKey} fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={lineKey}
              stroke={lineColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {note && <InsightNote>{note}</InsightNote>}
    </div>
  );
}
