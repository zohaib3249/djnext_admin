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
  onDelete?: (id: string, row?: T) => void;
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
  const hasNoRecords = data.length === 0 && totalCount === 0;

  // Simple empty state: no table, no pagination, just "No records"
  if (hasNoRecords) {
    return (
      <div className="flex h-full min-h-[200px] flex-col rounded-lg border border-border bg-card overflow-hidden w-full">
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No records</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card overflow-hidden w-full">
      <div className="min-h-0 flex-1 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/50">
              {showSelection && (
                <th scope="col" className="w-10 px-3 py-3.5">
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
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {schema.fields?.find((f) => f.name === key)?.verbose_name ?? key}
                </th>
              ))}
              {(canChange || canDelete) && (
                <th
                  scope="col"
                  className="w-24 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (canChange || canDelete ? 1 : 0) + (showSelection ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No items on this page.
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const id = String(row[pkField] ?? row.id ?? row.pk ?? '');
                return (
                  <tr
                    key={id || `row-${index}`}
                    className="border-b border-border transition-colors duration-200 hover:bg-muted/30"
                  >
                    {showSelection && (
                      <td className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selection!.selectedIds.has(id)}
                          onChange={() => selection!.onToggle(id)}
                          className="rounded border-border"
                          aria-label={`Select ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((key, colIndex) => {
                      const isFirstColumn = colIndex === 0;
                      const cellContent = <Cell value={row[key]} columnKey={key} />;
                      return (
                        <td
                          key={key}
                          className={cn(
                            'px-4 py-3 text-sm text-foreground whitespace-nowrap'
                          )}
                        >
                          {isFirstColumn ? (
                            <Link
                              href={`${basePath}/${id}`}
                              className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded cursor-pointer"
                            >
                              {cellContent}
                            </Link>
                          ) : (
                            cellContent
                          )}
                        </td>
                      );
                    })}
                    {(canChange || canDelete) && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canChange && (
                            <Link
                              href={`${basePath}/${id}?edit=1`}
                              className="inline-flex p-2 text-muted-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-lg cursor-pointer"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                          {canDelete && onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(id, row)}
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

/** Format audit log "changes" dict as readable text: field: old → new */
function formatAuditChanges(value: Record<string, unknown>): string {
  if (!value || typeof value !== 'object') return '—';
  const parts: string[] = [];
  for (const [field, diff] of Object.entries(value)) {
    if (diff && typeof diff === 'object' && 'old' in diff && 'new' in diff) {
      const d = diff as { old: unknown; new: unknown };
      const o = d.old == null ? 'null' : String(d.old);
      const n = d.new == null ? 'null' : String(d.new);
      const oShort = o.length > 25 ? o.slice(0, 22) + '…' : o;
      const nShort = n.length > 25 ? n.slice(0, 22) + '…' : n;
      parts.push(`${field}: ${oShort} → ${nShort}`);
    }
  }
  return parts.length ? parts.join('; ') : '—';
}

function Cell({ value, columnKey }: { value: unknown; columnKey?: string }) {
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
