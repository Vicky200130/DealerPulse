'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Car,
  Clock,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  Snowflake,
  User,
  Users,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { formatINR, pct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { fmtDay, MONTHS_SHORT } from '@/lib/dates';
import { SOURCE_LABELS, STAGE_LABELS, type BranchStatus, type FunnelStep, type Overview } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { CountUp } from '@/components/CountUp';
import { Card } from '@/components/ui/Card';
import { Funnel } from '@/components/Funnel';
import { RankedBars } from '@/components/RankedBars';
import { TrendChart } from '@/components/charts/TrendChart';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { BranchFilter } from '@/components/BranchFilter';
import { TimeRange, appendBranch, appendRange, isPastRange, prevLabel, rangeLabel, type RangeKey } from '@/components/TimeRange';

// The rank circle carries the status colour — so the data numbers themselves
// are never coloured. Status ranks each branch against the GROUP's delivery
// pace (targets are aspirational, see the note below the table), never against
// its paper target — so the labels say "…group", not "on track".
const STATUS_CIRCLE: Record<BranchStatus, string> = {
  leading: 'bg-success-soft text-success',
  on_pace: 'bg-primary-100 text-primary-700',
  behind: 'bg-danger-soft text-danger',
};

const STATUS_PILL: Record<BranchStatus, string> = STATUS_CIRCLE;
// Explicitly comparative wording so a green pill next to a low % of target can
// never be misread as "on track to hit target".
const STATUS_LABEL: Record<BranchStatus, string> = {
  leading: 'Ahead of group',
  on_pace: 'Mid-pack',
  behind: 'Lagging',
};

// "vs Nov" style label from a 'YYYY-MM' month key.
const moLabel = (ym: string) => `vs ${MONTHS_SHORT[Number(ym.split('-')[1]) - 1]}`;

// Numeric columns get fixed widths so Delivered / Target / Revenue read as
// distinct, evenly-spaced columns instead of bunching at the right edge. Below
// lg the branch identity needs the room, so Target is dropped (least critical
// here, and still on the branch drill-down); lg+ restores the full 5 columns.
const BRANCH_COLS =
  'grid-cols-[30px_minmax(0,1fr)_72px_96px_22px] gap-x-3 md:gap-x-4 lg:grid-cols-[40px_minmax(0,1fr)_76px_60px_96px_22px]';

const intFmt = (n: number) => String(Math.round(n));

// The biggest genuine funnel leak = the largest stage-to-stage drop, EXCLUDING
// the final order_placed→delivered step (those leads aren't lost, just awaiting
// delivery, so counting them as a "leak" would be misleading). Returns the human
// stage labels on either side of that drop.
function biggestLeak(funnel: FunnelStep[]): { from: string; to: string; drop: number } | null {
  const leaks = funnel.filter((f) => f.drop != null && f.stage !== 'delivered');
  if (!leaks.length) return null;
  const worst = leaks.reduce((m, f) => ((f.drop ?? 0) > (m.drop ?? 0) ? f : m), leaks[0]);
  const i = funnel.findIndex((f) => f.stage === worst.stage);
  return {
    from: STAGE_LABELS[funnel[i - 1].stage] ?? funnel[i - 1].stage,
    to: STAGE_LABELS[worst.stage] ?? worst.stage,
    drop: worst.drop ?? 0,
  };
}

export default function OverviewPage() {
  const [range, setRange] = useState<RangeKey>('all');
  const [branch, setBranch] = useState('');
  const { data, error, loading } = useApi<Overview>(appendBranch(appendRange('/overview', range), branch));
  const past = isPastRange(range);
  const dl = prevLabel(range);

  // Sortable numeric columns on the branch table. Default (null) keeps the
  // backend order — by attainment — which the rank circles and summary describe.
  const [branchSort, setBranchSort] = useState<{ key: 'delivered' | 'target_units' | 'revenue'; dir: 'asc' | 'desc' } | null>(null);
  const toggleBranchSort = (key: 'delivered' | 'target_units' | 'revenue') =>
    setBranchSort((s) => (s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  const branchRows =
    branchSort && data
      ? [...data.branch_health].sort((a, b) => {
          const r = a[branchSort.key] - b[branchSort.key];
          return branchSort.dir === 'asc' ? r : -r;
        })
      : data?.branch_health ?? [];

  return (
    <>
      <PageHeader
        title="Group Overview"
        subtitle={
          <>
            5 branches · {rangeLabel(range)}
            {data && <span className="text-faint"> · as of {fmtDay(data.now)} 2025</span>}
          </>
        }
        icon={<LayoutDashboard size={18} />}
      >
        <BranchFilter value={branch} onChange={setBranch} />
        <TimeRange value={range} onChange={setRange} />
      </PageHeader>

      <div className="p-lg flex flex-col gap-lg">
        {error && <ErrorState error={error} />}

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-lg md:grid-cols-3 lg:grid-cols-5">
          {loading || !data
            ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            : (() => {
                // Prefer the selected period's delta; otherwise fall back to
                // month-over-month momentum so a "which way" read shows even in
                // the default all-time view.
                const revDelta = data.deltas?.revenue_booked ?? data.momentum?.revenue_booked ?? null;
                const carsDelta = data.deltas?.cars_delivered ?? data.momentum?.cars_delivered ?? null;
                const trendLabel = data.deltas ? dl : data.momentum ? moLabel(data.momentum.prev_month) : undefined;
                return (
                  <>
                    <KpiCard tone="success" icon={<IndianRupee size={16} />} label="Revenue won" value={<CountUp value={data.kpis.revenue_booked} format={formatINR} />} sub="from delivered cars" delta={revDelta} deltaLabel={trendLabel} />
                    <KpiCard tone="primary" icon={<Trophy size={16} />} label="Win rate" value={<CountUp value={data.kpis.win_rate} format={(n) => pct(n)} />} sub={`${data.kpis.won_leads} won vs ${data.kpis.lost} lost`} />
                    <KpiCard tone="warning" icon={<Target size={16} />} label="Sales conversion" value={<CountUp value={data.kpis.conversion} format={(n) => pct(n)} />} sub={`${data.kpis.won_leads ?? Math.round(data.kpis.conversion * data.kpis.total_leads)} delivered + ${data.kpis.committed_leads} orders placed`} />
                    <KpiCard alarm icon={<Snowflake size={16} />} label="Value at risk" value={<CountUp value={data.kpis.cold_value} format={formatINR} />} sub={<>{data.kpis.cold_leads} leads slipping · 7+ days idle{data.kpis.awaiting_leads > 0 && (<><br /><span className="text-faint">plus {data.kpis.awaiting_leads} orders awaiting delivery</span></>)}</>} />
                    <KpiCard tone="primary" icon={<Car size={16} />} label="Cars delivered" value={<CountUp value={data.kpis.cars_delivered} format={intFmt} />} sub={`${data.kpis.total_leads} leads in scope`} delta={carsDelta} deltaLabel={trendLabel} />
                  </>
                );
              })()}
        </div>

        {/* Branch health + attention */}
        <div className="grid gap-lg lg:grid-cols-[1.35fr_1fr]">
          <Card title="Branch performance" hint="ranked vs group pace">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="flex flex-col tabular-nums">
                <div className={cn('grid items-center px-1 pb-2 text-xs text-faint', BRANCH_COLS)}>
                  <span className="col-span-2">Branch</span>
                  <SortHeader label="Delivered" active={branchSort?.key === 'delivered'} dir={branchSort?.dir} onClick={() => toggleBranchSort('delivered')} />
                  <SortHeader label="Target" className="hidden lg:flex" active={branchSort?.key === 'target_units'} dir={branchSort?.dir} onClick={() => toggleBranchSort('target_units')} />
                  <SortHeader label="Revenue" active={branchSort?.key === 'revenue'} dir={branchSort?.dir} onClick={() => toggleBranchSort('revenue')} />
                  <span />
                </div>
                {branchRows.map((b, i) => (
                  <Link
                    key={b.id}
                    href={`/branches/${b.id}`}
                    style={{ animationDelay: `${i * 55}ms` }}
                    className={cn('group dp-rise grid items-center rounded-sm border-t border-border px-1 py-2.5 transition-colors duration-fast hover:bg-surface-2', BRANCH_COLS)}
                  >
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold', STATUS_CIRCLE[b.status])}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold">{b.name}</span>
                        <span className={cn('shrink-0 rounded-pill px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wide', STATUS_PILL[b.status])}>
                          {STATUS_LABEL[b.status]}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-faint md:flex-row md:items-center md:gap-2.5">
                        <span className="flex min-w-0 items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{b.city}</span>
                        </span>
                        {b.manager && (
                          <span className="flex min-w-0 items-center gap-1">
                            <User size={12} className="shrink-0" />
                            <span className="truncate">{b.manager}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-right font-mono text-sm">{b.delivered}</span>
                    <span className="hidden text-right font-mono text-sm text-muted lg:block">{b.target_units}</span>
                    <span className="text-right font-mono text-sm font-semibold">{formatINR(b.revenue)}</span>
                    {/* Drill-in cue: hidden at rest, fades in primary + nudge only on row hover. */}
                    <span className="flex justify-end text-primary opacity-0 transition-all duration-fast group-hover:translate-x-0.5 group-hover:opacity-100">
                      <ArrowUpRight size={16} />
                    </span>
                  </Link>
                ))}
                {(() => {
                  const gt = data.group_target;
                  const f = data.forecast;
                  const behind = data.branch_health.filter((b) => b.status === 'behind').length;
                  return (
                    <>
                      <p className="mt-3 rounded-sm bg-surface-2 px-3 py-2.5 text-sm text-muted">
                        We&rsquo;ve delivered <span className="font-semibold text-text">{gt.delivered} of {gt.target_units.toLocaleString('en-IN')}</span> units ({pct(gt.attainment)}). Targets are set far above real sales pace. So we rank branches against each other.{behind > 0 ? ` ${behind === 1 ? 'One branch is' : `${behind} branches are`} clearly behind the rest.` : ''}
                      </p>
                      <p className="mt-2 flex items-start gap-2 rounded-sm bg-primary-50 px-3 py-2.5 text-sm text-muted">
                        <TrendingUp size={16} className="mt-0.5 shrink-0 text-primary-700" />
                        <span>
                          At the current pipeline, the group is projected to finish{' '}
                          <span className="font-semibold text-text">~{f.projected_total} cars</span> — {f.delivered} delivered plus ~{f.projected_total - f.delivered} more expected from {f.open_leads} open deals, with{' '}
                          <span className="font-semibold text-success">{formatINR(f.expected_additional_revenue)}</span> still winnable.
                        </span>
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </Card>

          <Card title={past ? 'Period highlights' : 'Needs your attention'} hint={past ? 'what happened' : 'auto-ranked'}>
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : past ? (
              <div className="flex flex-col gap-2.5">
                {(() => {
                  const best = [...data.branch_health].sort((a, b) => b.attainment - a.attainment)[0];
                  const leak = biggestLeak(data.funnel);
                  const lost = data.lost_reasons?.[0];
                  return (
                    <>
                      <Attention tone="success" icon={<Trophy size={17} />} title={`${best.name} led the group`} body={`${best.delivered} of ${best.target_units} units delivered (${pct(best.attainment)} of target) — best in the group.`} href={`/branches/${best.id}`} delay={0} />
                      {leak && <Attention tone="primary" icon={<TrendingDown size={17} />} title={`Most leads fell off between ${leak.from} and ${leak.to}`} body={`−${Math.round(leak.drop * 100)}% at that step — the biggest leak this period.`} href="/insights" delay={55} />}
                      {lost && <Attention tone="warning" icon={<XCircle size={17} />} title="Top reason deals were lost" body={`“${lost.reason}” — ${lost.count} ${lost.count === 1 ? 'deal' : 'deals'}.`} href="/insights" delay={110} />}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {(() => {
                  const worst = [...data.branch_health].sort((a, b) => a.attainment - b.attainment)[0];
                  const leak = biggestLeak(data.funnel);
                  return (
                    <>
                      <Attention tone="danger" icon={<AlertTriangle size={17} />} title={`${worst.name} is behind`} body={`Only ${worst.delivered} of ${worst.target_units} delivered (${pct(worst.attainment)} of target).`} href={`/branches/${worst.id}`} delay={0} />
                      <Attention tone="warning" icon={<Clock size={17} />} title={`${data.kpis.cold_leads} leads going cold`} body={`Worth ${formatINR(data.kpis.cold_value)} in pipeline, untouched 7+ days.`} href="/bottlenecks" delay={55} />
                      {leak && <Attention tone="primary" icon={<TrendingDown size={17} />} title={`Most leads fall off between ${leak.from} and ${leak.to}`} body={`${Math.round(leak.drop * 100)}% drop out at this step — the funnel's single biggest leak.`} href="/insights" delay={110} />}
                    </>
                  );
                })()}
              </div>
            )}
          </Card>
        </div>

        {/* Funnel + trend */}
        <div className="grid gap-lg lg:grid-cols-[1fr_1.1fr]">
          <Card title="Where leads drop off" hint={data ? `${data.kpis.total_leads} leads` : ''}>
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <Funnel
                steps={data.funnel}
                note={
                  data.funnel.length > 1
                    ? `${data.funnel[0].count - data.funnel[1].count} leads dropped before reaching the contacted stage — the single biggest leak in the funnel and the clearest place to recover deals.`
                    : undefined
                }
              />
            )}
          </Card>
          <Card title="Deliveries & revenue" hint="per month">
            {loading || !data ? (
              <Skeleton className="h-full min-h-[200px] w-full" />
            ) : (
              <TrendChart
                data={data.monthly}
                note={(() => {
                  const ms = data.monthly;
                  if (ms.length < 2) return undefined; // a "top month" needs months to compare
                  const monthName = (ym: string) => {
                    const [y, m] = ym.split('-').map(Number);
                    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' });
                  };
                  const topDel = [...ms].sort((a, b) => b.delivered - a.delivered)[0];
                  const topRev = [...ms].sort((a, b) => b.revenue - a.revenue)[0];
                  return topDel.month === topRev.month
                    ? `${monthName(topDel.month)} was the strongest month — ${topDel.delivered} cars delivered and ${formatINR(topRev.revenue)} booked.`
                    : `${monthName(topDel.month)} delivered the most cars (${topDel.delivered}); ${monthName(topRev.month)} booked the most revenue (${formatINR(topRev.revenue)}).`;
                })()}
              />
            )}
          </Card>
        </div>

        {/* Speed + pipeline */}
        <div className="grid gap-lg lg:grid-cols-2">
          <Card title="How fast we call new leads" hint="time to first call">
            {loading || !data ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold leading-none text-warning">
                    {Math.round(data.speed_to_lead.median_hours)}
                  </span>
                  <span className="text-sm font-semibold text-muted">hrs median</span>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Only {pct(data.speed_to_lead.within_24h)} of new leads are reached within a day, and{' '}
                  {pct(data.speed_to_lead.over_72h)} wait more than three — a response-time gap worth
                  tightening for customer experience.
                </p>
              </div>
            )}
          </Card>
          <Card title="Value of active deals" hint={data ? `${data.kpis.open_leads} open deals` : ''}>
            {loading || !data ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              (() => {
                const pv = data.kpis.pipeline_value || 1;
                const committed = data.kpis.committed_value;
                const atRisk = data.kpis.cold_value;
                const healthy = Math.max(0, pv - committed - atRisk);
                const healthyLeads = data.kpis.open_leads - data.kpis.committed_leads - data.kpis.cold_leads;
                const w = (v: number) => `${(v / pv) * 100}%`;
                return (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-semibold leading-none">
                        {formatINR(data.kpis.pipeline_value)}
                      </span>
                      <span className="text-sm font-semibold text-muted">in the pipeline</span>
                    </div>
                    <div className="mt-3 flex h-3.5 overflow-hidden rounded-pill">
                      <div className="bg-primary-500" style={{ width: w(committed) }} />
                      <div className="bg-success" style={{ width: w(healthy) }} />
                      <div className="bg-danger" style={{ width: w(atRisk) }} />
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5 text-2xs">
                      <LegendRow color="bg-primary-500" label="Committed" note="ordered, awaiting delivery" value={`${formatINR(committed)} · ${data.kpis.committed_leads}`} />
                      <LegendRow color="bg-success" label="Healthy" note="active pipeline" value={`${formatINR(healthy)} · ${healthyLeads}`} />
                      <LegendRow color="bg-danger" label="At risk" note="7+ days idle" value={`${formatINR(atRisk)} · ${data.kpis.cold_leads}`} />
                    </div>
                  </div>
                );
              })()
            )}
          </Card>
        </div>

        {/* Demand: what sells + where leads come from */}
        <div className="grid gap-lg lg:grid-cols-2">
          <Card title="What people are buying" hint="top models · units delivered">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <RankedBars
                color="primary"
                unit="cars"
                emptyLabel="No cars delivered"
                emptyIcon={<Car size={20} strokeWidth={1.75} />}
                items={[...data.model_mix]
                  .sort((a, b) => b.delivered - a.delivered)
                  .slice(0, 6)
                  .map((m) => ({ label: m.model, value: m.delivered, by_branch: m.by_branch }))}
                note={(() => {
                  const ms = [...data.model_mix].sort((a, b) => b.delivered - a.delivered);
                  const totalDel = ms.reduce((a, m) => a + m.delivered, 0);
                  if (!totalDel) return undefined;
                  const top3 = ms.slice(0, 3).reduce((a, m) => a + m.delivered, 0);
                  return `${ms[0].model} is the top seller with ${ms[0].delivered} cars. The top three models make up ${Math.round((top3 / totalDel) * 100)}% of all deliveries.`;
                })()}
              />
            )}
          </Card>
          <Card title="Where leads come from" hint="by volume">
            {loading || !data ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <RankedBars
                color="success"
                unit="leads"
                emptyLabel="No leads yet"
                emptyIcon={<Users size={20} strokeWidth={1.75} />}
                items={[...data.source_quality]
                  .sort((a, b) => b.leads - a.leads)
                  .map((s) => ({ label: SOURCE_LABELS[s.source] ?? s.source, value: s.leads, by_branch: s.by_branch }))}
                note={(() => {
                  const ss = data.source_quality;
                  if (!ss.length) return undefined;
                  const topVol = [...ss].sort((a, b) => b.leads - a.leads)[0];
                  const bestConv = [...ss].sort((a, b) => b.rate - a.rate)[0];
                  const lbl = (x: typeof topVol) => SOURCE_LABELS[x.source] ?? x.source;
                  return topVol.source === bestConv.source
                    ? `${lbl(topVol)} brings the most leads (${topVol.leads}) and also converts best (${pct(bestConv.rate)}) — the channel worth doubling down on.`
                    : `${lbl(topVol)} brings the most leads (${topVol.leads}); ${lbl(bestConv)} converts best (${pct(bestConv.rate)}).`;
                })()}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// Right-aligned, clickable column header for the branch table — mirrors the
// DataTable sort affordance (↕ idle, ↑/↓ when active) used elsewhere.
function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active?: boolean;
  dir?: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'items-center justify-end gap-0.5 whitespace-nowrap select-none hover:text-primary',
        className ?? 'flex',
      )}
    >
      {label}
      <span className="text-primary">{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
}

// One row of the pipeline-quality legend: colour swatch, label, muted note,
// then the value + lead count aligned right.
function LegendRow({ color, label, note, value }: { color: string; label: string; note: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-pill', color)} />
      <span className="font-semibold">{label}</span>
      <span className="truncate text-faint">{note}</span>
      <span className="ml-auto shrink-0 font-mono font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Attention({
  tone,
  icon,
  title,
  body,
  href,
  delay = 0,
}: {
  tone: 'danger' | 'warning' | 'primary' | 'success';
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  delay?: number;
}) {
  const bg = {
    danger: 'bg-danger-soft text-danger',
    warning: 'bg-warning-soft text-warning',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-soft text-success',
  }[tone];
  return (
    <Link
      href={href}
      style={{ animationDelay: `${delay}ms` }}
      className="dp-rise grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-sm border border-border bg-surface p-3 transition-colors duration-fast hover:bg-surface-2"
    >
      <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-sm', bg)}>{icon}</span>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-0.5 text-xs text-muted">{body}</p>
      </div>
      <ArrowRight size={15} className="text-faint" />
    </Link>
  );
}
