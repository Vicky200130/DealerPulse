import { cn } from '@/lib/cn';

const stripes = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  primary: 'bg-primary',
} as const;

export function Card({
  title,
  hint,
  children,
  className,
  stripe,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  stripe?: keyof typeof stripes;
}) {
  const hasHeader = title || hint;
  return (
    <section className={cn('relative rounded bg-surface border border-border', className)}>
      {stripe && (
        <span className={cn('absolute left-0 top-md bottom-md w-[3px] rounded-pill', stripes[stripe])} />
      )}
      {hasHeader && (
        <header className="flex items-center justify-between gap-sm px-md pt-md pb-sm">
          {title && <h3 className="text-sm font-semibold text-text">{title}</h3>}
          {hint && <span className="text-xs text-faint font-mono">{hint}</span>}
        </header>
      )}
      <div className={cn(hasHeader ? 'px-md pb-md' : 'p-md')}>{children}</div>
    </section>
  );
}
