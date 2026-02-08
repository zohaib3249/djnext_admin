'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { FieldSchema } from '@/types';

interface EditableCellProps {
  value: unknown;
  fieldName: string;
  fieldSchema?: FieldSchema;
  onSave: (value: unknown) => void;
}

/**
 * Editable cell for list_editable inline editing.
 * Supports text, number, boolean, and select fields.
 */
export function EditableCell({
  value,
  fieldName,
  fieldSchema,
  onSave,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<unknown>(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Reset edit value when source value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Display mode
  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="w-full text-left px-2 py-1 -mx-2 -my-1 rounded hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors"
        title="Click to edit"
      >
        <CellDisplay value={value} fieldSchema={fieldSchema} />
      </button>
    );
  }

  // Edit mode - render appropriate input based on field type
  const widget = fieldSchema?.widget || 'text';
  const choices = fieldSchema?.choices;

  // Boolean field - checkbox
  if (widget === 'checkbox' || fieldSchema?.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="checkbox"
          checked={Boolean(editValue)}
          onChange={(e) => setEditValue(e.target.checked)}
          onKeyDown={handleKeyDown}
          className="rounded border-border"
        />
        <EditButtons onSave={handleSave} onCancel={handleCancel} />
      </div>
    );
  }

  // Select field - choices
  if (choices && choices.length > 0) {
    return (
      <div className="flex items-center gap-1">
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(editValue ?? '')}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-2 py-1 text-sm rounded border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
        <EditButtons onSave={handleSave} onCancel={handleCancel} />
      </div>
    );
  }

  // Number field
  if (widget === 'number' || fieldSchema?.type === 'integer' || fieldSchema?.type === 'number') {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={editValue as number ?? ''}
          onChange={(e) => setEditValue(e.target.valueAsNumber || e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 w-20 px-2 py-1 text-sm rounded border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <EditButtons onSave={handleSave} onCancel={handleCancel} />
      </div>
    );
  }

  // Default: text input
  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={String(editValue ?? '')}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-2 py-1 text-sm rounded border border-border bg-input focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <EditButtons onSave={handleSave} onCancel={handleCancel} />
    </div>
  );
}

function EditButtons({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onSave}
        className="p-1 text-success hover:bg-success/10 rounded transition-colors"
        title="Save"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
        title="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function CellDisplay({
  value,
  fieldSchema,
}: {
  value: unknown;
  fieldSchema?: FieldSchema;
}) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  // Boolean
  if (typeof value === 'boolean') {
    return <span>{value ? 'Yes' : 'No'}</span>;
  }

  // Choice field - show label
  if (fieldSchema?.choices) {
    const choice = fieldSchema.choices.find((c) => String(c.value) === String(value));
    return <span>{choice?.label || String(value)}</span>;
  }

  return <span>{String(value)}</span>;
}
