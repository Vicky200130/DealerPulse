import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building2,
  LayoutDashboard,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  /** Compact label for tight contexts (e.g. the bottom tab bar). Falls back to `label`. */
  short?: string;
  icon: LucideIcon;
  exact?: boolean;
}

// Ordered by the CEO's decision loop: monitor → understand → act → drill → operate.
export const NAV: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
  { href: '/branches', label: 'Branches', icon: Building2 },
  { href: '/reps', label: 'Sales reps', short: 'Reps', icon: Users },
  { href: '/deliveries', label: 'Deliveries', icon: Truck },
];
