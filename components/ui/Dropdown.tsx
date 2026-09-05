'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Our own dropdown — a styled button + popover menu, not the native <select>.
 * Matches the design system (tokens, radii, motion) and ships hover / active /
 * focus-visible / selected states. Closes on outside-click and Escape.
 */
export function Dropdown({
  value,
  onChange,
  options,
  className,
  align = 'right',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  className?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors duration-fast hover:bg-surface-2"
      >
        {current?.label ?? 'Select'}
        <ChevronDown size={15} className={cn('text-faint transition-transform duration-fast', open && 'rotate-180')} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute z-20 mt-1 min-w-full whitespace-nowrap overflow-hidden rounded-sm border border-border bg-surface p-1 shadow-md',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-4 rounded-[6px] px-3 py-2 text-left text-sm font-semibold transition-colors duration-fast',
                    active ? 'bg-primary-100 text-primary-700' : 'text-muted hover:bg-surface-2 hover:text-text',
                  )}
                >
                  {o.label}
                  {active && <Check size={13} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
