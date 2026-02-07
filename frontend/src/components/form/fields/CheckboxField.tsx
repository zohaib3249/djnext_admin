'use client';

import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types';

interface CheckboxFieldProps {
  field: FieldSchema;
  value?: boolean;
  onChange?: (value: boolean) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

export function CheckboxField({
  field,
  value = false,
  onChange,
  onBlur,
  error,
}: CheckboxFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <Checkbox.Root
          id={field.name}
          name={field.name}
          checked={value}
          onCheckedChange={(checked) =>
            onChange?.(checked === true)
          }
          onBlur={onBlur}
          disabled={field.readonly}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-input-border bg-input transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            error && 'border-destructive'
          )}
        >
          <Checkbox.Indicator>
            <Check className="h-3.5 w-3.5 text-white" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <label
          htmlFor={field.name}
          className="text-sm font-medium text-foreground cursor-pointer"
        >
          {field.verbose_name}
          {field.required && !field.nullable && (
            <span className="text-destructive ml-0.5">*</span>
          )}
        </label>
      </div>
      {field.help_text && !error && (
        <p className="text-xs text-muted-foreground pl-8">{field.help_text}</p>
      )}
      {error?.message && (
        <p className="text-xs text-destructive pl-8">{error.message}</p>
      )}
    </div>
  );
}
