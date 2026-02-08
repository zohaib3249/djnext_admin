'use client';

import { useLayout } from '@/contexts/LayoutContext';
import type { LayoutId } from '@/types';

const LAYOUT_INFO: Record<LayoutId, { name: string; description: string }> = {
  basic: {
    name: 'Basic',
    description: 'Clean, solid colors - best for production',
  },
  glassmorphism: {
    name: 'Glass',
    description: 'Frosted glass with blur effects',
  },
  aurora: {
    name: 'Aurora',
    description: 'Gradient background with glow effects',
  },
  neumorphism: {
    name: 'Soft',
    description: 'Soft UI with extruded shadows',
  },
  minimal: {
    name: 'Minimal',
    description: 'Ultra-clean, content-focused',
  },
};

export function LayoutSwitcher() {
  const { layout, setLayout, allowSwitch, options } = useLayout();

  if (!allowSwitch || options.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--foreground-muted)]">Layout:</span>
      <div className="flex gap-1">
        {options.map((id) => {
          const info = LAYOUT_INFO[id] || { name: id, description: '' };
          const isActive = layout === id;

          return (
            <button
              key={id}
              onClick={() => setLayout(id)}
              title={info.description}
              className={`
                px-3 py-1.5 text-sm rounded-[var(--radius)] transition-all
                ${
                  isActive
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--background-secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
                }
              `}
            >
              {info.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compact version for header
export function LayoutSwitcherCompact() {
  const { layout, setLayout, allowSwitch, options } = useLayout();

  if (!allowSwitch || options.length <= 1) {
    return null;
  }

  return (
    <select
      value={layout}
      onChange={(e) => setLayout(e.target.value as LayoutId)}
      className="
        px-2 py-1 text-sm rounded-[var(--radius)]
        bg-[var(--input)] border border-[var(--input-border)]
        text-[var(--foreground)]
        focus:outline-none focus:border-[var(--primary)]
      "
    >
      {options.map((id) => {
        const info = LAYOUT_INFO[id] || { name: id, description: '' };
        return (
          <option key={id} value={id}>
            {info.name}
          </option>
        );
      })}
    </select>
  );
}
