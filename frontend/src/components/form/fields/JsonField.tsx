'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types';

interface JsonFieldProps {
  field: FieldSchema;
  value?: unknown;
  onChange?: (value: unknown) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export function JsonField({
  field,
  value,
  onChange,
  onBlur,
  error,
}: JsonFieldProps) {
  const [localValue, setLocalValue] = useState(() => toDisplayString(value));
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(toDisplayString(value));
    setParseError(null);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    if (raw.trim() === '') {
      setParseError(null);
      onChange?.(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setParseError(null);
      onChange?.(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      // Don't call onChange with invalid JSON; keep last valid value in form state
    }
  };

  const handleBlur = () => {
    setParseError(null);
    if (localValue.trim() === '') return;
    try {
      JSON.parse(localValue);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
    }
    onBlur?.();
  };

  const showError = error?.message ?? parseError;

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
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={field.help_text ?? '{}'}
        disabled={field.readonly}
        rows={8}
        spellCheck={false}
        className={cn(
          'flex w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 min-h-[120px]',
          showError && 'border-destructive focus:ring-destructive'
        )}
      />
      {field.help_text && !showError && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
      {showError && (
        <p className="text-xs text-destructive">{showError}</p>
      )}
    </div>
  );
}
