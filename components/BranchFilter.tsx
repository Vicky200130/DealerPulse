'use client';

import { useApi } from '@/lib/useApi';
import { useView } from '@/lib/view';
import { Dropdown } from './ui/Dropdown';
import type { BranchHealth } from '@/types';

// Branch scope selector — "All branches" plus one entry per branch. The empty
// value means all; pages pass it through `appendBranch` to their API calls.
// Only the CEO sees it; managers/reps are locked to their own branch (useBranch
// forces the scope), so it hides itself for those roles.
export function BranchFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { view } = useView();
  const { data } = useApi<BranchHealth[]>('/branches');
  if (view.role !== 'admin') return null;
  const options = [
    { label: 'All branches', value: '' },
    ...(data ?? []).map((b) => ({ label: b.name, value: b.id })),
  ];
  return <Dropdown value={value} onChange={onChange} options={options} />;
}
