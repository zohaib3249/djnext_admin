'use client';

import { useLayout } from '@/contexts/LayoutContext';
import { useEffect, useState } from 'react';

export function LayoutDebug() {
  const { layout, allowSwitch, options } = useLayout();
  const [cssVars, setCssVars] = useState<Record<string, string>>({});
  const [htmlClasses, setHtmlClasses] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    setCssVars({
      background: computedStyle.getPropertyValue('--background'),
      foreground: computedStyle.getPropertyValue('--foreground'),
      primary: computedStyle.getPropertyValue('--primary'),
      card: computedStyle.getPropertyValue('--card'),
      border: computedStyle.getPropertyValue('--border'),
      radius: computedStyle.getPropertyValue('--radius'),
    });

    setHtmlClasses(root.className);
  }, [layout]);

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] p-4 rounded-lg text-xs font-mono max-w-sm"
      style={{
        backgroundColor: 'var(--card)',
        border: '2px solid var(--primary)',
        color: 'var(--foreground)'
      }}
    >
      <div className="font-bold mb-2" style={{ color: 'var(--primary)' }}>
        Layout Debug
      </div>
      <div><strong>Current:</strong> {layout}</div>
      <div><strong>Allow Switch:</strong> {String(allowSwitch)}</div>
      <div><strong>Options:</strong> {options.join(', ')}</div>
      <div className="mt-2"><strong>HTML classes:</strong></div>
      <div className="text-[10px] break-all">{htmlClasses}</div>
      <div className="mt-2"><strong>CSS Variables:</strong></div>
      {Object.entries(cssVars).map(([key, value]) => (
        <div key={key} className="text-[10px]">
          --{key}: {value || '(empty)'}
        </div>
      ))}
      <div
        className="mt-2 p-2 rounded"
        style={{ backgroundColor: 'var(--background)' }}
      >
        BG Test
      </div>
    </div>
  );
}
