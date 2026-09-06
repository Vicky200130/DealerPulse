import { cn } from '@/lib/cn';
import { EmptyState } from './ui/EmptyState';

export function ReasonBars({
  items,
  color = 'danger',
  emptyLabel = 'No data yet',
}: {
  // `title` (optional) is the full text shown on hover when `label` is shortened.
  items: { label: string; value: number; display?: string; title?: string }[];
  color?: 'danger' | 'primary' | 'success';
  emptyLabel?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const bar = { danger: 'bg-danger', primary: 'bg-primary', success: 'bg-success' }[color];
  if (!items.length || items.every((i) => i.value === 0)) {
    return (
      <div className="flex h-full min-h-[140px] items-center justify-center">
        <EmptyState title={emptyLabel} hint="Try a wider time range" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={it.label} style={{ animationDelay: `${i * 45}ms` }} className="dp-rise grid grid-cols-[132px_1fr_32px] sm:grid-cols-[180px_1fr_44px] items-center gap-2.5 text-xs">
          <span title={it.title ?? it.label} className="text-muted leading-snug break-words">{it.label}</span>
          <div className="h-2.5 overflow-hidden rounded-pill bg-surface-2">
            <div className={cn('h-full rounded-pill', bar)} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <span className="text-right font-mono font-semibold">{it.display ?? it.value}</span>
        </div>
      ))}
    </div>
  );
}
