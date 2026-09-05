import { cn } from '@/lib/cn';

const tones = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  primary: 'bg-primary-100 text-primary-700',
  neutral: 'bg-surface-2 text-muted',
} as const;

export function Badge({
  tone = 'neutral',
  mono,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  mono?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        mono && 'font-mono',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
