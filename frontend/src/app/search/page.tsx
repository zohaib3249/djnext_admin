'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchemaContext } from '@/contexts/SchemaContext';
import Link from 'next/link';
import { Search, ArrowRight, FolderOpen, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModelAvatar } from '@/components/ui/ModelAvatar';
import { api } from '@/lib/api';
import type { NavGroup, NavItem, GlobalSearchRecord } from '@/types';

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchQuery(label: string, appLabel: string, q: string): boolean {
  if (!q) return true;
  const nq = normalize(q);
  return normalize(label).includes(nq) || normalize(appLabel).includes(nq);
}

function sortRecords(records: GlobalSearchRecord[], q: string): GlobalSearchRecord[] {
  const nq = normalize(q);
  return [...records].sort((a, b) => {
    const aMatch = normalize(a.display).includes(nq) ? 0 : 1;
    const bMatch = normalize(b.display).includes(nq) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.display.localeCompare(b.display);
  });
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const { schema, basePath } = useSchemaContext();

  const q = searchParams.get('q') ?? '';
  const trimmed = q.trim();

  const [recordResults, setRecordResults] = useState<GlobalSearchRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const navigation = schema?.navigation ?? [];
  const modelResults =
    trimmed.length > 0
      ? navigation
          .map((group) => ({
            group,
            items: (group.items ?? []).filter((item) =>
              matchQuery(item.label, group.label, trimmed)
            ),
          }))
          .filter((r) => r.items.length > 0)
      : [];

  useEffect(() => {
    if (trimmed.length < 2) {
      setRecordResults([]);
      return;
    }
    setRecordsLoading(true);
    api
      .globalSearch(trimmed)
      .then((data) => setRecordResults(data.results ?? []))
      .catch(() => setRecordResults([]))
      .finally(() => setRecordsLoading(false));
  }, [trimmed]);

  const sortedRecords = useMemo(
    () => (trimmed.length >= 2 ? sortRecords(recordResults, trimmed) : []),
    [recordResults, trimmed]
  );

  const modelCount = modelResults.reduce((acc, r) => acc + r.items.length, 0);
  const totalCount = sortedRecords.length + modelCount;

  if (!isLoading && !isAuthenticated) {
    router.replace(`${basePath}/login`);
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Search
          </h1>
          <p className="text-muted-foreground">
            {trimmed
              ? `Models and records matching "${trimmed}"`
              : 'Enter a search term in the top bar to search across all tables and model names.'}
          </p>
        </div>

        {!trimmed ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Use the search bar in the top navigation to search across all apps, models, and records.
              </p>
            </CardContent>
          </Card>
        ) : totalCount === 0 && !recordsLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No models or records match &quot;{trimmed}&quot;.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {recordsLoading && (
              <p className="text-sm text-muted-foreground">Searching records…</p>
            )}

            {/* Records: link to specific record */}
            {trimmed.length >= 2 && (sortedRecords.length > 0 || recordsLoading) && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Records ({sortedRecords.length})
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedRecords.map((rec) => (
                    <Link
                      key={`${rec.app_label}-${rec.model_name}-${rec.id}`}
                      href={`/${rec.app_label}/${rec.model_name}/${rec.id}`}
                      className="block"
                    >
                      <Card className="transition-colors hover:bg-card-hover hover:border-border-hover">
                        <CardHeader className="flex flex-row items-center gap-4">
                          <ModelAvatar label={rec.model_label} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {rec.display}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {rec.model_label}
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Models: link to list */}
            {modelResults.map(({ group, items }) => (
              <section key={group.app_label}>
                <div className="mb-3 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {group.label}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <Link
                      key={`${group.app_label}-${item.model_name}`}
                      href={`${basePath}/${group.app_label}/${item.model_name}`}
                      className="block"
                    >
                      <Card className="transition-colors hover:bg-card-hover hover:border-border-hover">
                        <CardHeader className="flex flex-row items-center gap-4">
                          <ModelAvatar label={item.label} icon={item.icon} size="md" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-foreground">
                              {item.label}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {group.label}
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-foreground">Search</h1>
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </AdminLayout>
    }>
      <SearchContent />
    </Suspense>
  );
}
