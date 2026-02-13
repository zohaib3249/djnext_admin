import type { ComponentType } from 'react';
import type { FieldSchema } from '@/types';

// Field components (lazy to avoid circular deps)
import { TextField } from '@/components/form/fields/TextField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { NumberField } from '@/components/form/fields/NumberField';
import { SelectField } from '@/components/form/fields/SelectField';
import { CheckboxField } from '@/components/form/fields/CheckboxField';
import { DateField } from '@/components/form/fields/DateField';
import { DateTimeField } from '@/components/form/fields/DateTimeField';
import { RelationField } from '@/components/form/fields/RelationField';
import { ManyToManyField } from '@/components/form/fields/ManyToManyField';
import { JsonField } from '@/components/form/fields/JsonField';

export type FieldComponentProps = {
  field: FieldSchema;
  value?: unknown;
  onChange?: (value: unknown) => void;
  onBlur?: () => void;
  error?: { message?: string };
};

// Field components accept compatible props (field, value, onChange, etc.); exact prop types vary per widget.
const widgetToComponent = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  decimal: NumberField,
  email: TextField,
  url: TextField,
  slug: TextField,
  checkbox: CheckboxField,
  select: SelectField,
  date: DateField,
  datetime: DateTimeField,
  time: DateTimeField,
  hidden: TextField,
  password: TextField,
  json: JsonField,
} as Record<string, ComponentType<FieldComponentProps>>;

export function getFieldComponent(field: FieldSchema): ComponentType<FieldComponentProps> {
  if (field.relation?.type === 'many_to_many') return ManyToManyField as ComponentType<FieldComponentProps>;
  if (field.relation) return RelationField as ComponentType<FieldComponentProps>;
  if (field.choices?.length) return SelectField as ComponentType<FieldComponentProps>;
  if (field.widget === 'json' || field.type === 'object') return JsonField as ComponentType<FieldComponentProps>;
  return widgetToComponent[field.widget] ?? TextField;
}

export function getValidationRules(field: FieldSchema): Record<string, unknown> {
  const rules: Record<string, unknown> = {};
  if (field.required && !field.nullable) {
    rules.required = `${field.verbose_name} is required`;
  }
  if (field.max_length) {
    rules.maxLength = {
      value: field.max_length,
      message: `Max ${field.max_length} characters`,
    };
  }
  if (field.minimum != null) {
    rules.min = { value: field.minimum, message: `Min value is ${field.minimum}` };
  }
  if (field.format === 'email' || field.widget === 'email') {
    rules.pattern = {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email',
    };
  }
  return rules;
}

export function getDefaultValue(field: FieldSchema): unknown {
  if (field.default !== undefined) return field.default;
  switch (field.type) {
    case 'string':
      return '';
    case 'boolean':
      return false;
    case 'integer':
    case 'number':
      return null;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return field.nullable ? null : '';
  }
}
