'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
  pageSize,
}: PaginationProps) {
  const start = totalCount != null && pageSize != null
    ? (currentPage - 1) * pageSize + 1
    : null;
  const end = totalCount != null && pageSize != null
    ? Math.min(currentPage * pageSize, totalCount)
    : null;

  return (
    <div className="flex items-center justify-between gap-4 px-2 py-2">
      <p className="text-sm text-muted-foreground">
        {start != null && end != null && totalCount != null ? (
          <>Showing {start}&ndash;{end} of {totalCount}</>
        ) : (
          <>Page {currentPage} of {totalPages}</>
        )}
      </p>
      <nav className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            'inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground transition-colors duration-200 hover:bg-card-hover disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-3 text-sm text-muted-foreground">
          {currentPage} / {totalPages || 1}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            'inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground transition-colors duration-200 hover:bg-card-hover disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary'
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
