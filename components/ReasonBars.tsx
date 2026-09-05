import { cn } from '@/lib/cn';

export function ReasonBars({
  items,
  color = 'danger',
}: {
  items: { label: string; value: number; display?: string }[];
  color?: 'danger' | 'primary' | 'success';
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const bar = { danger: 'bg-danger', primary: 'bg-primary', success: 'bg-success' }[color];
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-[110px_1fr_40px] sm:grid-cols-[150px_1fr_44px] items-center gap-2.5 text-xs">
          <span className="truncate text-muted">{it.label}</span>
          <div className="h-2.5 overflow-hidden rounded-pill bg-surface-2">
            <div className={cn('h-full rounded-pill', bar)} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <span className="text-right font-mono font-semibold">{it.display ?? it.value}</span>
        </div>
      ))}
    </div>
  );
}
