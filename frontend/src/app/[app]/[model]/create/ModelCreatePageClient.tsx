'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSchemaContext } from '@/contexts/SchemaContext';
import { useModelSchema } from '@/hooks/useSchema';
import { useDetail } from '@/hooks/useDetail';
import { titleName } from '@/lib/utils';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModelMediaInjector } from '@/components/layout/CustomMediaInjector';
import { DynamicForm } from '@/components/form/DynamicForm';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowLeft } from 'lucide-react';

export default function ModelCreatePageClient({
  params,
}: {
  params: Promise<{ app: string; model: string }>;
}) {
  const [resolved, setResolved] = useState<{ app: string; model: string } | null>(null);
  const searchParams = useSearchParams();
  const resolvedSearch = useMemo(() => {
    const out: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
      const prev = out[key];
      if (prev === undefined) out[key] = value;
      else if (Array.isArray(prev)) out[key] = [...prev, value];
      else out[key] = [prev, value];
    });
    return out;
  }, [searchParams]);

  const router = useRouter();
  const { basePath } = useSchemaContext();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: schema, isLoading: schemaLoading } = useModelSchema(
    resolved?.app ?? '',
    resolved?.model ?? ''
  );
  const { create, isCreating } = useDetail(resolved?.app ?? '', resolved?.model ?? '', null);

  const initialFromQuery: Record<string, unknown> = {};
  if (resolvedSearch && schema?.fields) {
    for (const [key, value] of Object.entries(resolvedSearch)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v === undefined) continue;
      const field = schema.fields.find((f) => f.name === key);
      if (field && (field.type === 'integer' || field.relation)) {
        const n = Number(v);
        initialFromQuery[key] = Number.isNaN(n) ? v : n;
      } else {
        initialFromQuery[key] = v;
      }
    }
  }

  if (!resolved) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!authLoading && !isAuthenticated) {
    router.replace(`${basePath}/login`);
    return null;
  }

  if (schemaLoading || !schema) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  const listPath = `${basePath}/${resolved.app}/${resolved.model}`;

  const handleSubmit = async (payload: Record<string, unknown>) => {
    const created = await create(payload);
    const id = (created as Record<string, unknown>)?.id ?? (created as Record<string, unknown>)?.pk;
    if (id != null) {
      router.push(`${listPath}/${id}`);
    } else {
      router.push(listPath);
    }
  };

  return (
    <AdminLayout>
      <ModelMediaInjector modelSchema={schema} />
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href={listPath}
            className="inline-flex p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">
            Add {(schema.model?.verbose_name ?? titleName(resolved.model)) || 'item'}
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <DynamicForm
              fields={schema.fields ?? []}
              fieldsets={schema.fieldsets}
              initialValues={initialFromQuery}
              onSubmit={handleSubmit}
              onCancel={() => router.push(listPath)}
              isLoading={isCreating}
              mode="create"
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
