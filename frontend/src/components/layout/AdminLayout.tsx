'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchemaContext } from '@/contexts/SchemaContext';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { schema, isLoading: schemaLoading } = useSchemaContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (schemaLoading || !schema) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="w-64 border-r border-border p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        navigation={schema.navigation ?? []}
      />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        <Header
          user={user}
          siteName={schema.site?.name ?? 'Admin'}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onLogout={logout}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
