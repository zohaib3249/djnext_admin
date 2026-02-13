'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalSchema } from '@/hooks/useSchema';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { api } from '@/lib/api';
import { getBasePathFromPathname } from '@/lib/basePath';
import { logBasePath, logLoading } from '@/lib/debug';
import type { GlobalSchema, AppSchema, ModelSummary, LayoutConfig, ThemeConfig } from '@/types';

interface SchemaContextType {
  schema: GlobalSchema | null;
  isLoading: boolean;
  error: Error | null;
  /** Base path for admin frontend (from schema or NEXT_PUBLIC_BASE_PATH). Use for Link hrefs and assets. */
  basePath: string;
  getApp: (appLabel: string) => AppSchema | undefined;
  getModel: (appLabel: string, modelName: string) => ModelSummary | undefined;
  hasPermission: (
    appLabel: string,
    modelName: string,
    action: 'add' | 'change' | 'delete' | 'view'
  ) => boolean;
  layoutConfig: LayoutConfig | undefined;
  themeConfig: ThemeConfig | undefined;
}

const SchemaContext = createContext<SchemaContextType | null>(null);

export function SchemaProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: schema, isLoading, error } = useGlobalSchema({
    enabled: !authLoading && isAuthenticated,
  });

  const getApp = (appLabel: string): AppSchema | undefined =>
    schema?.apps?.find((a) => a.app_label === appLabel);

  const getModel = (
    appLabel: string,
    modelName: string
  ): ModelSummary | undefined => {
    const app = getApp(appLabel);
    return app?.models?.find((m) => m.model_name === modelName);
  };

  const hasPermission = (
    appLabel: string,
    modelName: string,
    action: 'add' | 'change' | 'delete' | 'view'
  ): boolean => {
    const model = getModel(appLabel, modelName);
    return model?.permissions?.[action] ?? false;
  };

  const layoutConfig = schema?.site?.layout;
  const themeConfig = schema?.site?.theme;
  // Prefer Django-injected base path (window.__DJNEXT_BASE_PATH) so sidebar/links work under any mount.
  // Use schema.site.frontend_base_path only when not running under Django (e.g. dev or custom deploy).
  const injectedBase = getBasePathFromPathname();
  const schemaBase =
    (schema?.site?.frontend_base_path !== undefined && schema?.site?.frontend_base_path !== null
      ? String(schema.site.frontend_base_path).trim()
      : '') || '';
  const basePath = injectedBase || schemaBase || '';

  const prev = useRef({ basePath: '', isLoading, authLoading, isAuthenticated: false });
  useEffect(() => {
    if (prev.current.basePath !== basePath || prev.current.isLoading !== isLoading || prev.current.authLoading !== authLoading || prev.current.isAuthenticated !== isAuthenticated) {
      const source = basePath === injectedBase && injectedBase ? 'injected' : schemaBase ? 'schema' : 'none';
      logBasePath('SchemaContext', basePath, source);
      logLoading('Schema', isLoading, `authLoading=${authLoading} isAuthenticated=${isAuthenticated}`);
      prev.current = { basePath, isLoading, authLoading, isAuthenticated };
    }
  }, [basePath, injectedBase, schemaBase, isLoading, authLoading, isAuthenticated]);

  // Use API origin/path from schema only when it matches our mount (e.g. /admin/api/).
  // Never apply schema path like /api/ so we don't point to the project's auth instead of djnext_admin's (<mount>/api/auth/).
  useEffect(() => {
    const path = schema?.site?.api_path ?? schema?.site?.api_base;
    if (!path) return;
    const mount = getBasePathFromPathname();
    if (mount && !path.startsWith(mount)) return;
    const origin =
      (schema?.site?.api_origin && schema.site.api_origin.trim()) ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    if (origin) api.setApiBaseFromSchema(origin, path);
  }, [schema?.site?.api_origin, schema?.site?.api_path, schema?.site?.api_base]);

  return (
    <SchemaContext.Provider
      value={{
        schema: schema ?? null,
        isLoading,
        error: error as Error | null,
        basePath,
        getApp,
        getModel,
        hasPermission,
        layoutConfig,
        themeConfig,
      }}
    >
      <LayoutProvider config={layoutConfig}>
        {children}
      </LayoutProvider>
    </SchemaContext.Provider>
  );
}

export function useSchemaContext() {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error('useSchemaContext must be used within SchemaProvider');
  return ctx;
}
