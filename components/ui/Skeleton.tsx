import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-surface-2', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded bg-surface border border-border p-md">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32 mt-3" />
      <Skeleton className="h-3 w-20 mt-3" />
    </div>
  );
}
