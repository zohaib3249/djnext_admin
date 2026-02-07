'use client';

import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types';

interface DateFieldProps {
  field: FieldSchema;
  value?: string | null;
  onChange?: (value: string | null) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

export function DateField({
  field,
  value,
  onChange,
  onBlur,
  error,
}: DateFieldProps) {
  // API often returns YYYY-MM-DD or full ISO; input type="date" wants YYYY-MM-DD
  let dateStr = '';
  if (value) {
    const d = new Date(String(value));
    if (!Number.isNaN(d.getTime())) {
      dateStr = d.toISOString().slice(0, 10);
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
        type="date"
        value={dateStr}
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
