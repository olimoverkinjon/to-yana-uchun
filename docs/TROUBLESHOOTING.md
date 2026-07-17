# Troubleshooting Guide

## App says Telegram account cannot be verified

Cause: The app was opened outside Telegram or Telegram `initData` was unavailable/invalid.

Fix:

- Open the Mini App from Telegram.
- Verify BotFather Mini App URL.
- Verify `TELEGRAM_BOT_TOKEN`.
- Check `/api/auth/telegram` logs.

## Environment validation fails

Cause: missing or invalid `.env.local` value.

Fix:

- Compare `.env.local` with `.env.example`.
- Ensure secrets are at least 32 characters where required.
- Restart dev server after changing env vars.

## `db:test` cannot start Postgres

Cause: stale embedded Postgres process or port conflict on `55432`.

Fix:

- Stop stale `postgres` processes from previous runs.
- Set `HARNESS_PG_PORT` to a free port.
- Re-run `npm run db:test`.

## Generated Supabase types changed

Cause: migrations changed.

Fix:

```bash
npm run db:types
npm run format:check
```

Commit `src/lib/supabase/types.ts`.

## Viewer sees no data

Possible causes:

- User has no role grant.
- Profile is disabled.
- Events are draft, archived, or deleted.
- RLS policy is correctly hiding unavailable rows.

Fix:

- Super Admin should verify user role and profile status.
- Confirm event status is `active`.

## Reports fail with forbidden

Cause: reports are Super Admin only.

Fix:

- Verify current user has `super_admin`.
- Re-login after role changes.

## Realtime does not update

Check:

- `/api/auth/supabase-token` returns a token.
- Supabase Realtime is enabled.
- Publication includes `events`, `gifts`, `audit_logs`.
- Browser network is online.

## Telegram theme looks wrong

Check:

- App is running inside Telegram.
- Telegram client has latest version.
- Theme sync provider is mounted in `AppProviders`.

## Build fails on env variables

Cause: production build evaluates server/client env validation.

Fix:

- Add all required environment variables in Vercel or local shell.
- Do not use placeholder values in production.
