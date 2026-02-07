'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useModelSchema } from '@/hooks/useSchema';
import { useList } from '@/hooks/useList';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/list/DataTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import type { InlineSchema } from '@/types';

interface InlineTableProps {
  inline: InlineSchema;
  parentId: string;
  parentAppLabel: string;
  parentModelName: string;
}

export function InlineTable({
  inline,
  parentId,
}: InlineTableProps) {
  const [inlinePage, setInlinePage] = useState(1);
  const { data: schema, isLoading } = useModelSchema(
    inline.app_label,
    inline.model_name
  );

  const fkParam = useMemo(
    () => (inline.fk_name ? { [inline.fk_name]: parentId } : undefined),
    [inline.fk_name, parentId]
  );

  const listParams = useMemo(
    () => ({
      page: inlinePage,
      page_size: 10,
      ...fkParam,
    }),
    [inlinePage, fkParam]
  );

  const { results, count, page, pageSize, deleteOne } = useList(
    inline.app_label,
    inline.model_name,
    listParams
  );

  if (isLoading || !schema) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const listPath = `/${inline.app_label}/${inline.model_name}`;
  const createUrl = inline.fk_name
    ? `${listPath}/create?${inline.fk_name}=${parentId}`
    : `${listPath}/create`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <h3 className="text-sm font-semibold text-foreground">
          {inline.verbose_name_plural}
        </h3>
        {schema.permissions?.add && (
          <Link href={createUrl} className="cursor-pointer">
            <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
              Add {inline.verbose_name}
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <DataTable
          schema={schema}
          data={results}
          totalCount={count}
          page={page}
          pageSize={pageSize}
          onPageChange={setInlinePage}
          onDelete={schema.permissions?.delete ? (id) => void deleteOne(id) : undefined}
          basePath={listPath}
          pkField={schema.model?.pk_field}
        />
      </CardContent>
    </Card>
  );
}
