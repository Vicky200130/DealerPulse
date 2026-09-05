'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Health } from '@/types';

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Health>('/health')
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg bg-surface border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-fg font-display font-bold">
            DP
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight">DealerPulse</h1>
            <p className="text-faint text-xs font-mono uppercase tracking-widest">project setup</p>
          </div>
        </div>

        {error && (
          <p className="text-danger text-sm">
            Backend not reachable ({error}). Start the API with <code className="font-mono">npm run api</code>.
          </p>
        )}
        {!health && !error && <p className="text-muted text-sm">Checking backend…</p>}
        {health && (
          <div className="text-sm">
            <p className="text-success font-semibold mb-3">✓ Backend connected — dataset loaded</p>
            <ul className="space-y-1 font-mono text-text">
              <li>Branches: {health.branches}</li>
              <li>Sales reps: {health.sales_reps}</li>
              <li>Leads: {health.leads}</li>
              <li>Deliveries: {health.deliveries}</li>
              <li className="text-muted">{health.date_range}</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
