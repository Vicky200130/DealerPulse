'use client';

// Who is viewing the dashboard. The role is the demo stand-in for auth: a
// "Viewing as" control writes this context to localStorage, and it rides on
// every API request (base64 `extended-data` header) so the BACKEND — not the
// browser — enforces what each role may see. One role property drives both the
// nav and the data scope, so there are no conditions sprinkled around the app.
//
// Fields are snake_case to match exactly what is stored, sent on the wire, and
// read by FastAPI — one vocabulary from localStorage → header → backend.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { setApiView } from './api';

export type Role = 'admin' | 'branch_manager' | 'sales_rep';

export interface View {
  user_role: Role;
  name: string; // display name of the persona (a real person from the data)
  branch_id?: string; // branch a manager (or a rep) belongs to
  branch_name?: string;
  rep_id?: string; // rep, for the sales_rep role
}

// Default: the CEO sees everything, exactly as before roles existed.
export const DEFAULT_VIEW: View = { user_role: 'admin', name: 'Rahul Chopra' };

const STORAGE_KEY = 'dp-view';

// Keep the outgoing API header in step with the active view.
function publish(v: View) {
  setApiView({ user_role: v.user_role, name: v.name, branch_id: v.branch_id, branch_name: v.branch_name, rep_id: v.rep_id });
}

const ViewContext = createContext<{ view: View; setView: (v: View) => void }>({
  view: DEFAULT_VIEW,
  setView: () => {},
});

export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<View>(DEFAULT_VIEW);

  // Hydrate from localStorage on mount. We start from the admin default so the
  // first paint is stable; a saved persona swaps in right after and republishes
  // the header (a brief, one-off switch, only when a non-default persona was
  // chosen previously).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const v = JSON.parse(raw) as View;
        setViewState(v);
        publish(v);
      }
    } catch {
      /* private mode / blocked storage — stay on the admin default */
    }
  }, []);

  const setView = (v: View) => {
    setViewState(v);
    publish(v);
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
  const ok = view.user_role === 'admin';
  useEffect(() => {
    if (!ok) router.replace('/');
  }, [ok, router]);
  return ok;
}
