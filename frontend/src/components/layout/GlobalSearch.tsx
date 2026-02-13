'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight, FolderOpen, FileText } from 'lucide-react';
import { useSchemaContext } from '@/contexts/SchemaContext';
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

/** Sort records: query in display first, then by display string. */
function sortRecords(records: GlobalSearchRecord[], q: string): GlobalSearchRecord[] {
  const nq = normalize(q);
  return [...records].sort((a, b) => {
    const aMatch = normalize(a.display).includes(nq) ? 0 : 1;
    const bMatch = normalize(b.display).includes(nq) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.display.localeCompare(b.display);
  });
}

export function GlobalSearch() {
  const router = useRouter();
  const { schema, basePath } = useSchemaContext();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recordResults, setRecordResults] = useState<GlobalSearchRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigation = schema?.navigation ?? [];
  const trimmed = query.trim();

  const modelResults = useMemo(
    () =>
      trimmed.length > 0
        ? navigation
            .map((group) => ({
              group,
              items: (group.items ?? []).filter((item) =>
                matchQuery(item.label, group.label, trimmed)
              ),
            }))
            .filter((r) => r.items.length > 0)
        : [],
    [navigation, trimmed]
  );

  const sortedRecords = useMemo(
    () => (trimmed.length >= 2 ? sortRecords(recordResults, trimmed) : []),
    [recordResults, trimmed]
  );

  const hasRecords = sortedRecords.length > 0;
  const modelCount = modelResults.reduce((acc, r) => acc + r.items.length, 0);
  const showDropdown = open && (focused || hasRecords || modelCount > 0);
  const totalCount = sortedRecords.length + modelCount;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (trimmed.length < 2) {
      setRecordResults([]);
      return;
    }
    setRecordsLoading(true);
    const t = setTimeout(() => {
      api
        .globalSearch(trimmed)
        .then((data) => setRecordResults(data.results ?? []))
        .catch(() => setRecordResults([]))
        .finally(() => setRecordsLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [trimmed]);

  const goToSearchPage = () => {
    setOpen(false);
    if (trimmed) router.push(`${basePath}/search?q=${encodeURIComponent(trimmed)}`);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl mx-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search models and records..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter') goToSearchPage();
          }}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          aria-label="Search all models and records"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
      </div>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(28rem,70vh)] overflow-auto rounded-lg border border-border bg-card shadow-lg"
          role="listbox"
        >
          {!trimmed ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Type to search across all tables and model names.
            </div>
          ) : (
            <>
              {/* Records (from API) - most matched first */}
              {trimmed.length >= 2 && (
                <div className="border-b border-border">
                  <div className="sticky top-0 flex items-center gap-2 bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    Records
                    {recordsLoading && (
                      <span className="ml-1 font-normal">Searching…</span>
                    )}
                  </div>
                  {!recordsLoading && sortedRecords.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No matching records (min 2 characters).
                    </div>
                  )}
                  {sortedRecords.map((rec) => (
                    <Link
                      key={`${rec.app_label}-${rec.model_name}-${rec.id}`}
                      href={`${basePath}/${rec.app_label}/${rec.model_name}/${rec.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-card-hover transition-colors cursor-pointer border-b border-border/50 last:border-b-0"
                      role="option"
                    >
                      <ModelAvatar label={rec.model_label} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{rec.display}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {rec.model_label}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Models (from schema) */}
              {modelResults.map(({ group, items }) => (
                <div key={group.app_label} className="border-b border-border last:border-b-0">
                  <div className="sticky top-0 flex items-center gap-2 bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <FolderOpen className="h-3 w-3" />
                    {group.label}
                  </div>
                  {items.map((item) => (
                    <Link
                      key={`${group.app_label}-${item.model_name}`}
                      href={`${basePath}/${group.app_label}/${item.model_name}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-card-hover transition-colors cursor-pointer"
                      role="option"
                    >
                      <ModelAvatar label={item.label} icon={item.icon} size="sm" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              ))}

              <button
                type="button"
                onClick={goToSearchPage}
                className="flex w-full items-center justify-center gap-2 border-t border-border px-3 py-2 text-sm font-medium text-primary hover:bg-card-hover transition-colors cursor-pointer"
              >
                View all {totalCount} result{totalCount !== 1 ? 's' : ''} on search page
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
