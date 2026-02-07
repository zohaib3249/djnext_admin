'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SchemaProvider } from '@/contexts/SchemaContext';
import { GlobalMediaInjector } from '@/components/layout/CustomMediaInjector';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SchemaProvider>
            <GlobalMediaInjector />
            {children}
          </SchemaProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
