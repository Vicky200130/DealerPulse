'use client';

import { useApi } from '@/lib/useApi';
import { useView } from '@/lib/view';
import { Dropdown } from './ui/Dropdown';
import type { LeaderRow } from '@/types';

// Cascading sales-rep filter: appears once a branch is in scope and lists that
// branch's reps. "All reps" (empty value) is the default. Picking a rep scopes
// the overview's cohort cards (KPIs, funnel, models, sources) to that one rep.
export function RepFilter({
  branch,
  value,
  onChange,
}: {
  branch: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { view } = useView();
  const { data } = useApi<LeaderRow[]>(branch ? `/reps?branch=${branch}` : '');
  // Only meaningful within a branch, and never for a sales exec (they are the rep).
  if (!branch || view.role === 'sales_rep') return null;
  const options = [
    { label: 'All reps', value: '' },
    ...(data ?? []).map((r) => ({ label: r.name, value: r.id })),
  ];
  return <Dropdown value={value} onChange={onChange} options={options} />;
}
