'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSchemaContext } from '@/contexts/SchemaContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { SiteInfo } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { basePath } = useSchemaContext();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSiteInfo().then(setSiteInfo).catch(() => setSiteInfo(null));
  }, []);

  if (isAuthenticated) {
    router.replace(`${basePath}/dashboard`);
    return null;
  }

  const siteName = siteInfo?.name?.trim() || 'DJNext Admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold text-foreground">
            {siteName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your username or email
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Username or email
              </label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@example.com"
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              isLoading={submitting}
              disabled={isLoading || !identifier.trim() || !password}
            >
              Sign in
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href={`${basePath}/forgot-password`} className="text-primary hover:underline">
                Forgot password?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
