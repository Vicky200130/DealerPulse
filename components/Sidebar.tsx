'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';
import { NAV } from './navItems';

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden md:flex w-[216px] shrink-0 flex-col bg-sidebar text-sidebar-fg p-3 h-screen sticky top-0 self-start overflow-y-auto">
      <div className="flex items-center gap-2.5 px-2 py-3 pb-5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-fg">
          <Activity size={17} />
        </span>
        <span className="font-display font-extrabold text-md leading-tight">
          DealerPulse
          <span className="block font-mono font-medium text-[9.5px] tracking-widest text-sidebar-muted uppercase mt-0.5">
            Toyota Group
          </span>
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => {
          const active = n.exact ? path === '/' : path.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2 text-[13.5px] font-medium transition-colors duration-fast',
                active ? 'bg-sidebar-active text-sidebar-fg' : 'text-sidebar-muted hover:text-sidebar-fg',
              )}
            >
              <Icon size={16} className={cn(active && 'text-primary-400')} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-pill bg-primary text-primary-fg text-[11px] font-bold font-display">
            RC
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold">Rahul Chopra</span>
            <span className="block text-[10.5px] text-sidebar-muted">Group CEO</span>
          </span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
