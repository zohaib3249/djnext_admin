'use client';

import { useState, useEffect, useCallback } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { FieldSchema } from '@/types';

interface RelationFieldProps {
  field: FieldSchema;
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

export function RelationField({
  field,
  value,
  onChange,
  onBlur,
  error,
}: RelationFieldProps) {
  const relation = field.relation;
  const [options, setOptions] = useState<Array<{ id: number; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const fetchOptions = useCallback(
    async (q = '') => {
      if (!relation) return;
      setLoading(true);
      try {
        const res = await api.autocomplete(
          relation.app_label,
          relation.model_name,
          q || undefined
        );
        setOptions(res.results ?? []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [relation]
  );

  useEffect(() => {
    if (!relation) return;
    fetchOptions(search);
  }, [relation, search, fetchOptions]);

  const valueNum = value === null || value === undefined ? null : Number(value);
  const selected = options.find((o) => o.id === valueNum);

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
      <Select.Root
        value={valueNum != null ? String(valueNum) : undefined}
        onValueChange={(v) => {
          if (v === '' || v === '__null__') onChange?.(null);
          else {
            const n = Number(v);
            onChange?.(Number.isNaN(n) ? null : n);
          }
        }}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) onBlur?.();
          else if (options.length === 0) fetchOptions();
        }}
        disabled={field.readonly}
      >
        <Select.Trigger
          id={field.name}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
            error && 'border-destructive focus:ring-destructive'
          )}
        >
          <Select.Value placeholder={loading ? 'Loading...' : 'Select...'}>
            {selected ? selected.text : valueNum != null ? `#${valueNum}` : null}
          </Select.Value>
          <Select.Icon>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-60 overflow-auto rounded-lg border border-border bg-card shadow-lg animate-fade-in"
          >
            <div className="p-2 border-b border-border">
              <input
                type="search"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-input-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {field.nullable && (
              <Select.Item
                value="__null__"
                className="relative flex cursor-pointer select-none items-center rounded px-3 py-2 pl-8 text-sm text-foreground outline-none data-[highlighted]:bg-card-hover"
              >
                <Select.ItemIndicator className="absolute left-2 flex w-4 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </Select.ItemIndicator>
                (empty)
              </Select.Item>
            )}
            {options.map((opt) => (
              <Select.Item
                key={opt.id}
                value={String(opt.id)}
                className="relative flex cursor-pointer select-none items-center rounded px-3 py-2 pl-8 text-sm text-foreground outline-none data-[highlighted]:bg-card-hover"
              >
                <Select.ItemIndicator className="absolute left-2 flex w-4 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </Select.ItemIndicator>
                {opt.text}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {field.help_text && !error && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
      {error?.message && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}
