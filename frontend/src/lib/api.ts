import type {
  ApiResponse,
  GlobalSchema,
  GlobalSearchResult,
  ModelSchema,
  PaginatedResponse,
  LoginResponse,
  User,
  ListParams,
  SiteInfo,
} from '@/types';

import { logToken } from '@/lib/debug';

const DEFAULT_API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || '';
const DEFAULT_API_PATH = process.env.NEXT_PUBLIC_API_PATH || '';

const STORAGE_ACCESS = 'djnext_access_token';
const STORAGE_REFRESH = 'djnext_refresh_token';

/**
 * Build initial API base URL.
 * - Served by Django (window.__DJNEXT_BASE_PATH set): use that mount + '/api/' on same origin (or NEXT_PUBLIC_API_URL if set).
 * - Dev (no inject): use NEXT_PUBLIC_API_URL + NEXT_PUBLIC_API_PATH from .env.local when set; else derive from pathname.
 */
function getInitialBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = (DEFAULT_API_ORIGIN || '').trim() || window.location.origin;
    const injected = (window as unknown as { __DJNEXT_BASE_PATH?: string }).__DJNEXT_BASE_PATH;
    const hasInjected =
      injected !== undefined && injected !== null && String(injected).trim() !== '';

    if (hasInjected) {
      const mount = String(injected).trim().startsWith('/') ? String(injected).trim() : '/' + String(injected).trim();
      const apiPath = `${mount}/api`.replace(/\/*$/, '') + '/';
      return `${origin.replace(/\/$/, '')}${apiPath.startsWith('/') ? '' : '/'}${apiPath}`;
    }

    if (DEFAULT_API_PATH && String(DEFAULT_API_PATH).trim() !== '') {
      const path = String(DEFAULT_API_PATH).trim().replace(/\/+$/, '') + '/';
      return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    const pathname = window.location.pathname || '/';
    const segments = pathname.split('/').filter(Boolean);
    const mount = segments[0] ? `/${segments[0]}` : '';
    const apiPath = `${mount}/api`.replace(/\/*$/, '') + '/';
    return `${origin.replace(/\/$/, '')}${apiPath.startsWith('/') ? '' : '/'}${apiPath}`;
  }

  const path = (DEFAULT_API_PATH || '').trim();
  const p = path ? path.replace(/\/*$/, '') + '/' : '';
  const o = (DEFAULT_API_ORIGIN || 'http://localhost:8000').replace(/\/$/, '');
  return `${o}${p ? (p.startsWith('/') ? p : '/' + p) : ''}`;
}

/** Thrown on 400 with field-level validation errors; details is { fieldName: string[] } */
export class ApiValidationError extends Error {
  details: Record<string, string[]>;

  constructor(message: string, details: Record<string, string[]>) {
    super(message);
    this.name = 'ApiValidationError';
    this.details = details;
  }
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseUrl = getInitialBaseUrl();
    if (typeof window !== 'undefined') {
      this.syncTokensFromStorage();
    }
  }

  /** Set API base URL from schema (settings/default). Only applies when path matches current mount so we never point to project's /api/ instead of djnext_admin's /mount/api/. */
  setApiBaseFromSchema(apiOrigin: string, apiPath: string) {
    if (typeof window !== 'undefined') {
      const pathname = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
      const mount = pathname.split('/').filter(Boolean)[0];
      if (mount) {
        const path = (apiPath || '').trim().replace(/^\/+/, '');
        if (!path.startsWith(mount + '/') && path !== mount) return;
      }
    }
    const origin = (apiOrigin || '').replace(/\/$/, '');
    const path = (apiPath || '').startsWith('/') ? apiPath : `/${apiPath}`;
    this.baseUrl = `${origin}${path}`.replace(/\/*$/, '') + '/';
  }

  /** Public POST helper for custom endpoints (e.g. object tools). */
  async post<T>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST' });
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('djnext_access_token', token);
      } else {
        localStorage.removeItem('djnext_access_token');
      }
    }
  }

  setRefreshToken(token: string | null) {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('djnext_refresh_token', token);
      } else {
        localStorage.removeItem('djnext_refresh_token');
      }
    }
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('djnext_refresh_token');
    }
    return null;
  }

  /** Sync tokens from localStorage so we use stored values after reload (constructor may have run before localStorage was ready). */
  private syncTokensFromStorage(): void {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('djnext_access_token');
    if (stored !== null && stored !== '') this.accessToken = stored;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    this.syncTokensFromStorage();

    const base = this.baseUrl.replace(/\/*$/, '');
    const path = endpoint.startsWith('http') ? endpoint : `${base}/${endpoint.replace(/^\/+/, '')}`;
    const url = endpoint.startsWith('http') ? endpoint : path;
    const method = (options.method || 'GET').toUpperCase();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const body = await response.json().catch(() => ({}));

    // Backend may return raw payload or wrapped { data, error }
    const hasWrapper = body && typeof body === 'object' && 'data' in body;
    const hasError = body && typeof body === 'object' && 'error' in body;

    if (!response.ok) {
      const errObj = hasError && typeof body.error === 'object' ? (body.error as { message?: string; details?: Record<string, string[]> }) : null;
      const message =
        (typeof body.message === 'string' && body.message) ||
        (errObj && typeof errObj.message === 'string' && errObj.message) ||
        (hasError && typeof body.error === 'string' ? body.error : null) ||
        'Request failed';
      // On 401 (except login): try refresh once, then retry. If refresh returns 401/403, tokens are cleared and we throw (→ login).
      const isLogin = endpoint.replace(/^\/+/, '').startsWith('auth/login');
      if (response.status === 401 && !isLogin) {
        if (this.getRefreshToken()) {
          const refreshed = await this.refreshToken();
          if (refreshed) return this.request<T>(endpoint, options);
        } else {
          this.setAccessToken(null);
          this.setRefreshToken(null);
        }
      }
      // details can be at body.details or body.error.details
      const details: Record<string, string[]> =
        (body && typeof body === 'object' && body.details && typeof body.details === 'object' && (body.details as Record<string, string[]>)) ||
        (errObj && errObj.details && typeof errObj.details === 'object' && errObj.details) ||
        {};
      if (response.status === 400 && Object.keys(details).length > 0) {
        throw new ApiValidationError(message, details);
      }
      throw new Error(message);
    }

    if (hasError && body.error) {
      const msg = typeof body.error === 'object' ? (body.error as { message?: string }).message : body.error;
      throw new Error(msg || 'Request failed');
    }

    return (hasWrapper ? body.data : body) as T;
  }

  // Auth methods (backend accepts username or email)
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username: identifier, password }),
    });

    if (data.tokens?.access) {
      this.setAccessToken(data.tokens.access);
      logToken('login: access token saved');
    }
    if (data.tokens?.refresh) {
      this.setRefreshToken(data.tokens.refresh);
      logToken('login: refresh token saved');
    }
    if (!data.tokens?.access && !data.tokens?.refresh) {
      logToken('login: no tokens in response', JSON.stringify(Object.keys(data || {})));
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout/', { method: 'POST' });
    } finally {
      this.setAccessToken(null);
      this.setRefreshToken(null);
    }
  }

  async getUser(): Promise<User> {
    return this.request<User>('/auth/user/');
  }

  async updateProfile(data: { first_name?: string; last_name?: string; email?: string }): Promise<User> {
    return this.request<User>('/auth/user/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/password-change/', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  }

  async confirmPasswordReset(uid: string, token: string, new_password: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ uid, token, new_password }),
    });
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      logToken('refresh: no refresh token in localStorage');
      return false;
    }
    logToken('refresh: calling /auth/refresh/');

    const base = this.baseUrl.replace(/\/*$/, '');
    const url = `${base}/auth/refresh/`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      const data = (await response.json()) as {
        access?: string;
        refresh?: string;
        data?: { access?: string; refresh?: string };
      };
      const access = data.access ?? data.data?.access;
      const newRefresh = data.refresh ?? data.data?.refresh;

      if (response.ok && access) {
        this.setAccessToken(access);
        if (newRefresh) this.setRefreshToken(newRefresh);
        logToken('refresh: success, new tokens saved');
        return true;
      }
      logToken('refresh: failed', `${response.status}`);
      if (response.status === 401 || response.status === 403) {
        this.setAccessToken(null);
        this.setRefreshToken(null);
        logToken('refresh: tokens cleared (invalid/expired)');
      }
    } catch (e) {
      logToken('refresh: error', String(e));
    }

    return false;
  }

  // Schema methods
  async getGlobalSchema(): Promise<GlobalSchema> {
    return this.request<GlobalSchema>('/schema/');
  }

  /**
   * Public site info for login/branding. No auth required.
   * GET /api/{path}/site/
   */
  async getSiteInfo(): Promise<SiteInfo> {
    const base = this.baseUrl.replace(/\/*$/, '');
    const url = `${base}/site/`;
    const response = await fetch(url, { method: 'GET', credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = (data && typeof data.error === 'string' ? data.error : null) || (data && typeof data.message === 'string' ? data.message : null) || 'Failed to load site info';
      throw new Error(msg);
    }
    return (data && typeof data === 'object' && 'name' in data ? data : data.data ?? data) as SiteInfo;
  }

  /** Global search across all models (char fields). Returns matching records. */
  async globalSearch(q: string): Promise<GlobalSearchResult> {
    const query = q.trim();
    if (!query) return { results: [] };
    return this.request<GlobalSearchResult>(`/search/?q=${encodeURIComponent(query)}`);
  }

  async getModelSchema(appLabel: string, modelName: string): Promise<ModelSchema> {
    return this.request<ModelSchema>(`/${appLabel}/${modelName}/schema/`);
  }

  // CRUD methods
  async list<T = Record<string, unknown>>(
    appLabel: string,
    modelName: string,
    params?: ListParams
  ): Promise<PaginatedResponse<T>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    const endpoint = `/${appLabel}/${modelName}/${query ? `?${query}` : ''}`;
    return this.request<PaginatedResponse<T>>(endpoint);
  }

  async get<T = Record<string, unknown>>(
    appLabel: string,
    modelName: string,
    id: string
  ): Promise<T> {
    return this.request<T>(`/${appLabel}/${modelName}/${id}/`);
  }

  async create<T = Record<string, unknown>>(
    appLabel: string,
    modelName: string,
    data: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>(`/${appLabel}/${modelName}/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update<T = Record<string, unknown>>(
    appLabel: string,
    modelName: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>(`/${appLabel}/${modelName}/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async partialUpdate<T = Record<string, unknown>>(
    appLabel: string,
    modelName: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>(`/${appLabel}/${modelName}/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(
    appLabel: string,
    modelName: string,
    id: string
  ): Promise<void> {
    await this.request(`/${appLabel}/${modelName}/${id}/`, {
      method: 'DELETE',
    });
  }

  async autocomplete(
    appLabel: string,
    modelName: string,
    search?: string
  ): Promise<{ results: Array<{ id: number; text: string }>; has_more: boolean }> {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('page_size', '20');
    const query = params.toString();
    return this.request(`/${appLabel}/${modelName}/autocomplete/${query ? `?${query}` : ''}`);
  }

  /**
   * Generic relation options for any model (e.g. auth.Group, auth.Permission).
   * Use when the model may not be registered and autocomplete returns 404.
   */
  async relationOptions(
    appLabel: string,
    modelName: string,
    search?: string,
    pageSize = 50
  ): Promise<{ results: Array<{ id: number; text: string }>; has_more: boolean }> {
    const params = new URLSearchParams();
    params.set('app_label', appLabel);
    params.set('model_name', modelName);
    if (search) params.set('q', search);
    params.set('page_size', String(pageSize));
    return this.request(`/relation-options/?${params.toString()}`);
  }

  /** Run a bulk action from admin.actions. POST .../actions/{actionName}/ with { ids }. */
  async runAction(
    appLabel: string,
    modelName: string,
    actionName: string,
    ids: (string | number)[]
  ): Promise<{ success: boolean; affected_count: number; message?: string }> {
    return this.request(
      `/${appLabel}/${modelName}/actions/${actionName}/`,
      {
        method: 'POST',
        body: JSON.stringify({ ids: ids.map(String) }),
      }
    );
  }

  /** Bulk update for list_editable. POST .../bulk-update/ with { updates: [...] }. */
  async bulkUpdate(
    appLabel: string,
    modelName: string,
    updates: Array<{ id: string | number; [field: string]: unknown }>
  ): Promise<{ success: boolean; updated_count: number; errors?: Array<{ id?: string; error: string }> }> {
    return this.request(
      `/${appLabel}/${modelName}/bulk-update/`,
      {
        method: 'POST',
        body: JSON.stringify({ updates }),
      }
    );
  }

  /** Get date hierarchy data for drill-down navigation. */
  async getDateHierarchy(
    appLabel: string,
    modelName: string,
    params?: { year?: number; month?: number }
  ): Promise<{
    field: string | null;
    level: 'year' | 'month' | 'day';
    year?: number;
    month?: number;
    dates: number[];
  }> {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.set('year', String(params.year));
    if (params?.month) searchParams.set('month', String(params.month));
    const query = searchParams.toString();
    return this.request(`/${appLabel}/${modelName}/date-hierarchy/${query ? `?${query}` : ''}`);
  }
}

// Singleton instance
export const api = new ApiClient();
