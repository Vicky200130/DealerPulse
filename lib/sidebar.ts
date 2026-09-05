'use client';

export type SidebarState = 'expanded' | 'collapsed';

const KEY = 'dp-sidebar';

/** Persist the collapse state and reflect it on <html> for CSS to react to. */
export function applySidebar(s: SidebarState) {
  document.documentElement.setAttribute('data-sidebar', s);
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* ignore */
  }
}

/** Flip the current state — read from the DOM so it needs no React state. */
export function toggleSidebar() {
  const cur = document.documentElement.getAttribute('data-sidebar');
  applySidebar(cur === 'collapsed' ? 'expanded' : 'collapsed');
}

// Inline script (stringified) run before paint so a collapsed rail never
// flashes open on reload — mirrors the theme's NO_FLASH_SCRIPT.
export const SIDEBAR_NO_FLASH_SCRIPT = `(function(){try{var s=localStorage.getItem('dp-sidebar');document.documentElement.setAttribute('data-sidebar',s==='collapsed'?'collapsed':'expanded');}catch(e){}})();`;
