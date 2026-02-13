'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [displayPath, setDisplayPath] = useState(pathname);

  // Update document title from schema
  useEffect(() => {
    if (schema?.site?.name) {
      document.title = schema.site.name;
    }
  }, [schema?.site?.name]);

  // On route change: show skeleton briefly then content (no slide animation)
  useEffect(() => {
    if (pathname !== displayPath) {
      setShowSkeleton(true);
      setDisplayPath(pathname);
    }
  }, [pathname, displayPath]);

  useEffect(() => {
    if (!showSkeleton) return;
    const t = setTimeout(() => setShowSkeleton(false), 80);
    return () => clearTimeout(t);
  }, [showSkeleton]);

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
        siteName={schema.site?.name ?? 'Admin'}
      />
      <div
        className={cn(
          'transition-[margin-left] duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        <Header
          user={user}
          siteName={schema.site?.name ?? 'Admin'}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onLogout={logout}
        />
        <main className="p-6">
          {showSkeleton ? (
            <div className="space-y-4" key="skeleton">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div key={pathname ?? 'main'}>{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
