import { Badge } from './ui/Badge';
import type { Column } from './ui/Table';
import { formatINR } from '@/lib/format';
import { STAGE_LABELS, type Bottleneck, type BottleneckCategory } from '@/types';

// The three triage buckets, shown as a chip so it's instantly clear whether a
// row is a sales follow-up, a delivery chase, or a dead deal to close — the
// distinction the old flat "Health: 0" column hid.
const CATEGORY_META: Record<BottleneckCategory, { label: string; cls: string }> = {
  follow_up: { label: 'Follow-up', cls: 'bg-primary-100 text-primary-700' },
  delivery: { label: 'Delivery', cls: 'bg-warning-soft text-warning' },
  stale: { label: 'Likely dead', cls: 'bg-surface-2 text-muted' },
};

// A stage-specific instruction reads as "urgent" when it demands a call, a
// manager, or an escalation/close decision — those get the red treatment.
function NextAction({ label }: { label: string }) {
  const l = label.toLowerCase();
  const urgent = l.includes('call now') || l.includes('manager') || l.includes('escalate') || l.includes('revive');
  return (
    <span
      className={
        'inline-block rounded-sm px-2 py-1 text-2xs font-semibold ' +
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
      key: 'category',
      header: 'Type',
      render: (b) => {
        const m = CATEGORY_META[b.category];
        return <span className={`inline-block rounded-pill px-2 py-0.5 text-2xs font-semibold ${m.cls}`}>{m.label}</span>;
      },
    },
    {
      key: 'next_best_action',
      header: 'Next best action',
      // The widest column — allow it to wrap so it yields space instead of
      // squeezing the name/rep columns into word-by-word wrapping.
      wrap: true,
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
      <Badge tone={b.idle_days >= 60 ? 'danger' : b.idle_days >= 14 ? 'warning' : 'neutral'} mono>
        {b.idle_days}d
      </Badge>
    ),
  });

  return cols;
}
