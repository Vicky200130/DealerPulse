'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';
import { navForRole, type NavItem } from './navItems';
import { useView } from '@/lib/view';

/**
 * Below `lg` (mobile + tablet) the fixed left sidebar is hidden and navigation
 * moves to two pieces: a slim top bar for brand + theme, and a bottom tab bar
 * holding every destination (icon + label). Bottom placement keeps the tabs in
 * the thumb zone and every view one tap away — better than a hidden hamburger
 * for a dashboard people hop across constantly. On tablet the row is centered
 * (max-width) so it reads as intentional instead of stretching edge-to-edge.
 */
export function MobileNav() {
  const path = usePathname();
  const { view } = useView();
  const isActive = (n: NavItem) => (n.exact ? path === '/' : path.startsWith(n.href));

  return (
    <>
      {/* Slim top bar: brand + theme toggle (nav lives in the bottom bar). */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-2.5 border-b border-sidebar-border bg-sidebar px-3 py-2.5 text-sidebar-fg">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-fg">
          <Activity size={15} />
        </span>
        <span className="font-display text-sm font-extrabold">DealerPulse</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Bottom tab bar: thumb-reachable, all destinations visible. */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar text-sidebar-fg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-2xl items-stretch">
          {navForRole(view.role).map((n) => {
            const active = isActive(n);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2 transition-colors duration-fast',
                  active ? 'text-primary-700' : 'text-sidebar-muted hover:text-sidebar-fg',
                )}
              >
                {active && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-pill bg-primary" />
                )}
                <Icon
                  size={20}
                  fill={active ? 'currentColor' : 'none'}
                  fillOpacity={active ? 0.22 : undefined}
                  className={cn('shrink-0', active && 'text-primary-600')}
                />
                <span className="text-3xs font-medium leading-none tracking-tight whitespace-nowrap">
                  {n.short ?? n.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
