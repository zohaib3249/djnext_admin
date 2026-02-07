'use client';

import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types';

interface NumberFieldProps {
  field: FieldSchema;
  value?: number | string | null;
  onChange?: (value: number | string | null) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

export function NumberField({
  field,
  value,
  onChange,
  onBlur,
  error,
}: NumberFieldProps) {
  const isDecimal = field.widget === 'decimal';
  const str =
    value === null || value === undefined
      ? ''
      : typeof value === 'number'
        ? String(value)
        : String(value);

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
        type={isDecimal ? 'text' : 'number'}
        inputMode={isDecimal ? 'decimal' : 'numeric'}
        value={str}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') {
            onChange?.(null);
            return;
          }
          if (isDecimal) onChange?.(v);
          else {
            const n = Number(v);
            onChange?.(Number.isNaN(n) ? v : n);
          }
        }}
        onBlur={onBlur}
        disabled={field.readonly}
        min={field.minimum}
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
