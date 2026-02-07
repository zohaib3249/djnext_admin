// API Response wrapper
export interface ApiResponse<T> {
  status: string;
  status_message: string;
  data: T | null;
  error: {
    message: string;
    details?: Record<string, unknown>;
  } | null;
}

// Auth types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  message: string;
  tokens?: AuthTokens;
}

// Schema types
export interface SiteInfo {
  name: string;
  version: string;
  api_base: string;
  /** Global custom CSS URLs (from DJNEXT_ADMIN.CUSTOM_CSS). */
  custom_css?: string[];
  /** Global custom JS URLs (from DJNEXT_ADMIN.CUSTOM_JS). */
  custom_js?: string[];
}

export interface ModelPermissions {
  add: boolean;
  change: boolean;
  delete: boolean;
  view: boolean;
}

export interface ModelEndpoints {
  list: string;
  create: string;
  schema: string;
  detail?: string;
  update?: string;
  delete?: string;
  autocomplete?: string;
}

export interface ModelSummary {
  name: string;
  model_name: string;
  verbose_name: string;
  verbose_name_plural: string;
  endpoints: ModelEndpoints;
  permissions: ModelPermissions;
  list_display: string[];
  /** Optional icon name from admin (e.g. Lucide: Users). Else initials used. */
  icon?: string;
}

export interface AppSchema {
  app_label: string;
  verbose_name: string;
  models: ModelSummary[];
}

export interface NavItem {
  label: string;
  model_name: string;
  url: string;
  /** Optional icon name from admin (e.g. Lucide: Users, ShoppingCart). Else initials used. */
  icon?: string;
}

export interface NavGroup {
  label: string;
  app_label: string;
  items: NavItem[];
}

export interface GlobalSchema {
  site: SiteInfo;
  user: User | null;
  apps: AppSchema[];
  navigation: NavGroup[];
}

/** One record from global search (search across all tables). */
export interface GlobalSearchRecord {
  app_label: string;
  model_name: string;
  id: number;
  display: string;
  model_label: string;
}

export interface GlobalSearchResult {
  results: GlobalSearchRecord[];
}

// Field schema types
export interface FieldChoice {
  value: string | number;
  label: string;
}

export interface RelationInfo {
  model: string;
  app_label: string;
  model_name: string;
  verbose_name: string;
  type: 'foreign_key' | 'one_to_one' | 'many_to_many';
}

export interface FieldSchema {
  name: string;
  verbose_name: string;
  help_text: string | null;
  required: boolean;
  nullable: boolean;
  editable: boolean;
  primary_key: boolean;
  readonly?: boolean;
  type: string;
  format?: string;
  widget: string;
  max_length?: number;
  max_digits?: number;
  decimal_places?: number;
  minimum?: number;
  default?: unknown;
  has_default?: boolean;
  choices?: FieldChoice[];
  relation?: RelationInfo;
}

export interface FieldsetSchema {
  name: string | null;
  title: string;
  fields: (string | string[])[];
  classes: string[];
  description?: string;
}

export interface InlineSchema {
  model: string;
  app_label: string;
  model_name: string;
  verbose_name: string;
  verbose_name_plural: string;
  fk_name: string | null;
  extra: number;
  min_num: number;
  max_num: number | null;
}

export interface ActionSchema {
  name: string;
  description: string;
}

export interface ModelInfo {
  name: string;
  app_label: string;
  model_name: string;
  verbose_name: string;
  verbose_name_plural: string;
  db_table: string;
  pk_field: string;
}

export interface ModelSchema {
  model: ModelInfo;
  fields: FieldSchema[];
  fieldsets: FieldsetSchema[] | null;
  list_display: string[];
  list_filter: string[];
  search_fields: string[];
  ordering: string[];
  actions: ActionSchema[];
  inlines: InlineSchema[];
  permissions: ModelPermissions;
  endpoints: ModelEndpoints;
  /** Per-model custom CSS URLs (from ModelAdmin.djnext_media['css']). */
  custom_css?: string[];
  /** Per-model custom JS URLs (from ModelAdmin.djnext_media['js']). */
  custom_js?: string[];
}

// List/Pagination types
export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: string | number | undefined;
}
