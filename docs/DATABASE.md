# Database Documentation

Supabase migrations are the database source of truth. All production changes must be represented in `supabase/migrations`.

## Core Tables

### `profiles`

Purpose: Telegram identity records.

Relationships:

- Referenced by `user_roles.user_id`
- Referenced by `events.created_by`, `gifts.created_by`, `attachments.uploaded_by`, audit/activity logs

Indexes:

- username lookup
- disabled profile lookup
- admin search
- created and last-seen ordering

RLS:

- Users can read their own profile.
- Viewers can read active profiles.
- Super Admins can read all profiles.

Notes:

- `deleted_at` disables a user.
- Effective role checks require `profiles.deleted_at is null`.

### `roles`

Purpose: Role catalog. Current roles are `viewer` and `super_admin`.

RLS:

- Viewers can read roles.
- Super Admins manage roles.
- Hard delete is denied.

### `user_roles`

Purpose: Role grants and revocations.

Relationships:

- `user_id -> profiles.id`
- `role_id -> roles.id`
- `granted_by -> profiles.id`

Indexes:

- active role by user
- granted-by lookup

RLS:

- Users can read own grants.
- Super Admins can read and manage all grants.
- Hard delete is denied.

### `currencies`

Purpose: Currency reference data.

RLS:

- Viewers read active currencies.
- Super Admins read and manage all.

Important rule: analytics and reports never mix currencies.

### `gift_types`

Purpose: Gift category and validation metadata.

Important columns:

- `requires_amount`
- `requires_currency`
- `requires_weight`
- `category`

RLS:

- Viewers read active gift types.
- Super Admins manage gift types.

### `events`

Purpose: Wedding events.

Relationships:

- `created_by`, `updated_by -> profiles.id`
- Referenced by `gifts.event_id` and `attachments.event_id`

Indexes:

- status/year live list
- creator
- deleted records
- full-text search vector
- trigram title/bride/groom search
- production live year/date indexes

Triggers:

- `set_updated_at`
- `audit_row_change`

RLS:

- Viewers read active, non-deleted events.
- Super Admins read/manage all.
- Hard delete is denied.

Constraints:

- year range 1900-2100
- `event_date` year must match `event_year`
- text length guards

### `gifts`

Purpose: Permanent gift ledger lines.

Relationships:

- `event_id -> events.id`
- `gift_type_id -> gift_types.id`
- `currency_id -> currencies.id`
- `created_by`, `updated_by -> profiles.id`

Indexes:

- event live list
- gift type
- currency
- gift date
- giver trigram
- search vector
- analytics composite indexes
- amount and text production hardening indexes

Triggers:

- `set_updated_at`
- `audit_row_change`
- `validate_gift_fields`

RLS:

- Viewers read non-deleted gifts belonging to active non-deleted events.
- Super Admins read/manage all.
- Hard delete is denied.

Constraints:

- amount and weight cannot be negative
- amount and currency must appear together
- text length guards

### `attachments`

Purpose: File metadata linked to events or gifts.

Relationships:

- `event_id -> events.id`
- `gift_id -> gifts.id`
- `uploaded_by -> profiles.id`

Indexes:

- event
- gift
- uploaded_by
- deleted records
- admin created ordering

RLS:

- Viewers read active attachments.
- Super Admins read/manage all.
- Hard delete is denied.

### `audit_logs`

Purpose: Immutable audit history for important data changes.

Indexes:

- table/record timeline
- actor
- created date
- action
- related event/gift
- changed fields GIN
- severity and Telegram ID

RLS:

- Super Admin read only.
- Direct insert/update/delete is denied.

Triggers:

- `prevent_audit_log_mutation`

### `activity_logs`

Purpose: User activity telemetry such as search, views, login, logout.

RLS:

- Users read own activity.
- Super Admins read all.
- Users can log own activity.
- Super Admins may prune.

### `settings`

Purpose: Runtime application settings.

RLS:

- Viewers read settings.
- Super Admins insert/update.

### `system_logs`

Purpose: operational and security events.

RLS:

- Super Admin read.

### `admin_notifications`

Purpose: Super Admin notifications generated from critical audit events.

RLS:

- Super Admin read/update.

## Views

- `event_cash_totals` - cash totals per event and currency.
- `event_gift_type_totals` - gift type totals per event.
- `dashboard_stats` - high-level dashboard summary.
- `recent_activity` - audit logs joined to actor display fields.
- `event_summaries` - event list read model.

All public views must use `security_invoker` so RLS is evaluated as the caller.

## Important Functions

Authentication and permissions:

- `has_role`
- `is_super_admin`
- `is_viewer_or_above`
- `my_permissions`
- `upsert_telegram_profile`

Mutation RPCs:

- `create_event`
- `update_event`
- `set_event_status`
- `soft_delete_event`
- `restore_event`
- `create_gift`
- `update_gift`
- `soft_delete_gift`
- `restore_gift`

Admin RPCs:

- `admin_set_user_disabled`
- `admin_set_user_role`
- `admin_update_setting`
- `admin_set_attachment_deleted`

Analytics RPCs:

- `dashboard_totals`
- `event_statistics`
- `global_averages`
- `gifts_by_month`
- `gifts_by_year`
- `events_by_year`
- `gift_type_distribution`
- `cash_distribution`
- `contributors_growth`
- `top_contributors`
- `search_analytics`
- `audit_statistics`

Audit recovery:

- `restore_event_version`
- `restore_gift_version`

## Storage

Buckets:

- `avatars`
- `covers`
- `attachments`
- `future-gallery`

All buckets are private. `future-gallery` intentionally has no policies until the feature is designed.

## Testing

Run:

```bash
npm run db:test
```

The suite applies every migration to disposable Postgres and validates RLS, soft delete, audit immutability, disabled users, storage buckets, views, and core constraints.
