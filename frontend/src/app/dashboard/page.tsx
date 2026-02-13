'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSchemaContext } from '@/contexts/SchemaContext';
import { useList } from '@/hooks/useList';
import Link from 'next/link';
import {
  LayoutDashboard,
  ArrowRight,
  FolderOpen,
  Activity,
  Database,
  BarChart3,
  Clock,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ModelAvatar } from '@/components/ui/ModelAvatar';
import { Spinner } from '@/components/ui/Spinner';
import { logBasePath, logLoading } from '@/lib/debug';
import type { NavGroup, NavItem } from '@/types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};
const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
};
const CHART_COLORS = ['#10b981', '#3b82f6', '#ef4444']; // emerald, blue, red

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { schema, basePath, isLoading: schemaLoading } = useSchemaContext();
  const {
    results: recentLogs,
    count: auditCount,
    isLoading: logsLoading,
  } = useList('djnext_admin', 'auditlog', { page: 1, page_size: 10 });

  logBasePath('DashboardPage', basePath, '');
  logLoading('DashboardPage', isLoading, `auth isAuthenticated=${isAuthenticated}`);
  logLoading('DashboardPage schema', schemaLoading, '');
  logLoading('DashboardPage auditlog', logsLoading, '');

  if (!isLoading && !isAuthenticated) {
    router.replace(`${basePath}/login`);
    return null;
  }

  const navigation = schema?.navigation ?? [];
  const totalModels = navigation.reduce((acc, g) => acc + (g.items?.length ?? 0), 0);
  const hasModels = totalModels > 0;

  // Simple action counts from recent logs for chart
  const actionCounts = { create: 0, update: 0, delete: 0 };
  (recentLogs ?? []).forEach((r: Record<string, unknown>) => {
    const a = String(r.action ?? '');
    if (a in actionCounts) actionCounts[a as keyof typeof actionCounts]++;
  });
  const chartData = [
    { name: 'Created', value: actionCounts.create, fill: CHART_COLORS[0] },
    { name: 'Updated', value: actionCounts.update, fill: CHART_COLORS[1] },
    { name: 'Deleted', value: actionCounts.delete, fill: CHART_COLORS[2] },
  ];
  const barChartData = [
    { action: 'Created', count: actionCounts.create },
    { action: 'Updated', count: actionCounts.update },
    { action: 'Deleted', count: actionCounts.delete },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome + quick stats */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{getGreeting()}</p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {user?.first_name || user?.username || 'Admin'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Overview and recent activity across your admin.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{totalModels} models</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {logsLoading ? '…' : auditCount} actions
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{totalModels}</p>
                <p className="text-xs text-muted-foreground">Total models</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {logsLoading ? '—' : auditCount}
                </p>
                <p className="text-xs text-muted-foreground">Audit log entries</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {actionCounts.create + actionCounts.update + actionCounts.delete}
                </p>
                <p className="text-xs text-muted-foreground">Recent actions (last 10)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-amber-500/10 p-3">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Live</p>
                <p className="text-xs text-muted-foreground">Activity stream below</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts row: Bar + Pie */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Actions by type (last 10)
              </h2>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="action"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Activity className="h-5 w-5 text-muted-foreground" />
                Distribution
              </h2>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }: { name: string; value: number }) =>
                        value > 0 ? `${name}: ${value}` : ''
                      }
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Recent activity
            </h2>
            <Link
              href={`${basePath}/djnext_admin/auditlog`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="md" />
              </div>
            ) : !recentLogs?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No activity yet. Create, update, or delete records to see events here.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-background-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Model
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Object
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(recentLogs as Record<string, unknown>[]).map((log) => {
                      const action = String(log.action ?? '');
                      const ActionIcon =
                        action === 'create'
                          ? Plus
                          : action === 'update'
                            ? Pencil
                            : Trash2;
                      return (
                        <tr key={String(log.id)} className="bg-card hover:bg-card-hover">
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-white ${ACTION_COLORS[action] ?? 'bg-muted'}`}
                            >
                              <ActionIcon className="h-3 w-3" />
                              {ACTION_LABELS[action] || action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {String(log.app_label ?? '')}.{String(log.model_name ?? '')}
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                            {String(log.object_repr || log.object_id || '—')}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {log.user ? (
                              typeof log.user === 'object' && log.user !== null &&
                              'username' in (log.user as object)
                                ? String((log.user as Record<string, unknown>).username ?? (log.user as Record<string, unknown>).email ?? '')
                                : String(log.user)
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {log.created_at
                              ? new Date(String(log.created_at)).toLocaleString()
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model sections */}
        {hasModels && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Models</h2>
            </div>
            <div className="space-y-6">
              {navigation.map((group) => (
                <AppSection key={group.app_label} group={group} basePath={basePath} />
              ))}
            </div>
          </section>
        )}

        {!hasModels && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">No models yet</h2>
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

function AppSection({ group, basePath }: { group: NavGroup; basePath: string }) {
  if (!group.items?.length) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">{group.label}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {group.items.map((item) => (
          <ModelCard
            key={`${group.app_label}-${item.model_name}`}
            item={item}
            appLabel={group.label}
            basePath={`${basePath}/${group.app_label}/${item.model_name}`}
          />
        ))}
      </div>
    </div>
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
