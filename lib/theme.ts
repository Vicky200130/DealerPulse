'use client';

export type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const s = localStorage.getItem('dp-theme');
    if (s === 'light' || s === 'dark') return s;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  try {
    localStorage.setItem('dp-theme', t);
  } catch {
    /* ignore */
  }
}

// Inline script (stringified) run before paint to avoid a theme flash.
export const NO_FLASH_SCRIPT = `(function(){try{var s=localStorage.getItem('dp-theme');var d=s?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',d);}catch(e){}})();`;
