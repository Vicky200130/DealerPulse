'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import type { InsightsResp, WhatIf } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { BranchFilter } from '@/components/BranchFilter';
import { TimeRange, appendBranch, appendRange, type RangeKey } from '@/components/TimeRange';
import { Card } from '@/components/ui/Card';
import { ReasonBars } from '@/components/ReasonBars';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  walk_in: 'Walk-in',
  referral: 'Referral',
  social_media: 'Social media',
  phone_enquiry: 'Phone enquiry',
  auto_expo: 'Auto expo',
};

export default function InsightsPage() {
  const [range, setRange] = useState<RangeKey>('all');
  const [branch, setBranch] = useState('');
  const { data, error, loading } = useApi<InsightsResp>(appendBranch(appendRange('/insights', range), branch));
  const [lift, setLift] = useState(10);
  const { data: wi } = useApi<WhatIf>(appendBranch(appendRange(`/whatif?lift=${lift}`, range), branch));

  return (
    <>
      <PageHeader title="Insights & Actions" subtitle="What the numbers say, and what to do">
        <BranchFilter value={branch} onChange={setBranch} />
        <TimeRange value={range} onChange={setRange} />
      </PageHeader>

      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-fg">
              <Sparkles size={15} />
            </span>
            <h3 className="text-sm font-bold">This period at a glance</h3>
            <span className="ml-auto rounded-sm border border-primary px-1.5 py-0.5 text-[11px] font-mono uppercase tracking-wide text-primary">
              Auto-summary
            </span>
          </div>
          {loading || !data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.summary.paragraphs.map((p, i) => (
                <p key={i} style={{ animationDelay: `${i * 70}ms` }} className="dp-rise text-[14px] leading-relaxed text-text">
                  {p}
                </p>
              ))}
            </div>
          )}
        </Card>

        <div className="grid gap-md lg:grid-cols-2">
          <Card title="Why we lose deals" hint={data ? `${data.summary.kpis.lost} lost` : ''}>
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ReasonBars color="danger" items={data.lost_reasons.map((r) => ({ label: r.reason, value: r.count }))} />
            )}
          </Card>
          <Card title="Which sources bring buyers" hint="delivered rate">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ReasonBars
                color="primary"
                items={data.source_quality.map((s) => ({
                  label: SOURCE_LABELS[s.source] ?? s.source,
                  value: Math.round(s.rate * 100),
                  display: pct(s.rate),
                }))}
              />
            )}
          </Card>
        </div>

        <Card title="What-if simulator" hint="drag to model impact">
          {!wi ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid gap-lg md:grid-cols-2">
              <div>
                <div className="text-[14px] text-muted">
                  If <b className="text-text">test-drive → order</b> conversion improves by{' '}
                  <b className="text-primary">+{lift} points</b> ({pct(wi.current_rate)} → {pct(wi.projected_rate)})
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={lift}
                  onChange={(e) => setLift(Number(e.target.value))}
                  className="mt-4 w-full"
                  style={{ accentColor: 'var(--primary-500)' }}
                />
                <div className="flex justify-between font-mono text-[12px] text-faint">
                  <span>0%</span>
                  <span>+{lift}%</span>
                  <span>+25%</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2.5">
                  <span className="font-mono text-[30px] font-semibold leading-none text-success">
                    +{formatINR(wi.additional_revenue)}
                  </span>
                  <span className="text-[14px] font-semibold text-muted">≈ +{wi.additional_orders} more cars</span>
                </div>
              </div>
              <div>
                <div className="mb-3 text-xs text-muted">Projected revenue vs current</div>
                <ReasonBars
                  color="success"
                  items={[
                    { label: 'Current', value: wi.current_revenue, display: formatINR(wi.current_revenue) },
                    { label: 'Modelled', value: wi.projected_revenue, display: formatINR(wi.projected_revenue) },
                  ]}
                />
                <p className="mt-3 rounded-sm bg-surface-2 px-2.5 py-2 text-xs text-faint">
                  Illustrative — applies the chosen lift to the test-drive cohort at the average deal value (
                  {formatINR(wi.avg_deal_value)}).
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
