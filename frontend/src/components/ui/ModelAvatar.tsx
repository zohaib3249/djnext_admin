'use client';

import { getModelIcon, getModelInitials } from '@/lib/modelIcon';
import { cn } from '@/lib/utils';

interface ModelAvatarProps {
  /** Display label (e.g. "User Address") – used for initials when no icon */
  label: string;
  /** Optional icon name from schema (e.g. "Users", "ShoppingCart") */
  icon?: string | null;
  /** Size: sm (sidebar), md (dashboard card), lg */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function ModelAvatar({ label, icon: iconName, size = 'md', className }: ModelAvatarProps) {
  const IconComponent = getModelIcon(iconName);
  const initials = getModelInitials(label);

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-semibold text-primary bg-primary/10',
        sizeClasses[size],
        className
      )}
      aria-hidden
    >
      {IconComponent ? (
        <IconComponent className={cn('text-primary', iconSizes[size])} />
      ) : (
        <span className="text-primary">{initials}</span>
      )}
    </div>
  );
}
