export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-2xl text-center">
      <p className="text-sm font-semibold text-muted">{title}</p>
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
    </div>
  );
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="rounded bg-danger-soft text-danger text-sm px-md py-sm">
      Couldn&apos;t load data ({error}). Is the API running on <code className="font-mono">:8000</code>?
    </div>
  );
}
