'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSchemaContext } from '@/contexts/SchemaContext';
import Link from 'next/link';
import { LayoutDashboard, ArrowRight, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModelAvatar } from '@/components/ui/ModelAvatar';
import type { NavGroup, NavItem } from '@/types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { schema } = useSchemaContext();

  if (!isLoading && !isAuthenticated) {
    router.replace('/login');
    return null;
  }

  const navigation = schema?.navigation ?? [];
  const hasModels = navigation.length > 0 && navigation.some((g) => g.items?.length);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome / overview */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {getGreeting()}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {user?.first_name || user?.username || 'Admin'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your data from the sections below.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 px-4 py-2 md:mt-0">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {navigation.reduce((acc, g) => acc + (g.items?.length ?? 0), 0)} models
              </span>
            </div>
          </div>
        </section>

        {/* Model sections by app */}
        {hasModels && (
          <div className="space-y-8">
            {navigation.map((group) => (
              <AppSection key={group.app_label} group={group} />
            ))}
          </div>
        )}

        {!hasModels && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                No models yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Register models in Django admin to see them here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function AppSection({ group }: { group: NavGroup }) {
  if (!group.items?.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">
          {group.label}
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {group.items.map((item) => (
          <ModelCard
            key={`${group.app_label}-${item.model_name}`}
            item={item}
            appLabel={group.label}
            basePath={`/${group.app_label}/${item.model_name}`}
          />
        ))}
      </div>
    </section>
  );
}

function ModelCard({
  item,
  appLabel,
  basePath,
}: {
  item: NavItem;
  appLabel: string;
  basePath: string;
}) {
  return (
    <Link href={basePath} className="group block cursor-pointer">
      <Card className="transition-all duration-200 hover:border-primary/30 hover:bg-card-hover hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-4">
          <ModelAvatar label={item.label} icon={item.icon} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-foreground truncate group-hover:text-primary">
              {item.label}
            </h3>
            <p className="text-xs text-muted-foreground">{appLabel}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </CardHeader>
      </Card>
    </Link>
  );
}
