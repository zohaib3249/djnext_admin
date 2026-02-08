'use client';

import { forwardRef } from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types';

interface TextFieldProps {
  field: FieldSchema;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ field, value, onChange, onBlur, error }, ref) => {
    const safeValue = value ?? '';
    const type =
      field.widget === 'password'
        ? 'password'
        : field.widget === 'email'
          ? 'email'
          : field.widget === 'url'
            ? 'url'
            : 'text';

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
          ref={ref}
          id={field.name}
          name={field.name}
          type={type}
          value={safeValue}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          placeholder={field.help_text ?? undefined}
          maxLength={field.max_length}
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
);

TextField.displayName = 'TextField';
