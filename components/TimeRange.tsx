'use client';

import { Segmented } from './ui/Segmented';

export type RangeKey = 'all' | 'q3' | 'q4' | 'dec';

export const RANGES: { label: string; value: RangeKey }[] = [
  { label: 'Jun–Dec', value: 'all' },
  { label: 'Q3', value: 'q3' },
  { label: 'Q4', value: 'q4' },
  { label: 'December', value: 'dec' },
];

export function rangeParams(r: RangeKey): string {
  switch (r) {
    case 'q3':
      return '?from=2025-07-01&to=2025-09-30';
    case 'q4':
      return '?from=2025-10-01&to=2025-12-31';
    case 'dec':
      return '?from=2025-12-01&to=2025-12-31';
    default:
      return '';
  }
}

export function TimeRange({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  return <Segmented options={RANGES} value={value} onChange={onChange} />;
}
