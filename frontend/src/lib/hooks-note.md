# Backend hooks (pre_save, post_save, pre_delete, post_delete)

When the frontend calls **create**, **update**, or **delete** via the API, the Django backend runs the same lifecycle as Django admin:

- **Create**: `perform_create` → `serializer.save()` → backend may call `model_admin.save_model(request, instance, None, change=False)`. Django signals and any registered hooks (e.g. `@post_create`) run as configured on the backend.
- **Update**: `perform_update` → `serializer.save()` → `model_admin.save_model(..., change=True)` and hooks.
- **Delete**: `perform_destroy` → `model_admin.delete_model(request, instance)` if defined, else `instance.delete()`, and hooks.

So **you do not trigger hooks from the frontend** — they run automatically on the server when you create/update/delete. To add custom logic (e.g. send email after create, validate before delete), register hooks or override `save_model` / `delete_model` in your Django ModelAdmin or use the hook decorators (`@post_create`, `@pre_delete`, etc.) in the backend.

---

## Inline tables

The detail page shows **inline** related models (e.g. OrderItems for an Order). For the list API to return only rows belonging to the parent, the **Django ModelAdmin for the inline model** should include the foreign key in `list_filter`, e.g.:

```python
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    fk_name = 'order'

class OrderItemAdmin(admin.ModelAdmin):
    list_filter = ['order']  # so the frontend can filter by ?order=123
```

---

## Dual support: Django admin + djnext_admin (wrappers)

The goal is **both** to be supported with **one** registration and shared behavior (including hooks):

- **Option A – User uses Django admin** (classic UI at `/admin/`).
- **Option B – User uses djnext_admin** (API + modern frontend).

So we **wrap** Django admin and add djnext support on top, instead of replacing it. That way:

1. **First: wrappers of admin** – Provide a base (e.g. `AdminWrapper` or a mixin) that:
   - Subclasses or composes Django’s `ModelAdmin`.
   - Registers the model with **both** `admin.site` (Django admin) **and** `djnext_admin` (API + frontend).
2. **Then: use those in Django** – In the project, user defines **one** admin class (the wrapper) with `list_display`, `save_model`, `list_filter`, hooks, etc. That single definition drives:
   - Classic Django admin UI (same `save_model`, `delete_model`, etc.).
   - djnext_admin API and frontend (same hooks and behavior).

So **hooks** (e.g. `save_model`, `delete_model`, `@post_create`, `@pre_delete`) are defined once on the wrapper and run whether the user edits in Django admin or in the djnext frontend. That gives maximum flexibility: use either UI, same logic and hooks everywhere.

---

## Fieldsets, sections, custom fields, actions

### Fieldsets (admin-side)

Defined on your ModelAdmin as usual:

```python
class MyModelAdmin(DJNextModelAdmin):
    fieldsets = (
        (None, {'fields': ('name', 'email')}),
        ('Extra', {'fields': (('phone', 'website'), 'notes'), 'description': 'Optional info.'}),
    )
```

- **Create/Edit form**: Rendered as sections with title and optional description. Nested tuples in `fields` (e.g. `('phone', 'website')`) are shown on the same row.
- **Detail view (read-only)**: When `fieldsets` is set, the detail page shows one card per section (title, description, then field list). Without fieldsets, a single "Details" card is used.
- Backend normalizes `fields` to a list of strings or list-of-strings (for same-row layout) and sends them in the schema.

### Multiple sections

Use multiple entries in `fieldsets`; each becomes one section in the form and one card on the detail page.

### Custom fields (readonly / admin methods)

- **list_display** can include method names (e.g. `deleted_status`). The list API and schema expose these when the serializer includes them (list serializer today uses model fields only; adding SerializerMethodField for admin methods would extend this).
- **readonly_fields** and **fieldsets** can include admin method names; they appear in the schema as field names. For the **detail** view, values are shown if the retrieve API returns them (extend the retrieve serializer to add method-backed fields if needed).
- **Form**: Only editable model fields are rendered; readonly/custom fields are not inputs.

### Custom actions (bulk actions)

- Define on ModelAdmin: `actions = [make_published, make_unpublished]` (same as Django admin).
- Backend exposes `POST /{app}/{model}/actions/{action_name}/` with body `{ "ids": ["1","2",...] }`. Requires `ENABLE_BULK_ACTIONS` in settings (default True).
- **Frontend**: On the list page, when the schema has `actions`, an "Action" dropdown and row checkboxes appear. Select rows, choose an action, click "Run on N selected" to call the API. Results refetch after success.

---

## Custom CSS, custom JS, and one base CSS

### One base CSS (user customization)

Add your own styles without touching the built app:

- In the **frontend**, create or edit **`public/djnext-custom.css`**. This file is loaded on every page after the default theme. Override classes, spacing, colors, etc. Example:

  ```css
  /* public/djnext-custom.css */
  main { max-width: 1600px; }
  [data-theme="dark"] .card { border-color: #333; }
  ```

- The app already includes `<link rel="stylesheet" href="/djnext-custom.css" />` in the root layout. If the file is missing, the request 404s and the app still works.

### Global custom CSS/JS (like Django admin Media)

Load extra CSS and JS on every page from your Django settings:

```python
# settings.py
DJNEXT_ADMIN = {
    'CUSTOM_CSS': [
        'https://example.com/admin-extra.css',
        '/static/admin/custom.css',  # relative to your domain
    ],
    'CUSTOM_JS': [
        'https://example.com/admin-extra.js',
    ],
}
```

- URLs are sent in the global schema (`site.custom_css`, `site.custom_js`) and injected into the page by the frontend. Use absolute URLs or paths your app serves (e.g. Django `static()`).

### Per-model custom CSS/JS (djnext_media)

On the admin wrapper, set `djnext_media` like Django’s `ModelAdmin.Media`:

```python
class ProductAdmin(DJNextModelAdmin):
    djnext_media = {
        'css': ['/static/products-admin.css'],
        'js': ['/static/products-admin.js'],
    }
```

- These are loaded only when the user is on that model’s list, detail, or create page. They are removed when navigating away. Use this for model-specific widgets or styles.