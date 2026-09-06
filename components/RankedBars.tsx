'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { EmptyState } from './ui/EmptyState';
import { InsightNote } from './InsightNote';

// Ranked horizontal bars in the same visual language as the funnel: the label
// sits inside the bar on the left, the count inside on the right, over dashed
// gridlines with an axis. When a bar is too short to hold its label + count,
// they flip outside to the right. On hover a row reveals its per-branch
// breakdown (same as the funnel), and an optional note surfaces an insight.
type Slice = { branch: string; count: number };
type Item = { label: string; value: number; by_branch?: Slice[] };

function axisTicks(max: number): number[] {
  const m = Math.max(Math.round(max), 1);
  const rough = m / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((x) => x * pow).find((c) => c >= rough) ?? 10 * pow;
  const mids: number[] = [];
  for (let t = step; t < m - step * 0.5; t += step) mids.push(Math.round(t));
  return [0, ...mids, m];
}

export function RankedBars({
  items,
  color = 'primary',
  unit = 'leads',
  note,
  emptyLabel = 'No data yet',
  emptyIcon,
  showAxis = true,
  showRank = true,
}: {
  items: Item[];
  color?: 'primary' | 'success';
  unit?: string;
  note?: React.ReactNode;
  emptyLabel?: string;
  emptyIcon?: React.ReactNode;
  showAxis?: boolean;
  showRank?: boolean;
}) {
  // Drop zero-value rows — a ranked list shouldn't show empty bars.
  const shown = items.filter((i) => i.value > 0);
  const max = Math.max(...shown.map((i) => i.value), 1);
  const ticks = axisTicks(max);
  const [grown, setGrown] = useState(false);
  const [trackW, setTrackW] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const trackLeft = showRank ? 36 : 0;
  const barBg = color === 'success' ? 'bg-success' : 'bg-primary';

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

  if (!shown.length) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center">
        <EmptyState title={emptyLabel} hint="Try a wider time range" icon={emptyIcon} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* chart grows and centers vertically; the insight note stays pinned below */}
      <div className="flex flex-1 flex-col justify-center">
      <div className="relative">
        {/* dashed gridlines behind the bars, spanning only the bar track */}
        <div ref={trackRef} className="pointer-events-none absolute inset-y-0" style={{ left: trackLeft, right: 0 }} aria-hidden="true">
          {showAxis &&
            ticks.map((t) => (
              <span key={t} className="dp-gridline absolute top-0 bottom-0" style={{ left: `${(t / max) * 100}%` }} />
            ))}
        </div>

        <div className="flex flex-col gap-2">
          {shown.map((it, i) => {
            const w = Math.max(6, (it.value / max) * 100);
            const needPx = it.label.length * 6.9 + String(it.value).length * 8.6 + 30;
            const inside = trackW === 0 || (trackW * w) / 100 >= needPx;
            return (
              <div key={it.label} className={cn('group relative grid items-center gap-x-3', showRank ? 'grid-cols-[24px_minmax(0,1fr)]' : 'grid-cols-1')}>
                {showRank && <span className="text-right font-mono text-xs text-faint">{i + 1}</span>}
                <div className="relative h-[32px]">
                  <div
                    className={cn(
                      'flex h-full items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-md px-2.5 text-primary-fg transition-[width] duration-slow ease-out',
                      barBg,
                    )}
                    style={{ width: grown ? `${w}%` : '0%' }}
                  >
                    {inside && (
                      <>
                        <span className="text-xs font-medium">{it.label}</span>
                        <span className="font-mono text-sm font-semibold">{it.value}</span>
                      </>
                    )}
                  </div>
                  {!inside && (
                    // Span from the bar end to the track's right edge (right-0) so
                    // a long label truncates instead of spilling off-screen; the
                    // count stays pinned and visible.
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2" style={{ left: `calc(${w}% + 8px)` }}>
                      <span className="min-w-0 truncate text-xs font-medium text-muted" title={it.label}>{it.label}</span>
                      <span className="shrink-0 font-mono text-sm font-semibold text-text">{it.value}</span>
                    </div>
                  )}
                </div>

                {/* hover: which branch contributed how many. Opens ABOVE the bar
                    so the last rows don't push the tooltip past the card and grow
                    the page (which caused a scrollbar flicker). */}
                {it.by_branch && it.by_branch.length > 0 && (
                  <div className="pointer-events-none absolute bottom-full z-30 mb-2 hidden w-max min-w-[200px] max-w-[260px] overflow-hidden rounded-lg border border-border bg-surface text-xs shadow-lg group-hover:block" style={{ left: trackLeft }}>
                    <div className="flex items-center justify-between gap-6 px-4 pt-3 pb-2.5 font-semibold">
                      <span>{it.label}</span>
                      <span className="font-mono text-muted">{it.value} {unit}</span>
                    </div>
                    <div className="flex flex-col gap-2.5 border-t border-border px-4 pt-2.5 pb-3">
                      {it.by_branch.map((b) => (
                        <div key={b.branch} className="flex items-center justify-between gap-6">
                          <span className="text-muted">{b.branch}</span>
                          <span className="font-mono font-semibold">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showAxis && (
          <div className="relative mt-2 h-4" style={{ marginLeft: trackLeft }}>
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
        )}
      </div>
      </div>

      {note && <InsightNote>{note}</InsightNote>}
    </div>
  );
}
