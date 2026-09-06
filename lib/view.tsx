'use client';

// Who is viewing the dashboard. There's no auth (the assignment says assume the
// CEO), so this is a persona switch: the "Viewing as" control writes a userContext
// to localStorage and every screen reads it from here. One role property drives
// both what's in the nav and how the data is scoped — no conditions sprinkled
// around the app.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type Role = 'admin' | 'branch_manager' | 'sales_rep';

export interface View {
  role: Role;
  name: string; // display name of the persona (a real person from the data)
  branchId?: string; // branch a manager (or a rep) belongs to
  branchName?: string;
  repId?: string; // rep, for the sales_rep role
}

// Default: the CEO sees everything, exactly as before roles existed.
export const DEFAULT_VIEW: View = { role: 'admin', name: 'Rahul Chopra' };

const STORAGE_KEY = 'dp-view';

const ViewContext = createContext<{ view: View; setView: (v: View) => void }>({
  view: DEFAULT_VIEW,
  setView: () => {},
});

export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<View>(DEFAULT_VIEW);

  // Hydrate from localStorage on mount. We start from the admin default so the
  // first paint is stable; a saved persona swaps in right after (a brief, one-off
  // switch, only when a non-default persona was chosen previously).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setViewState(JSON.parse(raw) as View);
    } catch {
      /* private mode / blocked storage — stay on the admin default */
    }
  }, []);

  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {
      /* ignore write failures — the in-memory view still updates */
    }
  };

  return <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>;
}

export function useView() {
  return useContext(ViewContext);
}

/**
 * Guard for admin-only pages (e.g. Branches): sends any non-admin role back to
 * the Overview and returns whether the current viewer is allowed, so the page
 * can render null while the redirect happens.
 */
export function useRequireAdmin(): boolean {
  const { view } = useView();
  const router = useRouter();
  const ok = view.role === 'admin';
  useEffect(() => {
    if (!ok) router.replace('/');
  }, [ok, router]);
  return ok;
}
