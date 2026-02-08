'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { getDefaultValue } from '@/lib/fieldMapper';
import { ApiValidationError } from '@/lib/api';
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

/**
 * Serialize form value for API. Relation fields must send only ID(s), never full objects
 * (e.g. user must be "uuid-string", not { id, _display }), otherwise the API returns
 * "is not a valid UUID".
 */
function serializePayloadValue(field: FieldSchema, value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const relation = field.relation;
  if (relation) {
    if (relation.type === 'many_to_many' && Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'object' && item !== null && 'id' in item
          ? (item as { id: unknown }).id
          : item
      );
    }
    // Foreign keys and one_to_one: send only ID (string or number), never { id, _display }
    if (relation.type === 'foreign_key' || relation.type === 'one_to_one') {
      if (typeof value === 'object' && value !== null && 'id' in value) {
        return (value as { id: unknown }).id;
      }
      // Already an ID from RelationField selection
      return value;
    }
  }
  return value;
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
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = methods;

  const submit = handleSubmit(async (data) => {
    setSubmitError(null);
    const payload: Record<string, unknown> = {};
    editableFields.forEach((f) => {
      if (f.readonly) return; // do not send read-only fields in edit mode
      if (data[f.name] !== undefined) {
        payload[f.name] = serializePayloadValue(f, data[f.name]);
      }
    });
    try {
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setSubmitError(err.message);
        Object.entries(err.details).forEach(([fieldName, messages]) => {
          const msg = Array.isArray(messages) ? messages.join(' ') : String(messages);
          setError(fieldName, { type: 'server', message: msg });
        });
        return;
      }
      setSubmitError(err instanceof Error ? err.message : 'Request failed');
      throw err;
    }
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
        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        )}
        {formContent}
      </form>
    </FormProvider>
  );
}
