# Architecture

## High-Level Architecture

```text
Telegram WebView
  -> Next.js App Router
  -> Server Components / Client Components
  -> Server Actions and Route Handlers
  -> Supabase Postgres with RLS
  -> Supabase Realtime and private Storage
```

The app uses feature modules under `src/features`. Database migrations are the source of truth for data, permissions, audit, and analytics.

## Frontend Flow

1. Telegram opens the Mini App.
2. `TelegramProvider` initializes SDK signals.
3. `AuthGate` retrieves raw Telegram `initData`.
4. `/api/auth/telegram` verifies identity and creates a signed first-party session.
5. App routes render through Server Components.
6. Client components use TanStack Query for realtime-friendly data and optimistic UI.

## Backend Flow

- Route handlers live under `src/app/api`.
- Mutations use Server Actions in feature modules.
- Important writes call Postgres RPCs so request context, business changes, and audit logging happen in one transaction.
- Exports are rendered server-side.
- Sensitive endpoints are rate-limited and return `Cache-Control: no-store` where identity or token material is involved.

## Database Flow

- Tables store canonical data.
- Views provide read models.
- RPCs encapsulate mutations and analytics.
- Triggers enforce timestamps, audit history, immutability, and gift validation.
- RLS policies enforce Viewer and Super Admin permissions.

## Authentication Flow

1. Client sends Telegram `initData` to `/api/auth/telegram`.
2. Server verifies HMAC using `TELEGRAM_BOT_TOKEN`.
3. Server upserts profile using service role.
4. Server signs `wr_session` cookie with `SESSION_SECRET`.
5. Server and browser clients request short-lived Supabase JWTs signed with `SUPABASE_JWT_SECRET`.
6. Supabase RLS reads `auth.uid()` as `profiles.id`.

## Authorization Flow

- UI hides unavailable controls.
- Server actions call `requireSuperAdmin()`.
- Database RLS is the final boundary.
- Disabled profiles lose effective permissions through `has_role()`.

## Realtime Flow

- Browser obtains a short-lived Supabase token.
- Realtime subscriptions listen to published tables.
- Query caches invalidate on relevant table changes.
- Audit activity timeline updates from realtime publication.

## Storage Flow

- Buckets are private.
- Viewer can read permitted files through authenticated access.
- Super Admin can upload/update/delete storage objects according to policies.
- Attachment rows are soft-deletable; storage objects are preserved for auditability.

## Dependency Direction

```text
app -> features -> shared/lib/components -> lib
features -> components/ui
database -> generated types -> repositories/actions
```

Feature modules should not import from each other except for stable public exports such as `features/auth`.
