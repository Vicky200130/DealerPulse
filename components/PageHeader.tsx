export function PageHeader({
  title,
  crumb,
  subtitle,
  icon,
  children,
}: {
  title: React.ReactNode;
  /** Breadcrumb shown small, above the title (drill-down pages). */
  crumb?: React.ReactNode;
  /** Descriptive line shown below the title (main pages). */
  subtitle?: React.ReactNode;
  /** Icon shown in a soft-tinted square to the left of the title. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="md:sticky md:top-0 z-20 flex flex-wrap items-center justify-between gap-sm border-b border-border bg-bg px-lg py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary-100 text-primary-700">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {crumb && <div className="mb-0.5 text-xs text-faint font-mono">{crumb}</div>}
          <h1 className="text-lg font-semibold tracking-tight text-text">{title}</h1>
          {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </header>
  );
}
