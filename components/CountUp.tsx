'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number up to `value` on mount and on change, formatting each
 * frame with `format`. Robust by design: it initialises to the real value and
 * skips the animation when the tab is hidden or reduced-motion is set (and
 * guarantees the final value via a safety timer), so the number is never left
 * stuck at 0 when requestAnimationFrame is throttled. Used for KPI headlines.
 */
export function CountUp({
  value,
  format,
  duration = 700,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  // Start at the true value so a non-animating render is still correct.
  const [display, setDisplay] = useState(value);
  const from = useRef<number | null>(null); // null until the first client effect

  useEffect(() => {
    const start = from.current ?? 0; // reveal from 0 on first mount
    from.current = value;

    const reduce =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        (typeof document !== 'undefined' && document.hidden));

    if (reduce || start === value) {
      setDisplay(value);
      return;
    }

    setDisplay(start);
    let raf = 0;
    const t0 = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setDisplay(start + (value - start) * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    // Belt-and-suspenders: force the final value even if rAF never fires.
    const safety = setTimeout(() => setDisplay(value), duration + 200);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}
