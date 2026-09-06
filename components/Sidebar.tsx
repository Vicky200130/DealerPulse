'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';
import { navForRole } from './navItems';
import { toggleSidebar } from '@/lib/sidebar';
import { useView, type Role } from '@/lib/view';

const isCollapsed = () => document.documentElement.getAttribute('data-sidebar') === 'collapsed';

const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
// Read-only identity label; the floating "Viewing as" control does the switching.
const ROLE_LABEL: Record<Role, string> = { admin: 'Group CEO', branch_manager: 'Branch manager', sales_rep: 'Sales executive' };

export function Sidebar() {
  const path = usePathname();
  const { view } = useView();
  // Peek is driven by a real mouse-ENTER (not CSS :hover), so clicking to
  // collapse while the pointer is still on the rail leaves it closed until the
  // pointer actually leaves and re-enters.
  const [peek, setPeek] = useState(false);

  const onToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    toggleSidebar();
    setPeek(false); // a click resolves the pinned state — drop any peek
    e.currentTarget.blur(); // no lingering focus ring after a mouse click
  };

  return (
    <>
      {/* In-flow spacer reserving the PINNED width so a peek never reflows content. */}
      <div className="dp-rail-spacer hidden lg:block" aria-hidden="true" />

      <aside
        onMouseEnter={() => isCollapsed() && setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        className={cn(
          'dp-sidebar hidden lg:flex flex-col bg-sidebar text-sidebar-fg p-3 overflow-y-auto overflow-x-hidden border-r border-sidebar-border',
          peek && 'dp-peek',
        )}
      >
        {/* Brand + pin toggle */}
        <div className="dp-side-center flex items-center gap-3.5 px-2 py-3 pb-4">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-fg">
            <Activity size={19} />
          </span>
          <span className="dp-side-label min-w-0 truncate font-display font-extrabold text-md leading-none">
            DealerPulse
          </span>
          <button
            onClick={onToggle}
            aria-label="Toggle sidebar"
            className="dp-side-toggle ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-fg focus-visible:bg-sidebar-active focus-visible:text-sidebar-fg focus-visible:outline-none transition-colors duration-fast"
          >
            <PanelLeftClose size={18} className="dp-icon-expanded" />
            <PanelLeftOpen size={18} className="dp-icon-collapsed" />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {navForRole(view.role).map((n) => {
            const active = n.exact ? path === '/' : path.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'dp-side-center relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-fast',
                  active
                    ? 'bg-sidebar-active text-primary-700 font-semibold'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg',
                )}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-pill bg-primary" />}
                <Icon
                  size={19}
                  fill={active ? 'currentColor' : 'none'}
                  fillOpacity={active ? 0.22 : undefined}
                  className={cn('shrink-0', active && 'text-primary-600')}
                />
                <span className="dp-side-label">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dp-footer mt-auto flex items-center justify-between gap-2 border-t border-sidebar-border pt-3 px-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-primary text-primary-fg text-2xs font-bold font-display">
              {initials(view.name)}
            </span>
            <span className="dp-side-label min-w-0 leading-tight">
              <span className="block truncate text-xs font-semibold">{view.name}</span>
              <span className="block truncate text-2xs text-sidebar-muted">
                {view.branchName ? `${ROLE_LABEL[view.role]} · ${view.branchName}` : ROLE_LABEL[view.role]}
              </span>
            </span>
          </div>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
