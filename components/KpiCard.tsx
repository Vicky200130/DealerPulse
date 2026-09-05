import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pct } from '@/lib/format';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const ICON_TONE: Record<Tone, string> = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-2 text-muted',
};

export function KpiCard({
  label,
  value,
  unit,
  sub,
  icon,
  tone = 'primary',
  delta,
  deltaLabel,
  alarm,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  /** Relative period-over-period change (e.g. 0.18 = +18%). Null hides it. */
  delta?: number | null;
  deltaLabel?: string;
  alarm?: boolean;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className={cn('rounded p-md shadow-[var(--shadow-card)]', alarm ? 'bg-danger-soft' : 'bg-surface')}>
      {/* Icon + label paired on top — identity first, then the value. */}
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm', alarm ? 'bg-surface text-danger' : ICON_TONE[tone])}>
            {icon}
          </span>
        )}
        <div className="text-sm font-medium text-muted">{label}</div>
      </div>
      <div className={cn('mt-3 font-mono text-[24px] font-semibold leading-none tabular-nums sm:text-[28px]', alarm && 'text-danger')}>
        {value}
        {unit && <span className="text-md font-medium text-muted"> {unit}</span>}
      </div>
      {delta != null ? (
        <div className={cn('mt-2.5 flex items-center gap-1 text-xs font-semibold', up ? 'text-success' : 'text-danger')}>
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{up ? '+' : ''}{pct(delta)}</span>
          {deltaLabel && <span className="font-normal text-faint">{deltaLabel}</span>}
        </div>
      ) : (
        sub && <div className="mt-2.5 text-xs text-muted">{sub}</div>
      )}
    </div>
  );
}
