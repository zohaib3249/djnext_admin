'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { FieldSchema } from '@/types';

interface ManyToManyFieldProps {
  field: FieldSchema;
  value?: unknown;
  onChange?: (value: unknown) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

type Option = { id: number; text: string };

function normalizeValue(value: unknown): number[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => {
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'object' && v !== null && 'id' in v) return Number((v as { id: unknown }).id);
      if (typeof v === 'string') return parseInt(v, 10);
      return NaN;
    }).filter((n) => !Number.isNaN(n));
  }
  return [];
}

export function ManyToManyField({
  field,
  value,
  onChange,
  onBlur,
  error,
}: ManyToManyFieldProps) {
  const relation = field.relation;
  const selectedIds = normalizeValue(value);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Option[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const fetchOptions = useCallback(
    async (q = '') => {
      if (!relation) return [];
      setLoading(true);
      try {
        let res: { results?: Option[] };
        try {
          res = await api.autocomplete(relation.app_label, relation.model_name, q || undefined);
        } catch {
          res = await api.relationOptions(relation.app_label, relation.model_name, q || undefined, 50);
        }
        return res.results ?? [];
      } catch {
        return [];
      } finally {
        setLoading(false);
      }
    },
    [relation]
  );

  useEffect(() => {
    if (!relation) return;
    fetchOptions('').then(setOptions);
  }, [relation, fetchOptions]);

  useEffect(() => {
    if (!open) return;
    if (search.trim()) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        fetchOptions(search).then(setSearchResults);
      }, 200);
      return () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      };
    }
    setSearchResults(options.slice(0, 30));
  }, [open, search, options, fetchOptions]);

  const selectedOptions = selectedIds
    .map((id) => options.find((o) => o.id === id) ?? { id, text: `#${id}` })
    .filter((o) => o.id != null);

  const addId = (id: number) => {
    if (selectedIds.includes(id)) return;
    onChange?.(selectedIds.concat(id));
    setSearch('');
  };

  const removeId = (id: number) => {
    onChange?.(selectedIds.filter((x) => x !== id));
  };

  const availableToAdd = searchResults.filter((o) => !selectedIds.includes(o.id));

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={field.name}
        className="block text-sm font-medium text-foreground"
      >
        {field.verbose_name}
        {field.required && !field.nullable && (
          <span className="text-destructive ml-0.5">*</span>
        )}
      </label>

      <div
        className={cn(
          'min-h-[2.5rem] rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent',
          error && 'border-destructive focus-within:ring-destructive'
        )}
      >
        {/* Selected chips */}
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-foreground"
            >
              {opt.text}
              {!field.readonly && (
                <button
                  type="button"
                  onClick={() => removeId(opt.id)}
                  className="rounded p-0.5 hover:bg-primary/30 focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label={`Remove ${opt.text}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}

          {/* Add dropdown */}
          {!field.readonly && (
            <div className="relative inline-block" ref={containerRef}>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-muted-foreground hover:border-primary hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="text-xs">Add</span>
              </button>

              {open && (
                <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-card shadow-lg">
                  <div className="border-b border-border p-2">
                    <input
                      type="search"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded border border-input-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-auto p-1">
                    {availableToAdd.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground">
                        {search ? 'No matches' : 'Loading...'}
                      </p>
                    ) : (
                      availableToAdd.slice(0, 30).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => addId(opt.id)}
                          className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-card-hover focus:outline-none focus:bg-card-hover"
                        >
                          {opt.text}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {field.help_text && !error && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
      {error?.message && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}
