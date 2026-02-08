'use client';

import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldSchema, FieldChoice } from '@/types';

interface SelectFieldProps {
  field: FieldSchema;
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  onBlur?: () => void;
  error?: { message?: string };
}

export function SelectField({
  field,
  value,
  onChange,
  onBlur,
  error,
}: SelectFieldProps) {
  const choices: FieldChoice[] = field.choices ?? [];
  const valueStr = value === null || value === undefined ? '' : String(value);
  const selected = choices.find((c) => String(c.value) === valueStr);
  const rootValue = valueStr === '' || valueStr === undefined ? '__null__' : valueStr;

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
      <Select.Root
        value={rootValue}
        onValueChange={(v) => {
          if (v === '__null__') {
            onChange?.(null);
            return;
          }
          if (v === '') return;
          const first = choices.find((c) => String(c.value) === v);
          onChange?.(first?.value ?? v);
        }}
        onOpenChange={(open) => !open && onBlur?.()}
        disabled={field.readonly}
      >
        <Select.Trigger
          id={field.name}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
            error && 'border-destructive focus:ring-destructive'
          )}
        >
          <Select.Value placeholder="Select..." />
          <Select.Icon>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-60 overflow-auto rounded-lg border border-border bg-card shadow-lg animate-fade-in"
          >
            {/* Always render __null__ item so Radix has a matching value and shows it (not blank) */}
            <Select.Item
              value="__null__"
              className="relative flex cursor-pointer select-none items-center rounded px-3 py-2 pl-8 text-sm text-foreground outline-none data-[highlighted]:bg-card-hover"
            >
              <Select.ItemIndicator className="absolute left-2 flex w-4 items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </Select.ItemIndicator>
              {field.nullable ? '(empty)' : 'Select...'}
            </Select.Item>
            {choices.map((opt) => {
              const optVal = String(opt.value);
              return (
                <Select.Item
                  key={optVal}
                  value={optVal}
                  className="relative flex cursor-pointer select-none items-center rounded px-3 py-2 pl-8 text-sm text-foreground outline-none data-[highlighted]:bg-card-hover"
                >
                  <Select.ItemIndicator className="absolute left-2 flex w-4 items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </Select.ItemIndicator>
                  {opt.label}
                </Select.Item>
              );
            })}
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {field.help_text && !error && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
      {error?.message && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}
