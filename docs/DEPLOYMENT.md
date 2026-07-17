# Deployment Guide

## Recommended Platform

- Vercel for the Next.js app.
- Supabase for Postgres, Realtime, Storage, and API.
- Telegram BotFather for Mini App entrypoint.

## Vercel

1. Connect repository.
2. Set Node.js version to 22.
3. Add environment variables.
4. Build command: `npm run build`.
5. Output: Next.js default.
6. Enable HTTPS custom domain.

## Supabase

1. Create project.
2. Configure project region close to users.
3. Apply migrations.
4. Verify RLS policies.
5. Confirm Realtime publication includes `events`, `gifts`, and `audit_logs`.
6. Confirm private storage buckets exist.

## Telegram

1. Configure bot with BotFather.
2. Set Mini App URL to production HTTPS domain.
3. Test launch on iOS, Android, Telegram Desktop, and Telegram Web.

## Production Environment

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Custom Domain and HTTPS

Telegram Mini Apps require HTTPS in production. Configure DNS and certificate through your hosting provider.

## Caching

- Auth/session/token responses use `no-store`.
- Reports and backups use `no-store`.
- Static Next.js assets are served with hashed filenames and can be cached by the platform.

## Pre-Production Checklist

```bash
npm run format:check
npm run lint
npm run typecheck
npm run i18n:check
npm audit --audit-level=high
npm run db:test
npm run db:types
npm run build
```

Also complete:

- Staging migration dry-run.
- Telegram real-device smoke tests.
- Lighthouse audit.
- Screen-reader pass.
- Load test with production-like data.
- Backup restore drill.
