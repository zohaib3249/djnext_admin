'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'djnext-theme';

export type Theme = 'light' | 'dark' | 'system';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    typeof window === 'undefined' ? 'dark' : getSystemTheme()
  );

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    const resolve = (): ResolvedTheme => {
      if (stored === 'light') return 'light';
      if (stored === 'dark') return 'dark';
      return getSystemTheme();
    };
    const resolved = resolve();
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  const setTheme = useMemo(
    () =>
      (next: Theme) => {
        setThemeState(next);
        localStorage.setItem(STORAGE_KEY, next);
        const resolved: ResolvedTheme =
          next === 'light' ? 'light' : next === 'dark' ? 'dark' : getSystemTheme();
        setResolvedTheme(resolved);
        applyTheme(resolved);
      },
    []
  );

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = mq.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
