'use client';

import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FieldSchema, ModelSchema } from '@/types';

export type FilterOption = { value: string | number | boolean; label: string };

/**
 * Fetches filter options for list_filter fields when we show the table.
 * - Choice fields: use schema.fields[].choices
 * - Relation (FK) fields: fetch via autocomplete API
 * - Boolean: All / Yes / No
 */
export function useFilterOptions(schema: ModelSchema | null) {
  const filterFields = schema?.list_filter ?? [];
  const fields: FieldSchema[] =
    filterFields
      .map((name) => schema?.fields?.find((f) => f.name === name))
      .filter((f): f is FieldSchema => Boolean(f)) ?? [];

  const relationFields = fields.filter((f) => f.relation && !f.choices?.length);

  const queries = useQueries({
    queries: relationFields.map((field) => ({
      queryKey: ['filterOptions', field.relation!.app_label, field.relation!.model_name],
      queryFn: async () => {
        try {
          return await api.autocomplete(
            field.relation!.app_label,
            field.relation!.model_name,
            undefined
          );
        } catch {
          return await api.relationOptions(
            field.relation!.app_label,
            field.relation!.model_name,
            undefined,
            50
          );
        }
      },
      staleTime: 5 * 60 * 1000,
      enabled: !!schema && !!field.relation?.app_label && !!field.relation?.model_name,
    })),
  });

  const optionsByField: Record<string, FilterOption[]> = {};
  if (schema?.fields) {
    for (const field of fields) {
      if (field.choices?.length) {
        optionsByField[field.name] = field.choices.map((c) => ({
          value: c.value,
          label: c.label,
        }));
      } else if (field.type === 'boolean' || field.widget === 'checkbox') {
        optionsByField[field.name] = [
          { value: true, label: 'Yes' },
          { value: false, label: 'No' },
        ];
      } else if (field.relation) {
        const idx = relationFields.findIndex((f) => f.name === field.name);
        const result = queries[idx]?.data;
        if (result?.results?.length) {
          optionsByField[field.name] = result.results.map((r) => ({
            value: r.id,
            label: r.text,
          }));
        } else {
          optionsByField[field.name] = [];
        }
      }
    }
  }

  const isLoading = queries.some((q) => q.isLoading);

  return { optionsByField, isLoading };
}
