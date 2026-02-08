'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    router.replace('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);
    try {
      await api.requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

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
            Reset password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                If an account exists with that email, you will receive a password reset link shortly.
              </p>
              <Link href="/login">
                <Button variant="secondary" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                disabled={isLoading || !email.trim()}
              >
                Send reset link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
