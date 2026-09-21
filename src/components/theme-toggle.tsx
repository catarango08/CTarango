'use client';

import { useEffect, useState } from 'react';

type Theme = 'day' | 'night';
const KEY = 'tarango-theme';

/**
 * Day is the default — this is a truck app and most calls happen in daylight.
 * Night exists for attics, crawl spaces and after-dark service work.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('day');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY) as Theme | null;
      if (stored === 'day' || stored === 'night') setTheme(stored);
    } catch {
      // Private mode or blocked storage: day is a fine default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Not worth failing the render over.
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="btn no-print"
      onClick={() => setTheme((t) => (t === 'day' ? 'night' : 'day'))}
      aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} mode`}
      title={`Switch to ${theme === 'day' ? 'night' : 'day'} mode`}
    >
      {theme === 'day' ? '☾ Night' : '☀ Day'}
    </button>
  );
}

/** Applies the stored theme before paint so the page never flashes. */
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem('${KEY}');document.documentElement.setAttribute('data-theme',t==='night'?'night':'day');}catch(e){document.documentElement.setAttribute('data-theme','day');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
