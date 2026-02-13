'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchemaContext } from '@/contexts/SchemaContext';
import { ModelAvatar } from '@/components/ui/ModelAvatar';
import type { NavGroup } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  navigation: NavGroup[];
  siteName?: string;
}

export function Sidebar({ isOpen, onToggle, navigation, siteName = 'Admin' }: SidebarProps) {
  const pathname = usePathname();
  const { basePath } = useSchemaContext();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-background-secondary transition-all duration-300',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {isOpen ? (
          <span className="text-lg font-semibold text-foreground truncate">
            {siteName}
          </span>
        ) : (
          <LayoutDashboard className="h-8 w-8 text-primary" aria-hidden />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Link
          href={`${basePath}/dashboard`}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer',
            pathname === `${basePath}/dashboard` || pathname === `${basePath}/dashboard/`
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-card-hover hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          {isOpen && <span>Dashboard</span>}
        </Link>

        {navigation.map((group) => (
          <NavSection
            key={group.app_label}
            group={group}
            isOpen={isOpen}
            pathname={pathname}
            basePath={basePath}
          />
        ))}
      </nav>
    </aside>
  );
}

function NavSection({
  group,
  isOpen,
  pathname,
  basePath,
}: {
  group: NavGroup;
  isOpen: boolean;
  pathname: string;
  basePath: string;
}) {
  return (
    <div className="space-y-1">
      {/* App label: expanded = normal header; collapsed = small full text + line */}
      {isOpen ? (
        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {group.label}
        </div>
      ) : (
        <>
          <div
            className="border-t border-border pt-2 mt-1 first:border-t-0 first:pt-0 first:mt-0"
            role="separator"
          />
          <div
            className="px-1.5 py-1 text-[10px] font-medium leading-tight text-muted-foreground text-center break-words min-h-[2rem] flex items-center justify-center"
            title={group.label}
          >
            {group.label}
          </div>
        </>
      )}
      {group.items?.map((item) => {
        const href = `${basePath}/${group.app_label}/${item.model_name}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={item.model_name}
            href={href}
            title={isOpen ? undefined : item.label}
            className={cn(
              'flex items-center rounded-lg py-2 text-sm font-medium transition-colors duration-200 cursor-pointer',
              isOpen ? 'gap-3 px-3' : 'justify-center px-0',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-card-hover hover:text-foreground'
            )}
          >
            <ModelAvatar label={item.label} icon={item.icon} size="sm" />
            {isOpen && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}
