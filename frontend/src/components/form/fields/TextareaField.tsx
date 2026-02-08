'use client';

import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types';

interface TextareaFieldProps {
  field: FieldSchema;
  value?: string | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

export function TextareaField({
  field,
  value,
  onChange,
  onBlur,
  error,
}: TextareaFieldProps) {
  const safeValue = value ?? '';
  return (
    <div className="space-y-1.5 col-span-full">
      <label
        htmlFor={field.name}
        className="block text-sm font-medium text-foreground"
        >
        {field.verbose_name}
        {field.required && !field.nullable && (
          <span className="text-destructive ml-0.5">*</span>
        )}
      </label>
      <textarea
        id={field.name}
        name={field.name}
        value={safeValue}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={field.help_text ?? undefined}
        maxLength={field.max_length}
        disabled={field.readonly}
        rows={4}
        className={cn(
          'flex w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 min-h-[100px]',
          error && 'border-destructive focus:ring-destructive'
        )}
      />
      {field.help_text && !error && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
      {error?.message && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}
