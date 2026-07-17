# Environment Variables

The app validates environment variables at boot in `src/lib/env.ts`.

## Required Client Variables

### `NEXT_PUBLIC_SUPABASE_URL`

Supabase project URL.

Example:

```text
https://your-project.supabase.co
```

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Supabase anon key. This is safe to expose publicly because RLS is the security boundary.

## Required Server Variables

### `SUPABASE_SERVICE_ROLE_KEY`

Supabase service role key. Server-only. Used only in trusted API routes such as Telegram profile upsert and activity/security logging.

Never expose this to the browser.

### `SUPABASE_JWT_SECRET`

Supabase JWT secret from Project Settings > API > JWT Settings.

The app signs short-lived Telegram-derived JWTs with this secret so PostgREST and Realtime can evaluate RLS with `auth.uid()`.

Minimum length: 32 characters.

### `TELEGRAM_BOT_TOKEN`

BotFather token for verifying Telegram Mini App `initData`.

### `SESSION_SECRET`

Random secret for signing the first-party `wr_session` cookie.

Generate with:

```bash
openssl rand -base64 32
```

Minimum length: 32 characters.

### `BOOTSTRAP_SUPER_ADMIN_TELEGRAM_IDS`

Optional comma-separated Telegram user IDs that should receive the
`super_admin` role automatically after their first verified Telegram login.

Use this for the first production launch so the admin panel is not locked
behind an empty role table:

```text
BOOTSTRAP_SUPER_ADMIN_TELEGRAM_IDS=7990560340
```

After the first Super Admin has logged in and granted the remaining roles from
the Admin Panel, you may remove this variable from production.

## Optional Variables

### `NEXT_PUBLIC_APP_URL`

Absolute public URL for links, future sharing, or QR flows.

## Rules

- Do not commit `.env.local`.
- Do not paste real secrets into documentation, issues, or pull requests.
- Rotate `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, and `TELEGRAM_BOT_TOKEN` immediately if exposed.
