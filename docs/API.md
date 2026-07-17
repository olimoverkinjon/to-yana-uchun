# API Documentation

All API routes live under `src/app/api`.

## Common Error Shape

```json
{ "error": "error_code" }
```

Common codes:

- `unauthenticated`
- `forbidden`
- `invalid_request`
- `rate_limited`
- `internal_error`

## Authentication

### `POST /api/auth/telegram`

Purpose: Verify Telegram Mini App `initData`, upsert profile, create session.

Authentication: none before request; Telegram `initData` is verified server-side.

Rate limit: 20 requests per 5 minutes per IP.

Body:

```json
{ "initData": "query-string-from-telegram" }
```

Success:

```json
{ "ok": true, "user": { "id": 123, "firstName": "Ali" } }
```

Errors:

- `400 invalid_request`
- `401 verification_failed`
- `429 rate_limited`
- `500 internal_error`

Headers:

- `Cache-Control: no-store`

### `GET /api/auth/session`

Purpose: Return current session and permissions.

Authentication: optional cookie session.

Success:

```json
{ "user": null, "permissions": null }
```

or:

```json
{
  "user": { "profileId": "uuid", "telegramId": 123, "firstName": "Ali" },
  "permissions": { "isSuperAdmin": true, "hasAccess": true, "roles": ["super_admin"] }
}
```

Headers:

- `Cache-Control: no-store`

### `GET /api/auth/supabase-token`

Purpose: Mint a short-lived Supabase JWT for browser queries and Realtime.

Authentication: required session cookie.

Rate limit: 120 requests per minute per IP.

Success:

```json
{ "accessToken": "jwt", "expiresIn": 300 }
```

Errors:

- `401 no_session`
- `429 rate_limited`

Headers:

- `Cache-Control: no-store`

### `POST /api/auth/logout`

Purpose: Log activity and destroy session.

Authentication: optional session cookie.

Rate limit: 60 requests per minute per IP.

Success:

```json
{ "ok": true }
```

Headers:

- `Cache-Control: no-store`

## Reports

### `GET /api/reports`

Purpose: Export report as CSV, XLSX, or PDF.

Authentication: required.

Permissions: Super Admin only.

Rate limit: 10 requests per minute per IP.

Query parameters:

- `type`: `event`, `yearly`, `contributor`, `cash`, `gift_type`
- `format`: `csv`, `xlsx`, `pdf`
- `year`: optional integer
- `eventId`: optional UUID
- `giftTypeId`: optional UUID
- `currencyId`: optional UUID
- `from`: optional `YYYY-MM-DD`
- `to`: optional `YYYY-MM-DD`

Success: file response with `Content-Disposition: attachment`.

Errors:

- `400 invalid_request`
- `401 unauthenticated`
- `403 forbidden`
- `429 rate_limited`
- `500 internal_error`

Example:

```text
/api/reports?type=cash&format=xlsx&year=2026
```

## Audit

### `GET /api/audit/export`

Purpose: Export audit log history as CSV, XLSX, or PDF.

Authentication: required.

Permissions: Super Admin only.

Rate limit: 10 requests per minute per IP.

Query parameters:

- `format`: `csv`, `xlsx`, `pdf`
- `search`
- `action`
- `table`
- `severity`
- `from`
- `to`

Success: file response with `Content-Disposition: attachment`.

Errors:

- `400 invalid_request`
- `401 unauthenticated`
- `403 forbidden`
- `429 rate_limited`

### `GET /api/backups/audit`

Purpose: Download JSON backup containing audit logs, settings, and system logs.

Authentication: required.

Permissions: Super Admin only.

Rate limit: 5 requests per minute per IP.

Success:

```json
{
  "generatedAt": "2026-07-17T00:00:00.000Z",
  "kind": "audit-settings-system-backup",
  "auditLogs": [],
  "settings": [],
  "systemLogs": []
}
```

Errors:

- `401 unauthenticated`
- `403 forbidden`
- `429 rate_limited`
- `500 settings_backup_failed`
- `500 system_logs_backup_failed`

## Server Actions

Most mutations are Server Actions rather than public REST endpoints.

Important actions:

- Events: create, update, status, soft delete, restore.
- Gifts: create, update, soft delete, restore.
- Admin: disable user, set role, update setting, delete/restore attachment.
- Audit: restore historical event/gift version.

All important actions validate input with Zod, require Super Admin where appropriate, and rely on RLS/RPCs as final enforcement.
