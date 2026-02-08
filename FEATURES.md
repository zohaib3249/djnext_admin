# DJNext Admin - Feature Comparison with Django Admin

## Feature Status Legend
- ✅ Supported
- 🔶 Partial Support
- ❌ Not Yet Implemented
- 🎯 Planned

---

## 1. List View (Changelist)

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| `list_display` | ✅ | ✅ | Fields shown in table |
| `list_display_links` | ✅ | ✅ | Configurable clickable columns |
| `list_filter` | ✅ | ✅ | Sidebar filters |
| `list_editable` | ✅ | ✅ | Inline editing in list |
| `list_per_page` | ✅ | ✅ | Pagination |
| `list_max_show_all` | ✅ | ❌ | Show all button |
| `search_fields` | ✅ | ✅ | Search box |
| `ordering` | ✅ | ✅ | Default sort |
| `date_hierarchy` | ✅ | ✅ | Date-based drill-down |
| `show_full_result_count` | ✅ | ✅ | Total count |
| `sortable_by` | ✅ | ✅ | Sortable columns |
| `empty_value_display` | ✅ | 🔶 | Shows "-" |
| `actions_on_top/bottom` | ✅ | 🔶 | Actions at top only |
| `list_select_related` | ✅ | ✅ | Backend optimization |

## 2. Actions (Bulk Operations)

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| Built-in delete action | ✅ | ✅ | Bulk delete |
| Custom actions | ✅ | 🔶 | Via `djnext_actions` |
| Action descriptions | ✅ | ✅ | `short_description` |
| Action permissions | ✅ | ✅ | `allowed_permissions` |
| Intermediate pages | ✅ | ❌ | Confirmation forms |
| Action return messages | ✅ | ✅ | Success/error toast |

## 3. Custom Display Methods

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| Custom methods in list_display | ✅ | ✅ | Callable fields |
| `@admin.display` decorator | ✅ | 🔶 | Via introspection |
| `format_html` / `mark_safe` | ✅ | ✅ | HTML in list columns |
| Boolean icons | ✅ | ✅ | Auto-detected |
| `short_description` | ✅ | ✅ | Column headers |
| `admin_order_field` | ✅ | 🔶 | Ordering hints |
| Custom links/URLs | ✅ | ✅ | Via `format_html` + `list_display_links` |

## 4. Detail/Edit View

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| Auto-generated forms | ✅ | ✅ | From model fields |
| `fields` | ✅ | ✅ | Field ordering |
| `fieldsets` | ✅ | ✅ | Grouped fields |
| `readonly_fields` | ✅ | ✅ | Non-editable |
| `exclude` | ✅ | ✅ | Hidden fields |
| `prepopulated_fields` | ✅ | ❌ | Auto-fill (slugify) |
| Custom form | ✅ | ❌ | Django ModelForm |
| Custom widgets | ✅ | 🔶 | Limited widgets |
| `save_on_top` | ✅ | ❌ | Save buttons position |

## 5. Field Types & Widgets

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| Text/Char fields | ✅ | ✅ | Input |
| TextField | ✅ | ✅ | Textarea |
| Integer/Decimal | ✅ | ✅ | Number input |
| Boolean | ✅ | ✅ | Checkbox/Toggle |
| DateTime | ✅ | ✅ | Date/time picker |
| ForeignKey | ✅ | ✅ | Select/Autocomplete |
| ManyToMany | ✅ | ✅ | Multi-select |
| `filter_horizontal` | ✅ | ❌ | Dual-list selector |
| `filter_vertical` | ✅ | ❌ | Dual-list selector |
| `raw_id_fields` | ✅ | ❌ | ID input + lookup |
| `autocomplete_fields` | ✅ | ✅ | Async search |
| `radio_fields` | ✅ | ❌ | Radio buttons |
| File/Image upload | ✅ | ✅ | File picker |
| JSON field | ✅ | ✅ | JSON editor |
| Rich text (third-party) | 🔶 | ❌ | TinyMCE/CKEditor |

## 6. Inline Models

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| `TabularInline` | ✅ | ✅ | Table layout |
| `StackedInline` | ✅ | ✅ | Stacked layout |
| `extra` | ✅ | ✅ | Empty forms |
| `max_num` / `min_num` | ✅ | ✅ | Limits |
| `can_delete` | ✅ | ✅ | Delete checkbox |
| Nested inlines | ❌ | ❌ | Not supported |
| `show_change_link` | ✅ | ❌ | Link to inline |

## 7. Permissions

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| `has_view_permission` | ✅ | ✅ | View access |
| `has_add_permission` | ✅ | ✅ | Create access |
| `has_change_permission` | ✅ | ✅ | Edit access |
| `has_delete_permission` | ✅ | ✅ | Delete access |
| `has_module_permission` | ✅ | ✅ | App-level |
| Object-level permissions | ✅ | 🔶 | Via custom code |

## 8. Custom URLs & Views

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| `get_urls()` | ✅ | ✅ | Via `djnext_custom_views` |
| Custom admin views | ✅ | ✅ | Via `djnext_custom_views` |
| Change view customization | ✅ | ❌ | Custom detail page |
| History view | ✅ | ❌ | Audit log |
| Object tools | ✅ | ✅ | Via `djnext_object_tools` |

## 9. Site Customization

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| `site_header` | ✅ | ✅ | Via DJNEXT_ADMIN |
| `site_title` | ✅ | ✅ | Browser title |
| `index_title` | ✅ | ❌ | Dashboard title |
| Custom CSS | ✅ | ✅ | CUSTOM_CSS setting |
| Custom JS | ✅ | ✅ | CUSTOM_JS setting |
| Per-model CSS/JS | ✅ | ✅ | `djnext_media` |
| Multiple admin sites | ✅ | ❌ | Single site only |

## 10. UI/UX Features

| Feature | Django Admin | DJNext | Notes |
|---------|-------------|--------|-------|
| Dark mode | ❌ | ✅ | Built-in |
| Multiple layouts | ❌ | ✅ | 5 layout themes |
| Responsive design | 🔶 | ✅ | Mobile-friendly |
| Collapsible sidebar | ❌ | ✅ | Built-in |
| Keyboard shortcuts | ❌ | ❌ | Planned |
| Real-time updates | ❌ | ❌ | WebSocket |

---

## Missing Features (Priority)

### High Priority 🔴
1. ~~**`format_html` / `mark_safe`**~~ ✅ - Render HTML in list/detail views
2. ~~**Custom URLs/Views**~~ ✅ - `get_urls()` equivalent (via `djnext_custom_views`)
3. ~~**Object Tools**~~ ✅ - Action buttons on detail page (via `djnext_object_tools`)
4. ~~**Custom Links**~~ ✅ - Via `list_display_links` + `format_html` for custom URLs

### Medium Priority 🟡
5. ~~**`list_editable`**~~ ✅ - Inline editing in list view
6. ~~**`date_hierarchy`**~~ ✅ - Date-based navigation
7. **`prepopulated_fields`** - Auto-fill from other fields
8. **History/Audit log** - Change tracking
9. **`filter_horizontal/vertical`** - Better M2M widget

### Low Priority 🟢
10. **Rich text editor** - WYSIWYG support
11. **`radio_fields`** - Radio button choices
12. **Multiple admin sites** - Separate admin instances
13. **Intermediate action pages** - Custom forms for actions

---

## Theme Customization

### Option 1: CSS Variables Override (Recommended)

Create a file in your Django static folder and reference it:

```python
# settings.py
DJNEXT_ADMIN = {
    'CUSTOM_CSS': ['/static/admin/custom.css'],
}
```

```css
/* static/admin/custom.css */

/* Override for all themes */
:root {
    --primary: #your-brand-color;
    --primary-hover: #your-brand-hover;
    --primary-foreground: #ffffff;
    --accent: #your-accent-color;
}

/* Override for dark mode only */
.dark {
    --background: #1a1a1a;
    --foreground: #ffffff;
    --primary: #your-dark-primary;
}

/* Override for specific layout */
.layout-glassmorphism {
    --blur: 20px;
    --card: rgba(255, 255, 255, 0.1);
}
```

### Option 2: Full Theme Override

```css
/* Complete theme replacement */
:root,
:root.layout-basic,
.layout-basic {
    /* Colors */
    --background: #f5f5f5;
    --background-secondary: #eeeeee;
    --foreground: #212121;
    --foreground-muted: #757575;

    /* Brand */
    --primary: #1976d2;
    --primary-hover: #1565c0;
    --primary-foreground: #ffffff;
    --accent: #ff9800;

    /* Status */
    --success: #4caf50;
    --warning: #ff9800;
    --destructive: #f44336;
    --destructive-foreground: #ffffff;

    /* UI Elements */
    --border: #e0e0e0;
    --card: #ffffff;
    --input: #ffffff;
    --input-border: #bdbdbd;

    /* Shape */
    --radius: 8px;
    --radius-lg: 12px;
}

.dark {
    --background: #121212;
    --background-secondary: #1e1e1e;
    --foreground: #ffffff;
    --foreground-muted: #b0b0b0;
    --primary: #90caf9;
    --border: #333333;
    --card: #1e1e1e;
}
```

### Option 3: Component-Level Customization

```css
/* Override specific components */

/* Custom sidebar */
aside {
    background: linear-gradient(180deg, var(--primary) 0%, var(--accent) 100%) !important;
}

/* Custom buttons */
button[class*="bg-primary"] {
    border-radius: 9999px !important; /* Pill shape */
    text-transform: uppercase;
}

/* Custom table headers */
th {
    background: var(--primary) !important;
    color: var(--primary-foreground) !important;
}

/* Custom cards */
.rounded-lg {
    box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important;
}
```

---

## CSS Variables Reference

| Variable | Description | Default (Basic) |
|----------|-------------|-----------------|
| `--background` | Page background | #ffffff / #000000 |
| `--background-secondary` | Sidebar, cards | #f4f4f5 / #0a0a0a |
| `--foreground` | Main text | #18181b / #fafafa |
| `--foreground-muted` | Secondary text | #71717a / #a1a1aa |
| `--primary` | Brand color | #6366f1 |
| `--primary-hover` | Brand hover | #818cf8 |
| `--primary-foreground` | Text on primary | #ffffff |
| `--accent` | Accent color | #22d3ee |
| `--success` | Success state | #22c55e |
| `--warning` | Warning state | #f59e0b |
| `--destructive` | Error/delete | #ef4444 |
| `--destructive-foreground` | Text on destructive | #ffffff |
| `--border` | Border color | #e4e4e7 / #27272a |
| `--card` | Card background | #fafafa / #0a0a0a |
| `--input` | Input background | #ffffff / #141414 |
| `--input-border` | Input border | #e4e4e7 / #27272a |
| `--radius` | Border radius | 0.5rem |
| `--radius-lg` | Large radius | 0.75rem |
| `--blur` | Backdrop blur | 0 (layouts vary) |
| `--shadow` | Box shadow | varies |

---

## Implementation Roadmap

### Phase 1: HTML & Custom Content
- [x] Support `format_html` / `mark_safe` in list columns
- [ ] Support custom HTML in readonly fields
- [ ] Custom cell renderers for specific field types

### Phase 2: Custom URLs & Actions
- [x] `get_urls()` equivalent for custom endpoints - via `djnext_custom_views`
- [x] Object tools (buttons on detail page) - via `djnext_object_tools`
- [ ] Custom action intermediate pages

### Phase 3: Advanced Widgets
- [ ] `filter_horizontal` / `filter_vertical`
- [ ] `prepopulated_fields`
- [ ] Rich text editor integration

### Phase 4: Extended Features
- [ ] History/audit log view
- [x] `date_hierarchy` - date-based drill-down navigation
- [x] `list_editable` - inline editing in list view

---

## Implementation Details

### format_html / mark_safe Support (Completed)

**Backend Changes** (`djnext_admin/`):
- `serializers/fields.py`: Added `is_html_safe()` and `wrap_html_value()` utilities
- `serializers/factory.py`: Added `_get_method_fields()` to handle callable list_display methods
- `core/introspection.py`: Updated `_get_list_display()` to return metadata (is_html, is_method, sortable)

**Frontend Changes** (`djnext_admin/frontend/src/`):
- `types/index.ts`: Added `ListDisplayColumn` interface with `is_html` metadata
- `components/list/DataTable.tsx`: Updated `Cell` component to render HTML values safely

**How it works**:
1. Backend detects `SafeString` values (from `format_html`/`mark_safe`)
2. Wraps them as `{_html: true, content: "<html>..."}`
3. Frontend renders with `dangerouslySetInnerHTML`

**Usage Example**:
```python
from django.utils.html import format_html
from djnext_admin import DJNextModelAdmin

class ProductAdmin(DJNextModelAdmin):
    list_display = ['name', 'status_badge', 'price']

    def status_badge(self, obj):
        color = {'active': 'green', 'inactive': 'red'}.get(obj.status, 'gray')
        return format_html(
            '<span style="background:{}; color:white; padding:2px 8px; border-radius:4px">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.allow_html = True  # Mark for frontend metadata
```

---

### Object Tools Support (Completed)

**Backend Changes** (`djnext_admin/`):
- `core/introspection.py`: Added `_get_object_tools()` to return tool metadata
- `views/factory.py`: Added detail-level action endpoints via `@action(detail=True)`
- `admin.py`: Documented `djnext_object_tools` attribute

**Frontend Changes** (`djnext_admin/frontend/src/`):
- `types/index.ts`: Added `ObjectToolSchema` interface
- `components/detail/ObjectTools.tsx`: New component for rendering tool buttons
- `app/[app]/[model]/[id]/page.tsx`: Integrated ObjectTools component

**How it works**:
1. Admin defines `djnext_object_tools = ['method_name1', 'method_name2']`
2. Each method receives `(self, request, obj)` and returns a dict or Response
3. Frontend renders buttons and calls `/api/admin/{app}/{model}/{id}/tools/{tool_name}/`

**Usage Example**:
```python
from djnext_admin import DJNextModelAdmin

class OrderAdmin(DJNextModelAdmin):
    list_display = ['id', 'customer', 'total', 'status']
    djnext_object_tools = ['mark_shipped', 'send_invoice', 'clone_order']

    def mark_shipped(self, request, obj):
        obj.status = 'shipped'
        obj.save()
        return {'success': True, 'message': f'Order #{obj.pk} marked as shipped'}
    mark_shipped.short_description = 'Mark as Shipped'
    mark_shipped.icon = 'Truck'
    mark_shipped.variant = 'primary'

    def send_invoice(self, request, obj):
        # Send email logic here
        obj.send_invoice_email()
        return {'success': True, 'message': 'Invoice sent to customer'}
    send_invoice.short_description = 'Send Invoice'
    send_invoice.icon = 'Mail'
    send_invoice.confirm = 'Send invoice email to customer?'

    def clone_order(self, request, obj):
        new_order = obj.clone()
        return {'success': True, 'message': f'Cloned as Order #{new_order.pk}'}
    clone_order.short_description = 'Clone Order'
    clone_order.icon = 'Copy'
    clone_order.variant = 'secondary'
```

---

### Custom Views Support (Completed)

**Backend Changes** (`djnext_admin/`):
- `core/introspection.py`: Added `_get_custom_views()` to return view metadata
- `views/factory.py`: Added `_create_custom_view_endpoint()` for list/detail level views
- `admin.py`: Documented `djnext_custom_views` attribute

**Frontend Changes** (`djnext_admin/frontend/src/`):
- `types/index.ts`: Added `CustomViewSchema` interface

**How it works**:
1. Admin defines `djnext_custom_views = ['view_name1', 'view_name2']`
2. List-level views receive `(self, request)` and are accessible at `/api/admin/{app}/{model}/views/{view_name}/`
3. Detail-level views receive `(self, request, pk)` with `.detail = True` at `/api/admin/{app}/{model}/{pk}/views/{view_name}/`

**Usage Example**:
```python
from djnext_admin import DJNextModelAdmin
from rest_framework.response import Response

class ProductAdmin(DJNextModelAdmin):
    list_display = ['name', 'price', 'stock']
    djnext_custom_views = ['export_csv', 'statistics', 'preview']

    def export_csv(self, request):
        """Export all products as CSV."""
        import csv
        from django.http import HttpResponse
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="products.csv"'
        writer = csv.writer(response)
        writer.writerow(['Name', 'Price', 'Stock'])
        for product in self.model.objects.all():
            writer.writerow([product.name, product.price, product.stock])
        return Response({'url': '/media/exports/products.csv'})
    export_csv.methods = ['GET']
    export_csv.short_description = 'Export as CSV'

    def statistics(self, request):
        """Return aggregate statistics for dashboard."""
        from django.db.models import Avg, Sum, Count
        stats = self.model.objects.aggregate(
            total=Count('id'),
            avg_price=Avg('price'),
            total_stock=Sum('stock'),
        )
        return stats
    statistics.methods = ['GET']
    statistics.short_description = 'Get Statistics'

    def preview(self, request, pk):
        """Preview a single product (detail-level)."""
        product = self.model.objects.get(pk=pk)
        return {
            'name': product.name,
            'preview_html': f'<h1>{product.name}</h1><p>${product.price}</p>',
        }
    preview.detail = True
    preview.methods = ['GET']
    preview.short_description = 'Preview Product'
```
