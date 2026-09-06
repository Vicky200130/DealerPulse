'use client';

import { useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { STAGE_LABELS, type FunnelStep } from '@/types';
import { EmptyState } from './ui/EmptyState';

// The bar track sits after the rank badge and runs to the card edge.
const TRACK = { left: 36, right: 0 };

/**
 * Axis ticks for the funnel. The cap is the HIGHEST stage value itself (the top
 * of the funnel), so the tallest bar always lands exactly on the last gridline —
 * never short of it, never past it. In between sit round reference marks (0, 50,
 * 100 …); the last round mark is dropped if it would crowd the cap, so the
 * spacing near the end is uneven by design.
 */
function axisTicks(max: number): number[] {
  const m = Math.max(Math.round(max), 1);
  const rough = m / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((x) => x * pow).find((c) => c >= rough) ?? 10 * pow;
  const mids: number[] = [];
  for (let t = step; t < m - step * 0.5; t += step) mids.push(Math.round(t));
  return [0, ...mids, m];
}

export function Funnel({ steps, note }: { steps: FunnelStep[]; note?: React.ReactNode }) {
  const max = steps[0]?.count || 1;
  const ticks = axisTicks(max);
  const [grown, setGrown] = useState(false);
  const [trackW, setTrackW] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    const measure = () => el && setTrackW(el.clientWidth);
    measure();
    const id = requestAnimationFrame(() => setGrown(true));
    const ro = el ? new ResizeObserver(measure) : null;
    ro?.observe(el as Element);
    return () => {
      cancelAnimationFrame(id);
      ro?.disconnect();
    };
  }, []);

  // No leads reached even the first stage → nothing to funnel. Centered empty state.
  if (!steps.length || (steps[0]?.count ?? 0) === 0) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center">
        <EmptyState title="No leads yet" hint="Try a wider time range" icon={<Users size={20} strokeWidth={1.75} />} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* chart grows and centers vertically; the note stays pinned below */}
      <div className="flex flex-1 flex-col justify-center">
      <div className="relative">
        {/* dashed gridlines behind the bars, spanning only the track */}
        <div ref={trackRef} className="pointer-events-none absolute inset-y-0" style={{ left: TRACK.left, right: TRACK.right }} aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="dp-gridline absolute top-0 bottom-0" style={{ left: `${(t / max) * 100}%` }} />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {steps.map((s, i) => {
            // Zero-count stages render no stub bar and no "0" — just the label.
            const w = s.count === 0 ? 0 : Math.max(6, (s.count / max) * 100);
            const last = i === steps.length - 1;
            const label = STAGE_LABELS[s.stage] ?? s.stage;
            // Flip the label + count outside the bar when the bar is too narrow
            // to hold them (measured against the live track width).
            const needPx = label.length * 6.9 + String(s.count).length * 8.6 + 30;
            const inside = trackW === 0 || (trackW * w) / 100 >= needPx;
            // Hover breakdown: reps on a single-branch page, branches on the overview.
            const parts =
              s.by_rep?.map((r) => ({ name: r.rep, count: r.count })) ??
              s.by_branch?.map((b) => ({ name: b.branch, count: b.count })) ??
              [];
            return (
              <div key={s.stage} className="group relative grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-3">
                <span className="text-right font-mono text-xs text-faint">{i + 1}</span>
                <div className="relative h-[32px]">
                  <div
                    className={cn(
                      'flex h-full items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-md px-2.5 text-primary-fg transition-[width] duration-slow ease-out',
                      last ? 'bg-success' : 'bg-primary',
                    )}
                    style={{ width: grown ? `${w}%` : '0%' }}
                  >
                    {inside && (
                      <>
                        <span className="text-xs font-medium">{label}</span>
                        <span className="font-mono text-sm font-semibold">{s.count}</span>
                      </>
                    )}
                  </div>
                  {!inside && (
                    // Span from the bar end to the track's right edge (right-0) so
                    // a long label truncates instead of spilling off-screen; the
                    // count stays pinned and visible.
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2" style={{ left: `calc(${w}% + 8px)` }}>
                      <span className="min-w-0 truncate text-xs font-medium text-muted" title={label}>{label}</span>
                      {s.count > 0 && <span className="shrink-0 font-mono text-sm font-semibold text-text">{s.count}</span>}
                    </div>
                  )}
                </div>

                {/* hover: who contributed how many leads at this stage */}
                {parts.length > 0 && (
                  <div className="pointer-events-none absolute top-full left-9 z-30 mt-2 hidden w-max min-w-[200px] max-w-[260px] overflow-hidden rounded-lg border border-border bg-surface text-xs shadow-lg group-hover:block">
                    <div className="flex items-center justify-between gap-6 px-4 pt-3 pb-2.5 font-semibold">
                      <span>{label}</span>
                      <span className="font-mono text-muted">{s.count} leads</span>
                    </div>
                    <div className="flex flex-col gap-2.5 border-t border-border px-4 pt-2.5 pb-3">
                      {parts.map((p) => (
                        <div key={p.name} className="flex items-center justify-between gap-6">
                          <span className="text-muted">{p.name}</span>
                          <span className="font-mono font-semibold">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* x-axis — lead counts, capped at the top-of-funnel value */}
        <div className="relative mt-2 h-4" style={{ marginLeft: TRACK.left, marginRight: TRACK.right }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 font-mono text-3xs text-faint"
              style={{ left: `${(t / max) * 100}%`, transform: t === 0 ? 'none' : t === max ? 'translateX(-100%)' : 'translateX(-50%)' }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      </div>

      {note && (
        <div className="mt-3 rounded-sm bg-warning-soft px-2.5 py-2 text-xs font-medium text-warning">{note}</div>
      )}
    </div>
  );
}
