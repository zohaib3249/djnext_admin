import type {
  ApiResponse,
  GlobalSchema,
  GlobalSearchResult,
  ModelSchema,
  PaginatedResponse,
  LoginResponse,
  User,
  ListParams,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PATH = process.env.NEXT_PUBLIC_API_PATH || '/api/djnext';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseUrl = `${API_URL}${API_PATH}`;
    // Load token from localStorage on init (client-side only)
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('djnext_access_token');
    }
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

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

    const body = await response.json();

    // Backend may return raw payload or wrapped { data, error }
    const hasWrapper = body && typeof body === 'object' && 'data' in body;
    const hasError = body && typeof body === 'object' && 'error' in body;

    if (!response.ok) {
      const message = hasError && typeof body.error === 'object'
        ? (body.error as { message?: string }).message
        : typeof body.error === 'string'
          ? body.error
          : 'Request failed';
      if (response.status === 401 && this.getRefreshToken()) {
        const refreshed = await this.refreshToken();
        if (refreshed) return this.request<T>(endpoint, options);
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

    if (data.tokens) {
      this.setAccessToken(data.tokens.access);
      this.setRefreshToken(data.tokens.refresh);
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
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      const data = (await response.json()) as { access?: string; data?: { access?: string } };
      // Backend returns { access: "..." }; support wrapped { data: { access } } too
      const access = data.access ?? data.data?.access;

      if (access) {
        this.setAccessToken(access);
        return true;
      }
    } catch {
      // Token refresh failed
    }

    this.setAccessToken(null);
    this.setRefreshToken(null);
    return false;
  }

  // Schema methods
  async getGlobalSchema(): Promise<GlobalSchema> {
    return this.request<GlobalSchema>('/schema/');
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
}

// Singleton instance
export const api = new ApiClient();
