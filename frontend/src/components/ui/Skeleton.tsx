'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({
  className,
  variant = 'rectangular',
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-skeleton animate-skeleton-pulse',
        variant === 'text' && 'rounded h-4',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        className
      )}
    />
  );
}
