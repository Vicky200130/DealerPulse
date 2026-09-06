'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import { useView, type Role, type View } from '@/lib/view';
import type { BranchHealth, LeaderRow } from '@/types';

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const ROLE_LABEL: Record<Role, string> = {
  admin: 'CEO',
  branch_manager: 'Branch manager',
  sales_rep: 'Sales executive',
};

const subLabel = (v: View) => (v.branchName ? `${ROLE_LABEL[v.role]} · ${v.branchName}` : ROLE_LABEL[v.role]);
const sameView = (a: View, b: View) => a.role === b.role && a.branchId === b.branchId && a.repId === b.repId;

/**
 * Floating "Viewing as" control — there's no auth, so this demonstrates the
 * role-scoped views. It sits bottom-right, on top of everything, and is draggable
 * anywhere so it never hides what's behind it. Three fixed personas: the CEO, one
 * branch manager (Eastside), and one sales executive (Eastside), all real people
 * from the data. Clicking re-scopes the whole app.
 */
export function ViewSwitcher() {
  const { view, setView } = useView();
  const { data: branches } = useApi<BranchHealth[]>('/branches');
  const { data: reps } = useApi<LeaderRow[]>('/reps');
  const [open, setOpen] = useState(false);

  // Position: null = default corner (via CSS); once dragged, an absolute point.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ px: 0, py: 0, left: 0, top: 0, active: false, moved: false });

  // Build the three personas from real data (Eastside's manager + top rep).
  const east =
    (branches ?? []).find((b) => /eastside/i.test(b.name)) ?? (branches ?? []).find((b) => b.manager) ?? null;
  const topRep = east ? (reps ?? []).find((r) => r.branch === east.name) ?? null : null;
  const personas: View[] = [
    { role: 'admin', name: 'Rahul Chopra' },
    ...(east ? [{ role: 'branch_manager' as const, name: east.manager, branchId: east.id, branchName: east.name }] : []),
    ...(east && topRep
      ? [{ role: 'sales_rep' as const, name: topRep.name, branchId: east.id, branchName: east.name, repId: topRep.id }]
      : []),
  ];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { px: e.clientX, py: e.clientY, left: rect.left, top: rect.top, active: true, moved: false };
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* not a real pointer (or capture unavailable) — dragging still works */
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (d.moved) {
      const w = rootRef.current?.offsetWidth ?? 0;
      const h = rootRef.current?.offsetHeight ?? 0;
      setPos({
        left: Math.min(Math.max(8, d.left + dx), window.innerWidth - w - 8),
        top: Math.min(Math.max(8, d.top + dy), window.innerHeight - h - 8),
      });
    }
  };
  const onPointerUp = () => {
    drag.current.active = false;
  };
  // Toggle the menu only on a real click (not at the end of a drag). Keyboard
  // activation has no pointer movement, so it still works.
  const onClick = () => {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <div
      ref={rootRef}
      className={cn('fixed z-50 select-none', pos ? '' : 'right-4 bottom-20 lg:bottom-6')}
      style={pos ? { left: pos.left, top: pos.top } : undefined}
    >
      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 mb-2 w-[260px] overflow-hidden rounded-lg border border-border bg-surface py-1 text-text shadow-xl"
        >
          <div className="px-3 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-wide text-faint">Viewing as</div>
          {personas.map((p) => {
            const current = sameView(p, view);
            return (
              <button
                key={`${p.role}:${p.branchId ?? ''}:${p.repId ?? ''}`}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                onClick={() => {
                  setView(p);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-fast hover:bg-surface-2',
                  current && 'bg-surface-2',
                )}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-primary-100 text-primary-700 text-2xs font-bold font-display">
                  {initials(p.name)}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-xs font-semibold">{p.name}</span>
                  <span className="block truncate text-2xs text-muted">{subLabel(p)}</span>
                </span>
                {current && <Check size={15} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        className="flex cursor-grab items-center gap-2 rounded-pill border border-border bg-surface py-2 pl-2 pr-3 shadow-lg transition-shadow duration-fast hover:shadow-xl active:cursor-grabbing"
        title="Drag to move · click to switch who you're viewing as"
      >
        <GripVertical size={15} className="shrink-0 text-faint" />
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-primary text-primary-fg text-2xs font-bold font-display">
          {initials(view.name)}
        </span>
        <span className="min-w-0 leading-tight text-left">
          <span className="block text-3xs font-semibold uppercase tracking-wide text-faint">Viewing as</span>
          <span className="block truncate text-xs font-semibold text-text">
            {view.name} <span className="font-normal text-muted">· {ROLE_LABEL[view.role]}</span>
          </span>
        </span>
        <ChevronDown size={15} className={cn('shrink-0 text-faint transition-transform duration-fast', open && 'rotate-180')} />
      </button>
    </div>
  );
}
