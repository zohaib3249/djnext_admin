import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Capitalize model name for display (e.g. 'user_address' -> 'User Address'). */
export function titleName(s: string | undefined | null): string {
  if (s == null || s === '') return '';
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
