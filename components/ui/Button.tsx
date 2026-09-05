import { cn } from '@/lib/cn';

export function Button({
  variant = 'secondary',
  className,
  children,
  ...props
}: { variant?: 'primary' | 'secondary' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors duration-fast ease-out',
        'disabled:opacity-50 disabled:pointer-events-none',
        variant === 'primary'
          ? 'bg-primary text-primary-fg hover:bg-primary-600'
          : 'bg-surface text-text border border-border hover:bg-surface-2',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
