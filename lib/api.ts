// Thin fetch helper for the FastAPI backend. All endpoints live under /api.
//
// Every request carries the active view as an `extended-data` header (base64 of
// the view JSON) so the backend can enforce role scope. apiGet is a plain
// function, not a hook, so the ViewProvider publishes the current view here via
// setApiView() and apiGet reads it from this module-level variable.

// The active viewer context, in the snake_case shape the backend expects.
type ApiView = { user_role: string; name?: string; branch_id?: string; branch_name?: string; rep_id?: string };
let currentView: ApiView | null = null;

/** Called by ViewProvider whenever the view changes (and on hydration). */
export function setApiView(v: ApiView | null): void {
  currentView = v;
  // A role switch changes what the backend returns for the same path, so any
  // cached static list from the previous role must not be reused.
  listCache.clear();
}

// Unicode-safe base64 that works in the browser and during SSR.
function b64(s: string): string {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(s)));
  return Buffer.from(s, 'utf-8').toString('base64');
}

function authHeaders(): Record<string, string> {
  if (!currentView) return {};
  try {
    return { 'extended-data': b64(JSON.stringify(currentView)) };
  } catch {
    return {};
  }
}

async function doFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { cache: 'no-store', headers: authHeaders() });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// The two static lists (/branches, /reps, /reps?branch=X) populate filters and
// the branch dropdown on nearly every page — but they don't change within a
// session. Cache the in-flight promise (keyed by path AND the current view, so a
// role switch refetches) to stop the repeat network churn. Ranged/other calls
// are never cached.
const listCache = new Map<string, Promise<unknown>>();
const CACHEABLE = /^\/(branches|reps)(\?branch=[A-Za-z0-9]+)?$/;

export async function apiGet<T>(path: string): Promise<T> {
  if (CACHEABLE.test(path)) {
    const key = `${currentView ? JSON.stringify(currentView) : ''}|${path}`;
    const hit = listCache.get(key);
    if (hit) return hit as Promise<T>;
    const p = doFetch<T>(path);
    p.catch(() => listCache.delete(key)); // never cache a failure
    listCache.set(key, p);
    return p;
  }
  return doFetch<T>(path);
}
