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
  date_joined?: string;
  last_login?: string;
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

// Layout types
export type LayoutId = 'basic' | 'glassmorphism' | 'aurora' | 'neumorphism' | 'minimal' | string;
export type ThemeMode = 'dark' | 'light' | 'system';

export interface LayoutConfig {
  current: LayoutId;
  allow_switch: boolean;
  options: LayoutId[];
}

export interface ThemeConfig {
  mode: ThemeMode;
  primary_color: string | null;
  accent_color: string | null;
}

// Schema types
export interface SiteInfo {
  name: string;
  version: string;
  api_base: string;
  /** Layout configuration from backend */
  layout?: LayoutConfig;
  /** Theme configuration from backend */
  theme?: ThemeConfig;
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

/**
 * Object tool (action button on detail page).
 * Defined via `djnext_object_tools` on the ModelAdmin.
 */
export interface ObjectToolSchema {
  /** Tool method name (used for API endpoint) */
  name: string;
  /** Button label (from short_description or titleized name) */
  label: string;
  /** Optional Lucide icon name (e.g., 'ExternalLink', 'Copy', 'Mail') */
  icon?: string;
  /** Button variant: 'primary', 'secondary', 'danger', 'ghost' */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Optional confirmation message (shows confirm dialog before executing) */
  confirm?: string;
}

/**
 * Custom view (get_urls equivalent).
 * Defined via `djnext_custom_views` on the ModelAdmin.
 */
export interface CustomViewSchema {
  /** View method name (used for API endpoint) */
  name: string;
  /** Description for documentation */
  description: string;
  /** True for detail-level (requires pk), False for list-level */
  detail: boolean;
  /** Allowed HTTP methods */
  methods: string[];
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

/**
 * Column metadata for list_display.
 * Backend can return either string[] (just names) or ListDisplayColumn[] (with metadata).
 */
export interface ListDisplayColumn {
  name: string;
  label: string;
  /** Whether this column can contain HTML (from format_html/mark_safe) */
  is_html?: boolean;
  /** Whether this is a computed/method field */
  is_method?: boolean;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Field to use for ordering if different from name */
  order_field?: string;
}

export interface ModelSchema {
  model: ModelInfo;
  fields: FieldSchema[];
  fieldsets: FieldsetSchema[] | null;
  /** Can be string[] (old format) or ListDisplayColumn[] (new format with metadata) */
  list_display: (string | ListDisplayColumn)[];
  /**
   * Fields that are clickable links to detail page.
   * - null/undefined: first column is clickable (default Django behavior)
   * - []: no columns are clickable
   * - ['field1', 'field2']: specific fields are clickable
   */
  list_display_links?: string[] | null;
  /**
   * Fields that can be edited inline in the list view.
   * Note: fields in list_editable cannot also be in list_display_links.
   */
  list_editable?: string[];
  /**
   * Date field for date-based drill-down navigation (year → month → day).
   */
  date_hierarchy?: string | null;
  list_filter: string[];
  search_fields: string[];
  ordering: string[];
  /** Bulk actions (list page checkboxes) */
  actions: ActionSchema[];
  /** Object tools (detail page action buttons) */
  object_tools?: ObjectToolSchema[];
  /** Custom views/API endpoints (get_urls equivalent) */
  custom_views?: CustomViewSchema[];
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
