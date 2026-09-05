import { cn } from '@/lib/cn';
import { STAGE_LABELS, type FunnelStep } from '@/types';

export function Funnel({ steps, note }: { steps: FunnelStep[]; note?: React.ReactNode }) {
  const max = steps[0]?.count || 1;
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((s, i) => {
        const w = Math.max(6, (s.count / max) * 100);
        const last = i === steps.length - 1;
        const bigDrop = s.drop != null && s.drop > 0.2;
        return (
          <div key={s.stage} className="grid grid-cols-[92px_1fr_60px] items-center gap-2.5">
            <span className="text-xs text-muted text-right">{STAGE_LABELS[s.stage] ?? s.stage}</span>
            <div
              className={cn(
                'flex h-[30px] items-center rounded-sm pl-2.5 font-mono text-sm font-semibold text-primary-fg',
                last ? 'bg-success' : 'bg-primary',
              )}
              style={{ width: `${w}%` }}
            >
              {s.count}
            </div>
            <span
              className={cn(
                'text-right font-mono text-xs font-semibold',
                bigDrop ? 'text-danger' : 'text-muted',
              )}
            >
              {s.drop == null ? '—' : `−${Math.round(s.drop * 100)}%`}
            </span>
          </div>
        );
      })}
      {note && (
        <div className="mt-2.5 rounded-sm bg-warning-soft px-2.5 py-2 text-xs font-medium text-warning">
          {note}
        </div>
      )}
    </div>
  );
}
