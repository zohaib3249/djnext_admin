'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import type { ModelSchema } from '@/types';

interface DataTableProps<T = Record<string, unknown>> {
  schema: ModelSchema;
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onDelete?: (id: string) => void;
  basePath: string;
  pkField?: string;
  /** When set, show checkboxes for bulk actions */
  selection?: {
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onToggleAll: (checked: boolean) => void;
  };
}

export function DataTable<T extends Record<string, unknown>>({
  schema,
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onDelete,
  basePath,
  pkField = 'id',
  selection,
}: DataTableProps<T>) {
  const columns = schema.list_display ?? [];
  const canChange = schema.permissions?.change ?? false;
  const canDelete = schema.permissions?.delete ?? false;
  const showSelection = selection && schema.actions?.length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden w-full">
      <div className="overflow-x-auto min-h-[120px]">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background-secondary">
            <tr>
              {showSelection && (
                <th scope="col" className="w-10 px-2 py-3">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && data.every((row) => selection!.selectedIds.has(String(row[pkField] ?? row.id ?? '')))}
                    onChange={(e) => selection!.onToggleAll(e.target.checked)}
                    className="rounded border-border"
                    aria-label="Select all on page"
                  />
                </th>
              )}
              {columns.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {schema.fields?.find((f) => f.name === key)?.verbose_name ?? key}
                </th>
              ))}
              {(canChange || canDelete) && (
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-24"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (canChange || canDelete ? 1 : 0) + (showSelection ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No items found.
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const id = String(row[pkField] ?? row.id ?? row.pk ?? '');
                return (
                  <tr
                    key={id || `row-${index}`}
                    className="bg-card transition-colors duration-200 hover:bg-card-hover"
                  >
                    {showSelection && (
                      <td className="w-10 px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selection!.selectedIds.has(id)}
                          onChange={() => selection!.onToggle(id)}
                          className="rounded border-border"
                          aria-label={`Select ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((key) => (
                      <td
                        key={key}
                        className="px-4 py-3 text-sm text-foreground whitespace-nowrap"
                      >
                        <Cell value={row[key]} />
                      </td>
                    ))}
                    {(canChange || canDelete) && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canChange && (
                            <Link
                              href={`${basePath}/${id}`}
                              className="inline-flex p-2 text-muted-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-lg cursor-pointer"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                          {canDelete && onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(id)}
                              className="inline-flex p-2 text-muted-foreground transition-colors hover:text-destructive focus:outline-none focus:ring-2 focus:ring-primary rounded-lg cursor-pointer"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Table footer: pagination always visible at bottom */}
      <div className="shrink-0 border-t border-border bg-background-secondary">
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
          onPageChange={onPageChange}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}

function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
    return new Date(String(value)).toLocaleDateString();
  }
  if (typeof value === 'object') {
    return typeof (value as Record<string, unknown>)._display === 'string'
      ? (value as Record<string, string>)._display
      : JSON.stringify(value);
  }
  return String(value);
}
