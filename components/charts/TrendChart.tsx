'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthPoint } from '@/types';

const MON: Record<string, string> = {
  '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-mono text-faint">{MON[String(label).slice(5)] ?? label}</div>
      <div className="font-mono font-semibold text-text">{payload[0].value} delivered</div>
    </div>
  );
}

export function TrendChart({ data }: { data: MonthPoint[] }) {
  return (
    <div className="h-[150px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="dp-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-500)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--primary-500)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tickFormatter={(m) => MON[String(m).slice(5)] ?? m}
            tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-faint)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-faint)' }}
            axisLine={false}
            tickLine={false}
            width={26}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)' }} />
          <Area
            type="monotone"
            dataKey="delivered"
            stroke="var(--primary-500)"
            strokeWidth={2.5}
            fill="url(#dp-area)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary-500)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
