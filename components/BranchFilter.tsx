'use client';

import { useApi } from '@/lib/useApi';
import { Dropdown } from './ui/Dropdown';
import type { BranchHealth } from '@/types';

// Branch scope selector — "All branches" plus one entry per branch. The empty
// value means all; pages pass it through `appendBranch` to their API calls.
export function BranchFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useApi<BranchHealth[]>('/branches');
  const options = [
    { label: 'All branches', value: '' },
    ...(data ?? []).map((b) => ({ label: b.name, value: b.id })),
  ];
  return <Dropdown value={value} onChange={onChange} options={options} />;
}
