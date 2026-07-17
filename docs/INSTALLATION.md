# Installation Guide

This guide brings a new developer from a clean machine to a working local app.

## 1. Clone Repository

```bash
git clone <repository-url>
cd wedding_day
```

## 2. Install Dependencies

```bash
npm install
```

Use Node.js 22 or newer.

## 3. Configure Supabase

Create a Supabase project for staging or production.

Record these values from Project Settings:

- Project URL
- anon public key
- service role key
- JWT secret

Apply migrations using your deployment process for real Supabase environments. Local tests apply migrations automatically to disposable Postgres.

## 4. Configure Telegram Bot

1. Open BotFather in Telegram.
2. Create or select the bot.
3. Copy the bot token.
4. Configure the Mini App URL to your deployed HTTPS URL.
5. For local development, use a tunnel if you need to test inside Telegram.

## 5. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill all required values. Do not commit `.env.local`.

## 6. Run Database Migrations Locally

The local harness boots disposable Postgres and applies every migration:

```bash
npm run db:test
```

## 7. Generate Types

```bash
npm run db:types
```

Commit `src/lib/supabase/types.ts` when migrations change.

## 8. Start Development Server

```bash
npm run dev
```

Open the printed local URL. Telegram auth requires Telegram launch context.

## 9. Production Build

```bash
npm run build
npm run start
```

## 10. Pre-Release Verification

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
