'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [options, setOptions] = useState<Array<{ id: number | string; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const fetchOptions = useCallback(
    async (q = '') => {
      if (!relation) return;
      setLoading(true);
      try {
        let res: { results?: Array<{ id: number; text: string }> };
        try {
          res = await api.autocomplete(
            relation.app_label,
            relation.model_name,
            q || undefined
          );
        } catch {
          res = await api.relationOptions(
            relation.app_label,
            relation.model_name,
            q || undefined,
            50
          );
        }
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

  const rawId = value === null || value === undefined || value === ''
    ? undefined
    : typeof value === 'object' && value !== null && 'id' in value
      ? (value as { id: unknown }).id
      : value;
  const valueStr = rawId === undefined || rawId === null ? undefined : String(rawId);
  // Ensure current value has a matching Select.Item so Radix shows it (options can be empty after close/refetch)
  const optionsWithSelected = useMemo(() => {
    if (!valueStr) return options;
    if (options.some((o) => String(o.id) === valueStr)) return options;
    return [{ id: valueStr, text: `#${valueStr}` }, ...options];
  }, [options, valueStr]);
  const selected = optionsWithSelected.find((o) => String(o.id) === valueStr);

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
        value={valueStr ?? '__null__'}
        onValueChange={(v) => {
          // Only treat __null__ as "clear"; ignore '' from Radix (it can fire when value briefly doesn't match an item)
          if (v === '__null__') {
            onChange?.(null);
            return;
          }
          if (v === '') return;
          const num = Number(v);
          onChange?.(Number.isNaN(num) ? v : num);
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
            {selected ? selected.text : valueStr != null ? `#${valueStr}` : null}
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
            {/* Always render __null__ so Radix has a matching value when empty (avoids blank trigger) */}
            <Select.Item
              value="__null__"
              className="relative flex cursor-pointer select-none items-center rounded px-3 py-2 pl-8 text-sm text-foreground outline-none data-[highlighted]:bg-card-hover"
            >
              <Select.ItemIndicator className="absolute left-2 flex w-4 items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </Select.ItemIndicator>
              {field.nullable ? '(empty)' : 'Select...'}
            </Select.Item>
            {optionsWithSelected.map((opt) => (
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
