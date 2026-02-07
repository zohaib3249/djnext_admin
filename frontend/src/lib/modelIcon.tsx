'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Users,
  User,
  ShoppingCart,
  Package,
  FolderTree,
  FileText,
  Settings,
  CreditCard,
  Mail,
  MessageSquare,
  Store,
  BarChart3,
  Ticket,
  Truck,
  Tag,
  Image,
  ListOrdered,
  ClipboardList,
  Shield,
  Activity,
  MapPin,
  Smartphone,
  BookOpen,
  Video,
  MessageCircle,
  HelpCircle,
  Wallet,
  LayoutDashboard,
} from 'lucide-react';

/** First letters of words in label, uppercase, max 2 chars. e.g. "User Table" → "UT", "Order" → "O" */
export function getModelInitials(label: string): string {
  if (!label || typeof label !== 'string') return '?';
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  User,
  ShoppingCart,
  Package,
  FolderTree,
  FileText,
  Settings,
  CreditCard,
  Mail,
  MessageSquare,
  Store,
  BarChart3,
  Ticket,
  Truck,
  Tag,
  Image,
  ListOrdered,
  ClipboardList,
  Shield,
  Activity,
  MapPin,
  Smartphone,
  BookOpen,
  Video,
  MessageCircle,
  HelpCircle,
  Wallet,
  LayoutDashboard,
};

function normalizeIconKey(name: string): string {
  return name.replace(/[- ]/g, '').toLowerCase();
}

/** Resolve optional icon name from admin to a Lucide icon component, or null for initials fallback. */
export function getModelIcon(iconName?: string | null): LucideIcon | null {
  if (!iconName || typeof iconName !== 'string') return null;
  const key = ICON_MAP[iconName] ? iconName : Object.keys(ICON_MAP).find((k) => normalizeIconKey(k) === normalizeIconKey(iconName));
  return key ? ICON_MAP[key] : null;
}
