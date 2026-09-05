export function PageHeader({
  title,
  crumb,
  children,
}: {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-sm border-b border-border px-lg py-md">
      <div className="min-w-0">
        {crumb && <div className="text-xs text-faint font-mono">{crumb}</div>}
        <h1 className="text-lg font-extrabold tracking-tight text-text mt-0.5">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </header>
  );
}
