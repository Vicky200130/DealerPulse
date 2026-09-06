import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building2,
  LayoutDashboard,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';
import type { Role } from '@/lib/view';

export interface NavItem {
  href: string;
  label: string;
  /** Compact label for tight contexts (e.g. the bottom tab bar). Falls back to `label`. */
  short?: string;
  icon: LucideIcon;
  exact?: boolean;
  // Which roles see this item. Omitted = every role. One list here is the whole
  // per-role nav policy — no per-item conditions elsewhere.
  roles?: Role[];
}

// Ordered by the CEO's decision loop: monitor → understand → act → drill → operate.
export const NAV: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/insights', label: 'Insights', icon: Sparkles, roles: ['admin', 'branch_manager'] },
  { href: '/bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
  { href: '/branches', label: 'Branches', icon: Building2, roles: ['admin'] },
  { href: '/reps', label: 'Sales reps', short: 'Reps', icon: Users, roles: ['admin', 'branch_manager'] },
  { href: '/deliveries', label: 'Deliveries', icon: Truck, roles: ['admin', 'branch_manager'] },
];

/** The nav items a given role may see. */
export function navForRole(role: Role): NavItem[] {
  return NAV.filter((n) => !n.roles || n.roles.includes(role));
}
