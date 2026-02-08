'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useModelSchema } from '@/hooks/useSchema';
import { useDetail } from '@/hooks/useDetail';
import { titleName } from '@/lib/utils';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModelMediaInjector } from '@/components/layout/CustomMediaInjector';
import { DynamicForm } from '@/components/form/DynamicForm';
import { InlineTable } from '@/components/detail/InlineTable';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowLeft, Pencil } from 'lucide-react';
import type { ModelSchema, FieldsetSchema } from '@/types';

function flattenFieldsetNames(fields: (string | string[])[]): string[] {
  return fields.flatMap((f) => (Array.isArray(f) ? f : [f]));
}

function DetailFieldValue({
  fieldName,
  verboseName,
  value,
}: {
  fieldName: string;
  verboseName: string;
  value: unknown;
}) {
  let display: string;
  if (value === null || value === undefined) {
    display = '—';
  } else if (fieldName === 'changes' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, { old?: unknown; new?: unknown }>;
    const parts = Object.entries(obj).map(([f, d]) => {
      if (d && typeof d === 'object' && ('old' in d || 'new' in d)) {
        const o = d.old == null ? 'null' : String(d.old);
        const n = d.new == null ? 'null' : String(d.new);
        return `${f}: ${o} → ${n}`;
      }
      return f;
    });
    display = parts.length ? parts.join('\n') : '—';
  } else if (typeof value === 'object' && value !== null && '_display' in value) {
    display = (value as { _display?: string })._display ?? JSON.stringify(value);
  } else {
    display = String(value);
  }
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{verboseName}</dt>
      <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap">{display}</dd>
    </div>
  );
}

function DetailViewSections({
  schema,
  data,
  displayFields,
}: {
  schema: ModelSchema;
  data: Record<string, unknown> | null;
  displayFields: string[];
}) {
  const fields = schema.fields ?? [];
  const fieldsets = schema.fieldsets ?? [];

  const getFieldLabel = (name: string) =>
    fields.find((f) => f.name === name)?.verbose_name ?? name;

  if (fieldsets.length > 0) {
    return (
      <div className="space-y-6">
        {fieldsets.map((fs: FieldsetSchema, i: number) => {
          const names = flattenFieldsetNames(fs.fields);
          if (names.length === 0) return null;
          return (
            <Card key={fs.name ?? i}>
              <CardHeader>
                <h2 className="text-lg font-medium text-foreground">
                  {fs.title ?? fs.name ?? 'Details'}
                </h2>
                {fs.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {fs.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {names.map((fieldName) => (
                    <DetailFieldValue
                      key={fieldName}
                      fieldName={fieldName}
                      verboseName={getFieldLabel(fieldName)}
                      value={data?.[fieldName]}
                    />
                  ))}
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium text-foreground">Details</h2>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {displayFields.map((fieldName) => (
            <DetailFieldValue
              key={fieldName}
              fieldName={fieldName}
              verboseName={getFieldLabel(fieldName)}
              value={data?.[fieldName]}
            />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export default function ModelDetailPage({
  params,
  searchParams,
}: {
  params: { app: string; model: string; id: string };
  searchParams?: { edit?: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'edit'>(
    searchParams?.edit === '1' ? 'edit' : 'view'
  );
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: schema, isLoading: schemaLoading } = useModelSchema(
    params.app,
    params.model
  );
  const {
    data,
    isLoading: dataLoading,
    update,
    isUpdating,
    refetch,
  } = useDetail<Record<string, unknown>>(
    params.app,
    params.model,
    params.id
  );

  if (!authLoading && !isAuthenticated) {
    router.replace('/login');
    return null;
  }

  if (schemaLoading || dataLoading || !schema) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  const listPath = `/${params.app}/${params.model}`;
  const displayFields = schema.list_display?.length
    ? schema.list_display
    : schema.fields?.map((f) => f.name).filter(Boolean) ?? [];
  const canEdit = schema.permissions?.change && data;

  const handleSubmit = async (payload: Record<string, unknown>) => {
    await update(payload);
    setMode('view');
    refetch();
  };

  return (
    <AdminLayout>
      <ModelMediaInjector modelSchema={schema} />
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={listPath}
              className="inline-flex p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              aria-label="Back to list"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {schema.model?.verbose_name ?? titleName(params.model)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {(data as Record<string, string>)?._display ?? `#${params.id}`}
              </p>
            </div>
          </div>
          {canEdit && mode === 'view' && (
            <Button
              variant="secondary"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => setMode('edit')}
            >
              Edit
            </Button>
          )}
        </div>

        {mode === 'edit' && canEdit ? (
          <Card>
            <CardContent className="pt-6">
              <DynamicForm
                fields={schema.fields ?? []}
                fieldsets={schema.fieldsets}
                initialValues={data as Record<string, unknown>}
                onSubmit={handleSubmit}
                onCancel={() => setMode('view')}
                isLoading={isUpdating}
                mode="edit"
              />
            </CardContent>
          </Card>
        ) : (
          <DetailViewSections
            schema={schema}
            data={data as Record<string, unknown>}
            displayFields={displayFields}
          />
        )}

        {/* Inline related tables (e.g. Order -> OrderItems) */}
        {schema.inlines?.length ? (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">
              Related data
            </h2>
            {schema.inlines.map((inline) => (
              <InlineTable
                key={`${inline.app_label}-${inline.model_name}`}
                inline={inline}
                parentId={params.id}
                parentAppLabel={params.app}
                parentModelName={params.model}
              />
            ))}
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
