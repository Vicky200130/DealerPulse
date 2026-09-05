import { Inbox } from 'lucide-react';

// A calm, centered empty state: a muted icon in a soft circle, a short title,
// and an optional one-line hint. Pass `icon` to make it fit the chart (a car
// for deliveries, people for leads…); defaults to a generic inbox.
export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-2xl text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-surface-2 text-faint">
        {icon ?? <Inbox size={20} strokeWidth={1.75} />}
      </span>
      <p className="text-sm font-semibold text-muted">{title}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
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
