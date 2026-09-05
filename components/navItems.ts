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
  icon: LucideIcon;
  exact?: boolean;
}

export const NAV: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/branches', label: 'Branches', icon: Building2 },
  { href: '/reps', label: 'Sales reps', icon: Users },
  { href: '/bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/deliveries', label: 'Deliveries', icon: Truck },
];
