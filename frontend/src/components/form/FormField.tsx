'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { getFieldComponent, getValidationRules } from '@/lib/fieldMapper';
import { cn } from '@/lib/utils';
import type { FieldSchema } from '@/types';

interface FormFieldProps {
  field: FieldSchema;
  error?: { message?: string };
}

export function FormField({ field, error }: FormFieldProps) {
  const { control, register } = useFormContext();
  const Component = getFieldComponent(field);
  const rules = getValidationRules(field);

  const columnClass =
    field.widget === 'textarea' || field.widget === 'richtext' || field.widget === 'json' || field.widget === 'multiselect'
      ? 'col-span-full'
      : '';

  if (field.widget === 'hidden') {
    return <input type="hidden" {...register(field.name, rules)} />;
  }

  return (
    <div className={cn(columnClass)}>
      <Controller
        name={field.name}
        control={control}
        rules={rules}
        render={({ field: f, fieldState }) => (
          <Component
            field={field}
            value={f.value}
            onChange={f.onChange}
            onBlur={f.onBlur}
            error={fieldState.error}
          />
        )}
      />
    </div>
  );
}
