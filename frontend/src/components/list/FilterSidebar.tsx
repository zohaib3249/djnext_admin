'use client';

import { useMemo } from 'react';
import { ChevronRight, Filter, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchableFilterSelect } from './SearchableFilterSelect';
import type { ModelSchema } from '@/types';
import type { FilterOption } from '@/hooks/useFilterOptions';

const SIMPLE_FILTER_MAX_OPTIONS = 3;

interface FilterSidebarProps {
  schema: ModelSchema;
  values: Record<string, string | number | boolean | undefined>;
  onChange: (values: Record<string, string | number | boolean | undefined>) => void;
  onClear: () => void;
  open: boolean;
  onToggle: () => void;
  /** Fetched options per filter field (from schema choices + autocomplete for relations) */
  optionsByField?: Record<string, FilterOption[]>;
  optionsLoading?: boolean;
}

export function FilterSidebar({
  schema,
  values,
  onChange,
  onClear,
  open,
  onToggle,
  optionsByField = {},
  optionsLoading = false,
}: FilterSidebarProps) {
  const filterFields = useMemo(() => {
    const names = schema.list_filter ?? [];
    return names
      .map((name) => schema.fields?.find((f) => f.name === name))
      .filter(Boolean) as NonNullable<ModelSchema['fields']>[number][];
  }, [schema.list_filter, schema.fields]);

  /** Options for a field: fetched options (choices/relations) or schema choices */
  const getOptionsForField = (field: NonNullable<ModelSchema['fields']>[number]) => {
    const fetched = optionsByField[field.name];
    if (fetched?.length) return fetched;
    if (field.choices?.length) {
      return field.choices.map((c) => ({ value: c.value, label: c.label }));
    }
    return [];
  };

  const hasActiveFilters = Object.values(values).some(
    (v) => v !== undefined && v !== ''
  );

  if (filterFields.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex min-w-0 shrink-0 flex-col border-l border-border bg-card transition-all duration-200',
        open ? 'w-64 min-w-64' : 'w-8'
      )}
    >
      {/* Collapse/expand toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="flex h-9 w-full min-w-0 items-center justify-center gap-1 border-b border-border text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground cursor-pointer"
        aria-label={open ? 'Collapse filters' : 'Expand filters'}
      >
        {open ? (
          <>
            <span className="text-xs font-medium">Filter</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </>
        ) : (
          <Filter className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex w-full min-w-0 items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              Filter
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-card-hover hover:text-foreground cursor-pointer"
                aria-label="Clear all filters"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto py-2">
            {filterFields.map((field) => (
              <div
                key={field.name}
                className="w-full min-w-0 border-b border-border/50 px-3 py-2 last:border-b-0"
              >
                <h3 className="mb-1.5 text-xs font-semibold text-foreground">
                  By {field.verbose_name}
                </h3>
                {(() => {
                  const options = getOptionsForField(field);
                  const loading = optionsLoading && field.relation && options.length === 0;
                  const useSearchableDropdown =
                    field.relation || options.length > SIMPLE_FILTER_MAX_OPTIONS;

                  if (loading) {
                    return (
                      <div className="flex items-center gap-2 py-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span className="text-xs">Loading options…</span>
                      </div>
                    );
                  }
                  if (options.length > 0 && useSearchableDropdown) {
                    return (
                      <SearchableFilterSelect
                        options={options}
                        value={values[field.name]}
                        onChange={(v) =>
                          onChange({ ...values, [field.name]: v })
                        }
                        label={field.verbose_name}
                        placeholder="All"
                      />
                    );
                  }
                  if (options.length > 0) {
                    return (
                      <ul className="w-full min-w-0 space-y-0">
                        <li className="w-full min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...values };
                              delete next[field.name];
                              onChange(next);
                            }}
                            className={cn(
                              'block w-full min-w-0 text-left py-1.5 px-2 text-sm cursor-pointer border-l-2 -ml-px pl-2 transition-colors',
                              values[field.name] === undefined
                                ? 'border-primary text-primary font-medium'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                          >
                            All
                          </button>
                        </li>
                        {options.map((opt) => {
                          const isActive = values[field.name] === opt.value;
                          return (
                            <li key={String(opt.value)} className="w-full min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onChange({
                                    ...values,
                                    [field.name]: isActive ? undefined : opt.value,
                                  })
                                }
                                className={cn(
                                  'block w-full min-w-0 text-left py-1.5 px-2 text-sm cursor-pointer border-l-2 -ml-px pl-2 transition-colors',
                                  isActive
                                    ? 'border-primary text-primary font-medium'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {opt.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  }
                  return (
                    <div className="mt-1 w-full min-w-0">
                      <input
                        type={field.widget === 'date' ? 'date' : 'text'}
                        value={
                          values[field.name] !== undefined && values[field.name] !== null
                            ? String(values[field.name])
                            : ''
                        }
                        onChange={(e) =>
                          onChange({
                            ...values,
                            [field.name]:
                              e.target.value === ''
                                ? undefined
                                : e.target.value,
                          })
                        }
                        placeholder="All"
                        className="box-border w-full min-w-0 rounded border border-input-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
