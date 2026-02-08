'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ObjectToolSchema } from '@/types';
import * as LucideIcons from 'lucide-react';

interface ObjectToolsProps {
  tools: ObjectToolSchema[];
  objectId: string;
  appLabel: string;
  modelName: string;
  onRefresh?: () => void;
}

/**
 * Object Tools - Action buttons on detail page.
 * Calls /api/admin/{app}/{model}/{id}/tools/{tool_name}/ endpoint.
 */
export function ObjectTools({
  tools,
  objectId,
  appLabel,
  modelName,
  onRefresh,
}: ObjectToolsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!tools || tools.length === 0) return null;

  const executeTool = async (tool: ObjectToolSchema) => {
    // Show confirmation dialog if tool has confirm message
    if (tool.confirm) {
      const confirmed = window.confirm(tool.confirm);
      if (!confirmed) return;
    }

    setLoading(tool.name);
    setMessage(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/admin';
      const url = `${apiBase}/${appLabel}/${modelName}/${objectId}/tools/${tool.name}/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
      } else {
        setMessage({ type: 'success', text: data.message || `${tool.label} completed` });
        // Refresh the detail page data if callback provided
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(null);
    }
  };

  // Get icon component from Lucide
  const getIcon = (iconName: string | undefined) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {tools.map((tool) => (
          <Button
            key={tool.name}
            variant={tool.variant || 'secondary'}
            size="sm"
            onClick={() => executeTool(tool)}
            isLoading={loading === tool.name}
            leftIcon={getIcon(tool.icon)}
            disabled={loading !== null}
          >
            {tool.label}
          </Button>
        ))}
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`text-sm px-3 py-2 rounded-md ${
            message.type === 'success'
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
