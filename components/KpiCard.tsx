import { cn } from '@/lib/cn';

export function KpiCard({
  label,
  value,
  unit,
  sub,
  stripe,
  alarm,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  stripe?: 'success' | 'warning' | 'danger';
  alarm?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded border p-md',
        alarm ? 'bg-danger-soft border-transparent' : 'bg-surface border-border',
      )}
    >
      {stripe && !alarm && (
        <span
          className={cn(
            'absolute left-0 top-md bottom-md w-[3px] rounded-pill',
            stripe === 'success' && 'bg-success',
            stripe === 'warning' && 'bg-warning',
            stripe === 'danger' && 'bg-danger',
          )}
        />
      )}
      <div className="text-[10.5px] font-mono uppercase tracking-wide text-muted font-semibold">
        {label}
      </div>
      <div className={cn('mt-2 font-mono font-semibold leading-none text-[22px] sm:text-[27px]', alarm && 'text-danger')}>
        {value}
        {unit && <span className="text-md text-muted font-medium"> {unit}</span>}
      </div>
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </div>
  );
}
