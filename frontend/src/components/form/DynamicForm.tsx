'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { getDefaultValue } from '@/lib/fieldMapper';
import { Button } from '@/components/ui/Button';
import { FormField } from './FormField';
import { Fieldset } from './fieldsets/Fieldset';
import type { FieldSchema, FieldsetSchema } from '@/types';

interface DynamicFormProps {
  fields: FieldSchema[];
  fieldsets?: FieldsetSchema[] | null;
  initialValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

function flattenFieldNames(fields: (string | string[])[]): string[] {
  return fields.flatMap((f) => (Array.isArray(f) ? f : [f]));
}

export function DynamicForm({
  fields,
  fieldsets,
  initialValues = {},
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: DynamicFormProps) {
  const editableFields = fields.filter((f) => {
    if (f.primary_key) return false;
    if (!f.editable) return false;
    if (mode === 'create' && f.readonly) return false;
    if (f.widget === 'hidden') return false;
    return true;
  });

  const defaultValues: Record<string, unknown> = {};
  editableFields.forEach((f) => {
    defaultValues[f.name] =
      initialValues[f.name] !== undefined
        ? initialValues[f.name]
        : getDefaultValue(f);
  });

  const methods = useForm({
    defaultValues,
    values: mode === 'edit' ? initialValues : undefined,
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;

  const submit = handleSubmit(async (data) => {
    const payload: Record<string, unknown> = {};
    editableFields.forEach((f) => {
      if (data[f.name] !== undefined) payload[f.name] = data[f.name];
    });
    await onSubmit(payload);
  });

  const formContent = (
    <>
      {fieldsets && fieldsets.length > 0 ? (
        <>
          {fieldsets.map((fs, i) => {
            const names = flattenFieldNames(fs.fields);
            const fsFields = editableFields.filter((f) => names.includes(f.name));
            if (fsFields.length === 0) return null;
            return (
              <Fieldset
                key={fs.name ?? i}
                fieldset={fs}
                fields={fsFields}
                errors={errors}
              />
            );
          })}
          {(() => {
            const inFieldset = new Set(
              fieldsets.flatMap((fs) => flattenFieldNames(fs.fields))
            );
            const remaining = editableFields.filter((f) => !inFieldset.has(f.name));
            if (remaining.length === 0) return null;
            return (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {remaining.map((field) => (
                  <FormField
                    key={field.name}
                    field={field}
                    error={errors[field.name]}
                  />
                ))}
              </div>
            );
          })()}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {editableFields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              error={errors[field.name]}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-border pt-6">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading || isSubmitting}>
          {mode === 'create' ? 'Create' : 'Save changes'}
        </Button>
      </div>
    </>
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={submit} className="space-y-6">
        {formContent}
      </form>
    </FormProvider>
  );
}
