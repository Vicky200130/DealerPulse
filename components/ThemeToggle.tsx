'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => setTheme(getStoredTheme()), []);

  const toggle = () => {
    const t: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(t);
    applyTheme(t);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light / dark theme"
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-fg transition-colors duration-fast"
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
