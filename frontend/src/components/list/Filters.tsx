'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ModelSchema } from '@/types';

interface FiltersProps {
  schema: ModelSchema;
  values: Record<string, string | number | undefined>;
  onChange: (values: Record<string, string | number | undefined>) => void;
  onClear: () => void;
  className?: string;
}

export function Filters({
  schema,
  values,
  onChange,
  onClear,
  className,
}: FiltersProps) {
  const filterFields = useMemo(() => {
    const names = schema.list_filter ?? [];
    return names
      .map((name) => schema.fields?.find((f) => f.name === name))
      .filter(Boolean) as NonNullable<ModelSchema['fields']>[number][];
  }, [schema.list_filter, schema.fields]);

  if (filterFields.length === 0) return null;

  const hasActiveFilters = Object.values(values).some(
    (v) => v !== undefined && v !== ''
  );

  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3',
        className
      )}
    >
      {filterFields.map((field) => (
        <div key={field.name} className="min-w-[140px] max-w-[200px]">
          <label
            htmlFor={`filter-${field.name}`}
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            {field.verbose_name}
          </label>
          {field.choices && field.choices.length > 0 ? (
            <select
              id={`filter-${field.name}`}
              value={
                values[field.name] === undefined ? '' : String(values[field.name])
              }
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...values,
                  [field.name]: v === '' ? undefined : v,
                });
              }}
              className="flex h-9 w-full rounded-lg border border-input-border bg-input px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              {field.choices.map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.widget === 'date' || field.type === 'string' ? (
            <Input
              id={`filter-${field.name}`}
              type={field.widget === 'date' ? 'date' : 'text'}
              value={values[field.name] ?? ''}
              onChange={(e) =>
                onChange({
                  ...values,
                  [field.name]:
                    e.target.value === ''
                      ? undefined
                      : field.widget === 'date'
                        ? e.target.value
                        : e.target.value,
                })
              }
              placeholder={`Filter ${field.verbose_name}`}
              className="h-9 text-sm"
            />
          ) : (
            <Input
              id={`filter-${field.name}`}
              type="text"
              value={values[field.name] ?? ''}
              onChange={(e) =>
                onChange({
                  ...values,
                  [field.name]:
                    e.target.value === '' ? undefined : e.target.value,
                })
              }
              placeholder={field.verbose_name}
              className="h-9 text-sm"
            />
          )}
        </div>
      ))}
      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="self-end"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
