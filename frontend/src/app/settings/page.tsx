'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const [first_name, setFirst_name] = useState('');
  const [last_name, setLast_name] = useState('');
  const [email, setEmail] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFirst_name(user.first_name ?? '');
      setLast_name(user.last_name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      await api.updateProfile({ first_name: first_name.trim(), last_name: last_name.trim(), email: email.trim() });
      await refreshUser();
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    setPasswordSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground">
          Profile &amp; settings
        </h1>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-foreground">
              Profile
            </h2>
            <p className="text-sm text-muted-foreground">
              Update your name and email. Username cannot be changed here.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="first_name" className="mb-1.5 block text-sm font-medium text-foreground">
                    First name
                  </label>
                  <Input
                    id="first_name"
                    value={first_name}
                    onChange={(e) => setFirst_name(e.target.value)}
                    disabled={profileSaving}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="mb-1.5 block text-sm font-medium text-foreground">
                    Last name
                  </label>
                  <Input
                    id="last_name"
                    value={last_name}
                    onChange={(e) => setLast_name(e.target.value)}
                    disabled={profileSaving}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={profileSaving}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" isLoading={profileSaving} disabled={profileSaving}>
                  Save profile
                </Button>
                {profileSuccess && (
                  <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>
                )}
              </div>
              {profileError && (
                <p className="text-sm text-destructive" role="alert">{profileError}</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-foreground">
              Change password
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your current password and choose a new one (at least 8 characters).
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="current_password" className="mb-1.5 block text-sm font-medium text-foreground">
                  Current password
                </label>
                <Input
                  id="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={passwordSaving}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="new_password" className="mb-1.5 block text-sm font-medium text-foreground">
                  New password
                </label>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={passwordSaving}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-foreground">
                  Confirm new password
                </label>
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={passwordSaving}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" isLoading={passwordSaving} disabled={passwordSaving}>
                  Change password
                </Button>
                {passwordSuccess && (
                  <span className="text-sm text-green-600 dark:text-green-400">Password updated.</span>
                )}
              </div>
              {passwordError && (
                <p className="text-sm text-destructive" role="alert">{passwordError}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
