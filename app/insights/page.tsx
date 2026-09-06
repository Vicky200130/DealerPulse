'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import { SOURCE_LABELS, type InsightsResp, type Signal, type WhatIf } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { BranchFilter } from '@/components/BranchFilter';
import { TimeRange, appendBranch, appendRange, type RangeKey } from '@/components/TimeRange';
import { Card } from '@/components/ui/Card';
import { ReasonBars } from '@/components/ReasonBars';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';

// Severity -> the class + colour bits each signal card uses. One place so the
// three variants stay in lockstep.
const SEV = {
  critical: { bar: 'bg-danger', tag: 'bg-danger-soft text-danger', value: 'text-danger' },
  warning: { bar: 'bg-warning', tag: 'bg-warning-soft text-warning', value: 'text-warning' },
  good: { bar: 'bg-success', tag: 'bg-success-soft text-success', value: 'text-success' },
} as const;

// Funnel-stage fill colours for the leak map — a hot→warm ramp so the eye reads
// "earliest, biggest leak" at the top.
const LEAK_FILL: Record<string, string> = {
  new: 'var(--danger)',
  contacted: 'oklch(58% 0.15 35)',
  test_drive: 'oklch(58% 0.13 55)',
  negotiation: 'var(--warning)',
};

function SignalCard({ s }: { s: Signal }) {
  const c = SEV[s.severity];
  return (
    <div className="dp-rise relative overflow-hidden rounded-lg bg-surface pl-md pr-md py-md shadow-[var(--shadow-card)]">
      <span className={`absolute left-0 top-md bottom-md w-1 rounded-pill ${c.bar}`} />
      <div className="pl-sm">
        <span className={`inline-block rounded-pill px-2 py-0.5 text-3xs font-bold uppercase tracking-wider ${c.tag}`}>
          {s.tag}
        </span>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className={`font-mono text-3xl font-semibold leading-none ${c.value}`}>{s.value}</span>
          <span className="text-sm font-semibold text-muted">{s.unit}</span>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-text">{s.verdict}</p>
        <p className="mt-3 flex items-baseline gap-1.5 text-xs text-muted">
          <span className="font-bold text-primary">→</span>
          <span><b className="font-semibold text-text">Do:</b> {s.action}</span>
        </p>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [range, setRange] = useState<RangeKey>('all');
  const [branch, setBranch] = useState('');
  const { data, error, loading } = useApi<InsightsResp>(appendBranch(appendRange('/insights', range), branch));
  const [lift, setLift] = useState(10);
  const { data: wi } = useApi<WhatIf>(appendBranch(appendRange(`/whatif?lift=${lift}`, range), branch));

  const leakRows = (data?.leak.rows ?? []).filter((r) => r.value > 0);
  const leakMax = Math.max(...leakRows.map((r) => r.value), 1);
  const topLeak = leakRows.reduce((a, b) => (b.value > a.value ? b : a), leakRows[0] ?? null);

  const sources = data?.source_quality ?? [];
  const best = sources[0];
  const worst = sources[sources.length - 1];
  const gap = best && worst && worst.rate > 0 ? Math.round(best.rate / worst.rate) : 0;

  return (
    <>
      <PageHeader title="Insights & Actions" subtitle="What the numbers say — and what to do about it" icon={<Sparkles size={18} />}>
        <BranchFilter value={branch} onChange={setBranch} />
        <TimeRange value={range} onChange={setRange} />
      </PageHeader>

      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

        {/* 1 — Signal cards: the decisions to make, not the data to read. */}
        <section>
          <h2 className="mb-sm text-2xs font-bold uppercase tracking-[0.08em] text-faint">
            What needs a decision
          </h2>
          {loading || !data ? (
            <div className="grid gap-md md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : data.signals.length ? (
            <div className="grid gap-md md:grid-cols-2">
              {data.signals.map((s, i) => <SignalCard key={i} s={s} />)}
            </div>
          ) : (
            <Card><EmptyState title="No standout signals for this period" hint="Try a wider time range" /></Card>
          )}
        </section>

        {/* 2 — Where the revenue actually leaks. */}
        <section>
          <h2 className="mb-sm text-2xs font-bold uppercase tracking-[0.08em] text-faint">
            Where the revenue leaks
          </h2>
          <Card
            title={data ? `${formatINR(data.leak.total_value)} lost — and where in the funnel it happened` : 'Where the revenue leaks'}
            hint="by deepest stage reached"
          >
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : leakRows.length ? (
              <>
                <div className="flex flex-col gap-3">
                  {leakRows.map((r, i) => (
                    <div
                      key={r.stage}
                      style={{ animationDelay: `${i * 55}ms` }}
                      className="dp-rise grid grid-cols-[120px_1fr_84px] sm:grid-cols-[160px_1fr_96px] items-center gap-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-text">{r.label}</div>
                        <div className="truncate text-2xs text-faint">{r.desc}</div>
                      </div>
                      <div className="h-8 overflow-hidden rounded bg-surface-2">
                        <div
                          className="flex h-full items-center justify-end rounded px-2.5 text-xs font-semibold text-white"
                          style={{ width: `${(r.value / leakMax) * 100}%`, background: LEAK_FILL[r.stage] ?? 'var(--danger)' }}
                        >
                          <span className="whitespace-nowrap">{r.count} deals</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-base font-bold text-text">{formatINR(r.value)}</div>
                        <div className="text-2xs text-faint">{pct(r.share)} of loss</div>
                      </div>
                    </div>
                  ))}
                </div>
                {topLeak && (
                  <p className="mt-3.5 border-t border-border pt-3 text-xs text-muted">
                    The biggest bucket, <b className="font-mono font-semibold text-danger">{formatINR(topLeak.value)}</b>,
                    leaked at <b className="text-text">“{topLeak.label}”</b>.{' '}
                    {topLeak.stage === 'new'
                      ? 'These are leads no one ever called — the fix costs nothing, it’s process, not price.'
                      : 'That’s where to focus recovery.'}
                  </p>
                )}
              </>
            ) : (
              <EmptyState title="No lost deals in this period" hint="Try a wider time range" />
            )}
          </Card>
        </section>

        {/* 3 — Hidden pattern -> the move. */}
        <section>
          <h2 className="mb-sm text-2xs font-bold uppercase tracking-[0.08em] text-faint">
            Hidden pattern → the move
          </h2>
          <div className="grid gap-md lg:grid-cols-2">
            <Card title="Where the buyers really come from">
              {loading || !data ? (
                <Skeleton className="h-44 w-full" />
              ) : best && worst ? (
                <>
                  <p className="text-sm text-text">
                    {SOURCE_LABELS[best.source] ?? best.source} leads convert{' '}
                    <b className="text-success">{pct(best.rate)}</b>; {(SOURCE_LABELS[worst.source] ?? worst.source).toLowerCase()} leads just{' '}
                    <b className="text-danger">{pct(worst.rate)}</b>
                    {gap >= 2 && <> — a <b className="text-text">{gap}×</b> gap</>}.
                  </p>
                  <div className="mt-3">
                    <ReasonBars
                      color="primary"
                      items={sources.map((s) => ({
                        label: SOURCE_LABELS[s.source] ?? s.source,
                        value: Math.round(s.rate * 100),
                        display: pct(s.rate),
                      }))}
                    />
                  </div>
                  <p className="mt-3 rounded bg-surface-2 px-2.5 py-2 text-xs text-muted">
                    <span className="font-bold text-primary">→</span>{' '}
                    <b className="text-text">Do:</b> staff the floor for {(SOURCE_LABELS[best.source] ?? best.source).toLowerCase()} &amp; push referrals; rethink low-yield channels.
                  </p>
                </>
              ) : (
                <EmptyState title="No source data yet" hint="Try a wider time range" />
              )}
            </Card>

            <Card title="The money already left">
              {loading || !data ? (
                <Skeleton className="h-44 w-full" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-semibold text-text">{formatINR(data.kpis.cold_value)}</span>
                    <span className="text-sm font-semibold text-muted">in cold open deals now</span>
                  </div>
                  <p className="mt-3 rounded bg-surface-2 px-2.5 py-2 text-xs text-muted">
                    Pipeline hygiene today is fine — the real losses, <b className="text-text">{formatINR(data.leak.total_value)}</b>,
                    already happened <b className="text-text">upstream at first contact.</b>
                  </p>
                  <p className="mt-2.5 rounded bg-surface-2 px-2.5 py-2 text-xs text-muted">
                    So the priority isn’t chasing stuck deals — it’s never dropping a new lead again.
                  </p>
                </>
              )}
            </Card>
          </div>
        </section>

        {/* 4 — What-if simulator: a lightweight scenario tool, kept below the verdict. */}
        <section>
          <h2 className="mb-sm text-2xs font-bold uppercase tracking-[0.08em] text-faint">
            Model a scenario
          </h2>
          <Card title="What-if simulator" hint="drag to model impact">
            {!wi ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid gap-lg md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted">
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
                  <div className="flex justify-between font-mono text-xs text-faint">
                    <span>0%</span>
                    <span>+{lift}%</span>
                    <span>+25%</span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2.5">
                    <span className="font-mono text-3xl font-semibold leading-none text-success">
                      +{formatINR(wi.additional_revenue)}
                    </span>
                    <span className="text-sm font-semibold text-muted">≈ +{wi.additional_orders} more cars</span>
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
                  <p className="mt-3 rounded bg-surface-2 px-2.5 py-2 text-xs text-faint">
                    Illustrative — applies the chosen lift to the test-drive cohort at the average deal value (
                    {formatINR(wi.avg_deal_value)}).
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
