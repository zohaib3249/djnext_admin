'use client';

import { useState } from 'react';
import { Menu, User, LogOut, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { GlobalSearch } from './GlobalSearch';
import type { User as UserType } from '@/types';

interface HeaderProps {
  user: UserType;
  siteName: string;
  onMenuClick: () => void;
  onLogout: () => void;
}

export function Header({ user, siteName, onMenuClick, onLogout }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4">
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-card-hover hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-foreground truncate hidden sm:block">
          {siteName}
        </h1>
      </div>

      <GlobalSearch />

      <div className="flex items-center gap-2 shrink-0">
        {/* Theme switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setThemeOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-card-hover hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            aria-label="Theme"
            aria-expanded={themeOpen}
          >
            {resolvedTheme === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>
          {themeOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setThemeOpen(false)}
              />
              <div
                className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-border bg-card py-1 shadow-lg animate-fade-in"
                role="menu"
              >
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTheme(t);
                      setThemeOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                      theme === t
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-card-hover'
                    }`}
                  >
                    {t === 'light' && <Sun className="h-4 w-4" />}
                    {t === 'dark' && <Moon className="h-4 w-4" />}
                    {t === 'system' && <Monitor className="h-4 w-4" />}
                    <span className="capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors duration-200 hover:bg-card-hover focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <User className="h-5 w-5 text-muted-foreground" />
          <span className="max-w-[120px] truncate">{user.username}</span>
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg animate-fade-in"
              role="menu"
            >
              <div className="border-b border-border px-3 py-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-card-hover cursor-pointer"
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </header>
  );
}
