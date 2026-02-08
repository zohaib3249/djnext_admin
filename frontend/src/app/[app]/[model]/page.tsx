'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useModelSchema } from '@/hooks/useSchema';
import { useList } from '@/hooks/useList';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModelMediaInjector } from '@/components/layout/CustomMediaInjector';
import { DataTable } from '@/components/list/DataTable';
import { DateHierarchy } from '@/components/list/DateHierarchy';
import { SearchBar } from '@/components/list/SearchBar';
import { FilterSidebar } from '@/components/list/FilterSidebar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { titleName } from '@/lib/utils';

export default function ModelListPage({
  params,
}: {
  params: { app: string; model: string };
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: schema, isLoading: schemaLoading } = useModelSchema(
    params.app,
    params.model
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<
    Record<string, string | number | boolean | undefined>
  >({});
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAction, setSelectedAction] = useState('');
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [actionRunning, setActionRunning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; repr: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Date hierarchy state
  const [dateHierarchy, setDateHierarchy] = useState<{
    year?: number;
    month?: number;
    day?: number;
  }>({});

  // Reset to page 1 when filters, search, or date hierarchy change
  useEffect(() => {
    setPage(1);
  }, [filters, search, dateHierarchy]);

  const listParams = useMemo(
    () => {
      const params: Record<string, string | number | undefined> = {
        page,
        page_size: 25,
        search: search.trim() || undefined,
      };

      // Add regular filters (convert booleans to strings)
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params[key] = typeof value === 'boolean' ? String(value) : value;
        }
      });

      // Add date hierarchy filters (using Django's date field lookups)
      if (schema?.date_hierarchy && dateHierarchy.year) {
        params[`${schema.date_hierarchy}__year`] = dateHierarchy.year;
        if (dateHierarchy.month) {
          params[`${schema.date_hierarchy}__month`] = dateHierarchy.month;
          if (dateHierarchy.day) {
            params[`${schema.date_hierarchy}__day`] = dateHierarchy.day;
          }
        }
      }

      return params;
    },
    [page, search, filters, dateHierarchy, schema?.date_hierarchy]
  );

  const {
    results,
    count,
    pageSize,
    totalPages,
    isLoading: listLoading,
    deleteOne,
    isDeleting,
    refetch,
  } = useList(params.app, params.model, listParams);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleSelectAll = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(results.map((r) => String(r.id ?? r.pk ?? '')).filter(Boolean)));
  }, [results]);

  const runAction = async () => {
    if (!selectedAction || selectedIds.size === 0) return;
    setActionRunning(true);
    try {
      await api.runAction(params.app, params.model, selectedAction, Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectedAction('');
      setActionDropdownOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionRunning(false);
    }
  };

  const handleInlineEdit = useCallback(async (id: string, field: string, value: unknown) => {
    try {
      await api.bulkUpdate(params.app, params.model, [{ id, [field]: value }]);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  }, [params.app, params.model, refetch]);

  const { optionsByField, isLoading: filterOptionsLoading } = useFilterOptions(schema ?? null);

  if (!authLoading && !isAuthenticated) {
    router.replace('/login');
    return null;
  }

  if (schemaLoading || !schema) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  const modelName = schema?.model?.verbose_name ?? titleName(params.model);

  const handleDeleteClick = (id: string, row?: Record<string, unknown>) => {
    setDeleteError(null);
    const firstCol = schema?.list_display?.[0];
    const firstKey =
      firstCol === undefined
        ? undefined
        : typeof firstCol === 'string'
          ? firstCol
          : firstCol.name;
    const repr =
      row && firstKey !== undefined
        ? String(row[firstKey] ?? row.id ?? row.pk ?? id)
        : id;
    setDeleteTarget({ id, repr });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteOne(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const basePath = `/${params.app}/${params.model}`;

  return (
    <AdminLayout>
      <ModelMediaInjector modelSchema={schema} />
      <div className="space-y-4">
        {/* Top bar: title, single search input, Add button - Django style */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            {schema.model?.verbose_name_plural ?? titleName(params.model)}
          </h1>
          <div className="flex flex-1 items-center justify-end gap-3">
            {schema.search_fields?.length ? (
              <div className="w-full sm:max-w-sm">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder={`Search ${schema.model?.verbose_name_plural?.toLowerCase()}...`}
                />
              </div>
            ) : null}
            {schema.permissions?.add && (
              <Link href={`${basePath}/create`} className="shrink-0 cursor-pointer">
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Add {(schema.model?.verbose_name ?? titleName(params.model)) || 'item'}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Bulk actions bar (when actions exist) */}
        {schema.actions?.length ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
            <span className="text-sm text-muted-foreground">Action:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setActionDropdownOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-card-hover"
              >
                {schema.actions.find((a) => a.name === selectedAction)?.description ?? 'Choose action'}
                <ChevronDown className="h-4 w-4" />
              </button>
              {actionDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setActionDropdownOpen(false)} />
                  <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
                    {schema.actions.map((a) => (
                      <button
                        key={a.name}
                        type="button"
                        onClick={() => {
                          setSelectedAction(a.name);
                          setActionDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-card-hover"
                      >
                        {a.description}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              size="sm"
              disabled={selectedIds.size === 0 || !selectedAction || actionRunning}
              onClick={runAction}
            >
              {actionRunning ? 'Running…' : `Run on ${selectedIds.size} selected`}
            </Button>
          </div>
        ) : null}

        {/* Main: data table + right filter sidebar; table area matches filter height (min = filter height) */}
        <div className="flex items-stretch rounded-lg border border-border bg-card">
          <div className="min-w-0 flex-1 flex flex-col min-h-0">
            {/* Date hierarchy navigation */}
            {schema.date_hierarchy && (
              <DateHierarchy
                appLabel={params.app}
                modelName={params.model}
                dateField={schema.date_hierarchy}
                values={dateHierarchy}
                onChange={setDateHierarchy}
              />
            )}
            <DataTable
              schema={schema}
              data={results}
              totalCount={count}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onDelete={schema.permissions?.delete ? handleDeleteClick : undefined}
              basePath={basePath}
              pkField={schema.model?.pk_field}
              selection={
                schema.actions?.length
                  ? {
                      selectedIds,
                      onToggle: toggleSelect,
                      onToggleAll: toggleSelectAll,
                    }
                  : undefined
              }
              onInlineEdit={schema.list_editable?.length ? handleInlineEdit : undefined}
            />
          </div>
          <FilterSidebar
            schema={schema}
            values={filters}
            onChange={setFilters}
            onClear={() => setFilters({})}
            open={filterSidebarOpen}
            onToggle={() => setFilterSidebarOpen((o) => !o)}
            optionsByField={optionsByField}
            optionsLoading={filterOptionsLoading}
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={`Delete ${modelName}?`}
        description={
          deleteError ? (
            <span className="text-destructive">{deleteError}</span>
          ) : deleteTarget ? (
            <>This will permanently delete &quot;{deleteTarget.repr}&quot;. This action cannot be undone.</>
          ) : null
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </AdminLayout>
  );
}
