'use client';

import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types';

interface DateTimeFieldProps {
  field: FieldSchema;
  value?: string | null;
  onChange?: (value: string | null) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

export function DateTimeField({
  field,
  value,
  onChange,
  onBlur,
  error,
}: DateTimeFieldProps) {
  // input type="datetime-local" wants YYYY-MM-DDTHH:mm
  let str = '';
  if (value) {
    const d = new Date(String(value));
    if (!Number.isNaN(d.getTime())) {
      str = d.toISOString().slice(0, 16);
    }
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={field.name}
        className="block text-sm font-medium text-foreground"
      >
        {field.verbose_name}
        {field.required && !field.nullable && (
          <span className="text-destructive ml-0.5">*</span>
        )}
      </label>
      <Input
        id={field.name}
        name={field.name}
        type="datetime-local"
        value={str}
        onChange={(e) => onChange?.(e.target.value || null)}
        onBlur={onBlur}
        disabled={field.readonly}
        className={cn(error && 'border-destructive focus:ring-destructive')}
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
