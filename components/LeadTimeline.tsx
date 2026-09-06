import { Phone, Radio, User, CalendarClock, Check, MapPin, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { STAGE_LABELS, SOURCE_LABELS, type Bottleneck } from '@/types';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
}

function Meta({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm bg-surface px-3 py-2">
      <div className="mb-0.5 flex items-center gap-1 text-2xs font-medium uppercase tracking-wide text-faint">
        {icon}
        {label}
      </div>
      <div className="text-sm text-text">{children}</div>
    </div>
  );
}

/**
 * The expanded detail panel for a stuck lead: a contact/meta strip plus the
 * full stage-by-stage journey (date, dwell time and note per transition), with
 * the current stuck stage flagged. Driven entirely by the Bottleneck payload,
 * so it drops into any table that lists leads (bottlenecks, branch, rep).
 */
export function LeadTimeline({ lead }: { lead: Bottleneck }) {
  const journey = [...lead.status_history].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  return (
    <div className="dp-rise flex flex-col gap-lg p-lg">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Meta icon={<Phone size={12} />} label="Phone">
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} className="font-mono text-primary-600 hover:underline">
              {lead.phone}
            </a>
          ) : (
            <span className="text-faint">—</span>
          )}
        </Meta>
        <Meta icon={<Radio size={12} />} label="Source">
          {SOURCE_LABELS[lead.source] ?? lead.source ?? '—'}
        </Meta>
        <Meta icon={<User size={12} />} label="Rep · Branch">
          {lead.rep}
          <span className="block text-xs text-faint">{lead.branch}</span>
        </Meta>
        <Meta icon={<CalendarClock size={12} />} label="Expected close">
          {lead.expected_close_date ? fmtDate(lead.expected_close_date) : <span className="text-faint">—</span>}
        </Meta>
      </div>

      <div>
        <div className="mb-3 text-2xs font-medium uppercase tracking-wide text-faint">Lead journey</div>
        {journey.length === 0 ? (
          <div className="text-sm text-faint">No journey recorded.</div>
        ) : (
          <div className="relative">
            {journey.map((ev, i) => {
              const last = i === journey.length - 1;
              const gap = i > 0 ? daysBetween(journey[i - 1].timestamp, ev.timestamp) : null;
              return (
                <div key={ev.timestamp + ev.status} className={cn('relative flex gap-3', !last && 'pb-5')}>
                  {!last && (
                    <span className="absolute left-[7px] top-4 bottom-0 border-l border-dashed border-border" aria-hidden />
                  )}
                  <span
                    className={cn(
                      'z-[1] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-pill',
                      last ? 'bg-danger text-white' : 'border-2 border-success bg-surface-2 text-success',
                    )}
                  >
                    {last ? <MapPin size={9} /> : <Check size={9} strokeWidth={3} />}
                  </span>
                  <div className="-mt-0.5 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn('text-sm font-medium', last && 'text-danger')}>
                        {STAGE_LABELS[ev.status] ?? ev.status}
                        {gap !== null && (
                          <span className="ml-1.5 text-2xs font-normal text-faint">
                            · {gap === 0 ? 'same day' : `${gap} day${gap === 1 ? '' : 's'} later`}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-2xs text-faint">{fmtDate(ev.timestamp)}</span>
                    </div>
                    {ev.note && <div className="mt-0.5 text-xs text-muted">{ev.note}</div>}
                    {last && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-danger-soft px-2.5 py-1 text-xs text-danger">
                        <AlertTriangle size={12} />
                        Stuck here {lead.idle_days} day{lead.idle_days === 1 ? '' : 's'} · {lead.next_best_action}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
