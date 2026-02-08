'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { LayoutId, LayoutConfig } from '@/types';

const STORAGE_KEY = 'djnext-layout';

interface LayoutContextType {
  layout: LayoutId;
  setLayout: (layout: LayoutId) => void;
  allowSwitch: boolean;
  options: LayoutId[];
  isLoading: boolean;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

function getStoredLayout(): LayoutId | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY) as LayoutId | null;
}

interface LayoutProviderProps {
  children: ReactNode;
  config?: LayoutConfig;
}

export function LayoutProvider({ children, config }: LayoutProviderProps) {
  const [layout, setLayoutState] = useState<LayoutId>('basic');
  const [isLoading, setIsLoading] = useState(true);

  // Derived values from config
  const defaultLayout = config?.current ?? 'basic';
  const allowSwitch = config?.allow_switch ?? false;
  const options = useMemo(() => config?.options ?? ['basic'], [config?.options]);

  // Initialize/update layout when config changes
  useEffect(() => {
    const stored = getStoredLayout();

    if (allowSwitch && stored && options.includes(stored)) {
      setLayoutState(stored);
    } else {
      setLayoutState(defaultLayout);
    }
    setIsLoading(false);
  }, [config, defaultLayout, allowSwitch, options]);

  // Apply layout class to document
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Remove all layout classes
    root.classList.remove('layout-basic', 'layout-glassmorphism', 'layout-aurora', 'layout-neumorphism', 'layout-minimal');

    // Add current layout class
    root.classList.add(`layout-${layout}`);

    // Set CSS variable for layout
    root.style.setProperty('--current-layout', layout);
  }, [layout]);

  const setLayout = useCallback(
    (next: LayoutId) => {
      if (!allowSwitch) return;
      if (!options.includes(next)) return;

      setLayoutState(next);
      localStorage.setItem(STORAGE_KEY, next);
    },
    [allowSwitch, options]
  );

  const value = useMemo(
    () => ({
      layout,
      setLayout,
      allowSwitch,
      options,
      isLoading,
    }),
    [layout, setLayout, allowSwitch, options, isLoading]
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}
