'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';
import { NAV } from './navItems';

export function MobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-30 bg-sidebar text-sidebar-fg">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-fg">
          <Activity size={15} />
        </span>
        <span className="font-display text-sm font-extrabold">DealerPulse</span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-fg transition-colors duration-fast"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-0.5 border-t border-white/10 px-2 py-2">
          {NAV.map((n) => {
            const active = n.exact ? path === '/' : path.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-fast',
                  active ? 'bg-sidebar-active text-sidebar-fg' : 'text-sidebar-muted hover:text-sidebar-fg',
                )}
              >
                <Icon size={16} className={cn(active && 'text-primary-400')} />
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
