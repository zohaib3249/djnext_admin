'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getBasePathFromPathname } from '@/lib/basePath';
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';
import SettingsPage from '@/app/settings/page';
import SearchPage from '@/app/search/page';
import ForgotPasswordPage from '@/app/forgot-password/page';
import ResetPasswordPage from '@/app/reset-password/page';
import ModelListPageClient from '@/app/[app]/[model]/ModelListPageClient';
import ModelCreatePageClient from '@/app/[app]/[model]/create/ModelCreatePageClient';
import DetailPageClient from '@/app/[app]/[model]/[id]/DetailPageClient';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
  </div>
);

function IndexRedirect() {
  const router = useRouter();
  const basePath = getBasePathFromPathname();
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading) {
    if (isAuthenticated) {
      router.replace(`${basePath}/dashboard`);
    } else {
      router.replace(`${basePath}/login`);
    }
  }

  return <Spinner />;
}

export default function SPARouterClient() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const basePath = getBasePathFromPathname();

  const segments = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    const p = pathname ?? '';
    if (typeof p !== 'string') return [];
    const base = String(basePath || '').replace(/\/+$/, '');
    const rest = base ? (p.startsWith(base) ? p.slice(base.length) : p) : p;
    const trimmed = (rest || '/').replace(/^\/+/, '').replace(/\/+$/, '') || '';
    return trimmed ? trimmed.split('/') : [];
  }, [pathname, basePath, mounted]);

  if (!mounted) return <Spinner />;
  if (segments.length === 0) return <IndexRedirect />;
  if (segments[0] === 'login') return <LoginPage />;
  if (segments[0] === 'dashboard') return <DashboardPage />;
  if (segments[0] === 'settings') return <SettingsPage />;
  if (segments[0] === 'search') return <SearchPage />;
  if (segments[0] === 'forgot-password') return <ForgotPasswordPage />;
  if (segments[0] === 'reset-password') return <ResetPasswordPage />;
  if (segments.length === 2 && segments[1] !== 'create') {
    return <ModelListPageClient params={Promise.resolve({ app: segments[0], model: segments[1] })} />;
  }
  if (segments.length === 3 && segments[2] === 'create') {
    return <ModelCreatePageClient params={Promise.resolve({ app: segments[0], model: segments[1] })} />;
  }
  if (segments.length === 3 && segments[2] !== 'create') {
    return <DetailPageClient params={Promise.resolve({ app: segments[0], model: segments[1], id: segments[2] })} />;
  }
  return <IndexRedirect />;
}
