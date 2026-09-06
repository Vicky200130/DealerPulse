import { Minus, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatINR, pct } from '@/lib/format';
import { STAGE_LABELS, type Forecast, type PipelineForecast as PF, type Trend } from '@/types';

// Trend reads against the target gap, so "up" is always the good direction.
const TREND: Record<Trend, { icon: React.ReactNode; label: string; cls: string }> = {
  up: { icon: <TrendingUp size={13} />, label: 'improving', cls: 'text-success' },
  down: { icon: <TrendingDown size={13} />, label: 'slipping', cls: 'text-danger' },
  flat: { icon: <Minus size={13} />, label: 'steady', cls: 'text-muted' },
};

/**
 * Pipeline-forecast body, laid out as a full-width row of 3 columns (wrap it in
 * a <Card title="Pipeline forecast">):
 *   1 · projected finish + honest read against the (aspirational) target
 *   2 · revenue still winnable + the run-rate trend
 *   3 · where the projection comes from, stage by stage
 * Drops to two columns when a branch has no open pipeline, so the row never
 * leaves an empty column; stacks vertically on narrow screens.
 */
export function PipelineForecast({ f, runRate }: { f: PF; runRate?: Forecast }) {
  // Share of the open pipeline's value we expect to actually convert.
  const winShare = f.pipeline_value ? f.expected_additional_revenue / f.pipeline_value : 0;
  const rr = runRate ? TREND[runRate.trend] : null;
  const hasStages = !!f.by_stage && f.by_stage.length > 0;

  return (
    <div className={cn('grid gap-6 md:gap-8', hasStages ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
      {/* 1 — Projected finish + honest target read. */}
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold leading-none tabular-nums">~{f.projected_total}</span>
            <span className="text-sm font-semibold text-muted">cars projected</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            <span className="font-semibold text-text">{f.delivered}</span> delivered
            {' + '}
            <span className="font-semibold text-text">~{f.projected_total - f.delivered}</span> expected from{' '}
            <span className="font-semibold text-text">{f.open_leads}</span> open{' '}
            {f.open_leads === 1 ? 'deal' : 'deals'}.
          </p>
        </div>
        {f.target_units != null && (
          <p className="mt-auto flex items-start gap-2 rounded-sm bg-primary-50 px-2.5 py-2 text-xs text-muted">
            <Target size={15} className="mt-0.5 shrink-0 text-primary-700" />
            <span>
              Target <span className="font-mono font-semibold text-text">{f.target_units.toLocaleString('en-IN')}</span> is a
              stretch goal, set well above real pace — projected{' '}
              <span className="font-semibold text-text">{pct(f.attainment_projected ?? 0)}</span>, up from{' '}
              <span className="font-semibold text-text">{pct(f.attainment_now ?? 0)}</span> today.
            </span>
          </p>
        )}
      </div>

      {/* 2 — Revenue still winnable + run-rate trend. */}
      <div className="flex flex-col gap-3 md:border-l md:border-border md:pl-8">
        <div>
          <div className="text-2xs font-semibold uppercase tracking-wide text-faint">Still winnable</div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-lg font-semibold text-success tabular-nums">
              {formatINR(f.expected_additional_revenue)}
            </span>
            <span className="text-2xs text-faint">of {formatINR(f.pipeline_value)} · {pct(winShare)} likely</span>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-pill bg-surface-2">
            <div className="bg-success" style={{ width: `${winShare * 100}%` }} />
          </div>
          <p className="mt-1.5 text-2xs text-faint">Revenue expected to convert from deals open right now.</p>
        </div>
        {runRate && rr && (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5 text-2xs">
            <span className="text-faint">
              Run-rate <span className="font-mono font-semibold text-text">~{runRate.recent_pace}/mo</span> vs{' '}
              {runRate.monthly_target} target
            </span>
            <span className={cn('flex shrink-0 items-center gap-1 font-semibold', rr.cls)}>
              {rr.icon}
              {rr.label}
            </span>
          </div>
        )}
      </div>

      {/* 3 — Where the projection comes from, stage by stage. */}
      {hasStages && (
        <div className="flex flex-col gap-1.5 md:border-l md:border-border md:pl-8">
          <div className="text-2xs font-semibold uppercase tracking-wide text-faint">Where it comes from</div>
          {f.by_stage!
            .slice()
            .reverse()
            .map((s) => (
              <div key={s.stage} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className="truncate text-muted">
                  {STAGE_LABELS[s.stage] ?? s.stage}
                  <span className="text-faint"> · {s.open} open · {pct(s.rate)} win</span>
                </span>
                <span className="font-mono font-semibold tabular-nums text-text">→ ~{s.expected}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
