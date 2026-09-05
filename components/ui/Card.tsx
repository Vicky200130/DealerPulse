import { cn } from '@/lib/cn';

export function Card({
  title,
  hint,
  children,
  className,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const hasHeader = title || hint;
  return (
    <section className={cn('relative flex flex-col rounded bg-surface shadow-[var(--shadow-card)]', className)}>
      {hasHeader && (
        <header className="flex items-center justify-between gap-sm px-md pt-md pb-sm">
          {title && <h3 className="text-md font-semibold text-text">{title}</h3>}
          {hint && <span className="text-xs text-faint font-mono">{hint}</span>}
        </header>
      )}
      {/* content grows to fill a stretched card (e.g. equal-height grid rows) so
          charts can use the full height; top-aligned, so non-filling cards look
          unchanged. */}
      <div className={cn('min-h-0 flex-1', hasHeader ? 'px-md pb-md' : 'p-md')}>{children}</div>
    </section>
  );
}
