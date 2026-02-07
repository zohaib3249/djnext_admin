'use client';

import { cn } from '@/lib/utils';
import { FormField } from '../FormField';
import type { FieldSchema, FieldsetSchema } from '@/types';
import type { FieldErrors } from 'react-hook-form';

interface FieldsetProps {
  fieldset: FieldsetSchema;
  fields: FieldSchema[];
  errors: FieldErrors;
}

export function flattenFieldNames(fields: (string | string[])[]): string[] {
  return fields.flatMap((f) => (Array.isArray(f) ? f : [f]));
}

function getFieldsForNames(names: string[], all: FieldSchema[]): FieldSchema[] {
  const byName = new Map(all.map((f) => [f.name, f]));
  return names.map((n) => byName.get(n)).filter(Boolean) as FieldSchema[];
}

export function Fieldset({ fieldset, fields, errors }: FieldsetProps) {
  const names = flattenFieldNames(fieldset.fields);
  const toRender = fields.filter((f) => names.includes(f.name));
  if (toRender.length === 0) return null;

  const isWide = fieldset.classes?.includes('wide');
  const defaultGrid = isWide ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';

  return (
    <fieldset className="space-y-4">
      {(fieldset.title || fieldset.description) && (
        <div className="mb-3">
          {fieldset.title && (
            <legend className="text-sm font-semibold text-foreground">
              {fieldset.title}
            </legend>
          )}
          {fieldset.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fieldset.description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {fieldset.fields.map((row, idx) => {
          const namesInRow = Array.isArray(row) ? row : [row];
          const rowFields = getFieldsForNames(namesInRow, toRender);
          if (rowFields.length === 0) return null;
          const rowGrid =
            rowFields.length >= 3
              ? 'grid-cols-1 md:grid-cols-3'
              : rowFields.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : defaultGrid;
          return (
            <div key={idx} className={cn('grid gap-4', rowGrid)}>
              {rowFields.map((field) => (
                <FormField key={field.name} field={field} error={errors[field.name]} />
              ))}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
