'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalSchema } from '@/hooks/useSchema';
import { LayoutProvider } from '@/contexts/LayoutContext';
import type { GlobalSchema, AppSchema, ModelSummary, LayoutConfig, ThemeConfig } from '@/types';

interface SchemaContextType {
  schema: GlobalSchema | null;
  isLoading: boolean;
  error: Error | null;
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

  return (
    <SchemaContext.Provider
      value={{
        schema: schema ?? null,
        isLoading,
        error: error as Error | null,
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
