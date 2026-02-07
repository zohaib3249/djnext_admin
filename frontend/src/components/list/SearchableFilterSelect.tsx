'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilterOption } from '@/hooks/useFilterOptions';

interface SearchableFilterSelectProps {
  options: FilterOption[];
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean | undefined) => void;
  label: string;
  placeholder?: string;
  className?: string;
}

export function SearchableFilterSelect({
  options,
  value,
  onChange,
  label,
  placeholder = 'All',
  className,
}: SearchableFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayLabel =
    value === undefined || value === ''
      ? placeholder
      : options.find((o) => o.value === value)?.label ?? String(value);

  const filtered =
    search.trim() === ''
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(search.trim().toLowerCase())
        );

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative w-full min-w-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded border border-input-border bg-input px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-card-hover focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer',
          value !== undefined && value !== ''
            ? 'font-medium text-primary border-primary/50'
            : 'text-muted-foreground'
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 truncate">{displayLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 flex flex-col rounded-lg border border-border bg-card shadow-lg overflow-hidden"
          role="listbox"
        >
          <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label}…`}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label={`Search ${label}`}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className={cn(
                'block w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors border-l-2 -ml-px',
                value === undefined || value === ''
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-transparent hover:bg-card-hover text-foreground'
              )}
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No matches
              </div>
            ) : (
              filtered.map((opt) => {
                const isActive = value === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(isActive ? undefined : opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'block w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors border-l-2 -ml-px',
                      isActive
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-transparent hover:bg-card-hover text-foreground'
                    )}
                    role="option"
                    aria-selected={isActive}
                  >
                    {opt.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
