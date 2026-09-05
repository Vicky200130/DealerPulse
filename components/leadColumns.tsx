import { Badge } from './ui/Badge';
import type { Column } from './ui/Table';
import { formatINR } from '@/lib/format';
import { STAGE_LABELS, type Bottleneck, type Severity } from '@/types';

const sevTone = (s: Severity) => (s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'success');

function NextAction({ label }: { label: string }) {
  const l = label.toLowerCase();
  const urgent = l.includes('immediate') || l.includes('manager');
  return (
    <span
      className={
        'inline-block rounded-sm px-2 py-1 text-[11px] font-semibold whitespace-nowrap ' +
        (urgent ? 'bg-danger-soft text-danger' : 'bg-primary-100 text-primary-700')
      }
    >
      {label}
    </span>
  );
}

export function bottleneckColumns(opts?: { showRep?: boolean }): Column<Bottleneck>[] {
  const cols: Column<Bottleneck>[] = [
    {
      key: 'customer_name',
      header: 'Customer',
      render: (b) => (
        <div>
          <div className="font-semibold">{b.customer_name}</div>
          <div className="text-xs text-faint">
            {b.model} · {STAGE_LABELS[b.status] ?? b.status}
          </div>
        </div>
      ),
    },
    {
      key: 'deal_value',
      header: 'Value',
      align: 'right',
      sortable: true,
      sortValue: (b) => b.deal_value,
      render: (b) => <span className="font-mono">{formatINR(b.deal_value)}</span>,
    },
    {
      key: 'health',
      header: 'Health',
      align: 'right',
      sortable: true,
      sortValue: (b) => b.health,
      render: (b) => (
        <Badge tone={sevTone(b.severity)} mono>
          {b.health}
        </Badge>
      ),
    },
    {
      key: 'next_best_action',
      header: '⚡ Next best action',
      render: (b) => <NextAction label={b.next_best_action} />,
    },
  ];

  if (opts?.showRep !== false) {
    cols.push({
      key: 'rep',
      header: 'Rep',
      render: (b) => (
        <span className="text-xs">
          {b.rep}
          <span className="block text-faint">{b.branch}</span>
        </span>
      ),
    });
  }

  cols.push({
    key: 'idle_days',
    header: 'Idle',
    align: 'right',
    sortable: true,
    sortValue: (b) => b.idle_days,
    render: (b) => (
      <Badge tone={b.idle_days >= 14 ? 'danger' : b.idle_days >= 10 ? 'warning' : 'neutral'} mono>
        {b.idle_days}d
      </Badge>
    ),
  });

  return cols;
}
