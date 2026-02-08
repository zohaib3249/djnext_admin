'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validLink = Boolean(uid && token);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await api.confirmPasswordReset(uid, token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated || isLoading) return null;

  if (!validLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-xl font-semibold text-foreground">
              Invalid reset link
            </h1>
            <p className="text-sm text-muted-foreground">
              This link is missing parameters or has expired. Please request a new password reset.
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button variant="secondary" className="w-full">
                Request new link
              </Button>
            </Link>
            <Link href="/login" className="block mt-3 text-center text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-xl font-semibold text-foreground">
              Password reset
            </h1>
            <p className="text-sm text-muted-foreground">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">
                Sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Set new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below (at least 8 characters).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={submitting}
                className="w-full"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={submitting}
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
              disabled={!newPassword || !confirmPassword || newPassword.length < 8}
            >
              Reset password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
