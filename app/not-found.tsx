import Link from 'next/link';
import { Activity, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center px-lg text-center">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-fg">
          <Activity size={20} />
        </span>
        <span className="font-display text-lg font-extrabold text-text">DealerPulse</span>
      </div>

      <div className="font-mono text-[80px] font-semibold leading-none text-text sm:text-[100px]">404</div>

      {/* On-brand motif: a pulse line that flatlines — no signal found */}
      <svg
        viewBox="0 0 320 40"
        className="mt-3 w-[240px] text-primary sm:w-[280px]"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M0 20 H118 l9 -13 l10 26 l8 -13 H320"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <h1 className="mt-6 font-display text-2xl font-extrabold text-text">This page has no pulse</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors duration-fast ease-out hover:bg-primary-600"
        >
          <ArrowLeft size={15} />
          Back to Overview
        </Link>
        <Link
          href="/bottlenecks"
          className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors duration-fast ease-out hover:bg-surface-2"
        >
          View bottlenecks
        </Link>
      </div>
    </div>
  );
}
