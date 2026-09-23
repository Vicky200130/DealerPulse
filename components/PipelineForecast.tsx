import { Target } from 'lucide-react';
import { formatINR, pct } from '@/lib/format';
import { STAGE_LABELS, type PipelineForecast as PF } from '@/types';

/**
 * Pipeline-forecast body (wrap it in a <Card title="Pipeline forecast">). Reads
 * as plain sentences a manager can say out loud:
 *   left  · one sentence — open deals → how many will convert → revenue to win
 *   right · "where it comes from", one short sentence per stage, then the total
 * Win-chance is learned from history (of past deals that reached a stage, how
 * many became a sale); the row's expected = open × win-chance, so the reader
 * sees exactly where the total comes from.
 */
export function PipelineForecast({ f }: { f: PF }) {
  // Highest stage first (order placed → new), the order they're likeliest to land.
  const stages = (f.by_stage ?? []).slice().reverse();
  const expectedTotal = Math.round(f.expected_additional);
  const carWord = (n: number) => (Math.abs(n - 1) < 0.05 ? 'car' : 'cars');
  const expStr = (rate: number, exp: number) => (rate >= 0.999 ? `${Math.round(exp)}` : `~${exp}`);

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-8">
      {/* 1 — The one plain sentence, + an honest read against the stretch target. */}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text">
          <span className="font-semibold">{f.open_leads} open {f.open_leads === 1 ? 'deal' : 'deals'}.</span> Based on how deals
          like these usually close, <span className="font-semibold">~{expectedTotal} will convert</span> — about{' '}
          <span className="font-semibold text-success">{formatINR(f.expected_additional_revenue)}</span> still to win.
        </p>
        {f.target_units != null && (
          <p className="mt-auto flex items-start gap-2 rounded-sm bg-primary-50 px-2.5 py-2 text-xs text-muted">
            <Target size={15} className="mt-0.5 shrink-0 text-primary-700" />
            <span>
              That lifts target progress from <span className="font-semibold text-text">{pct(f.attainment_now ?? 0)}</span> to{' '}
              <span className="font-semibold text-text">{pct(f.attainment_projected ?? 0)}</span> of the{' '}
              {f.target_units.toLocaleString('en-IN')} stretch target.
            </span>
          </p>
        )}
      </div>

      {/* 2 — Where the ~N comes from, stage by stage, read aloud. */}
      {stages.length > 0 && (
        <div className="flex flex-col gap-2 md:border-l md:border-border md:pl-8">
          <div className="text-2xs font-semibold uppercase tracking-wide text-faint">Where it comes from</div>
          {stages.map((s) => (
            <p key={s.stage} className="font-mono text-xs text-muted">
              {s.open} open at <span className="text-text">{STAGE_LABELS[s.stage] ?? s.stage}</span> → {pct(s.rate)} convert →{' '}
              <span className="font-semibold text-text">
                {expStr(s.rate, s.expected)} {carWord(s.expected)}
              </span>
            </p>
          ))}
          <p className="mt-1 border-t border-border pt-2 text-sm font-semibold text-text">
            Add them up → ~{expectedTotal} cars → <span className="text-success">{formatINR(f.expected_additional_revenue)}</span> still to win.
          </p>
        </div>
      )}
    </div>
  );
}
