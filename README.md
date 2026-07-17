# To'y Daftari Telegram Mini App

A production-grade Telegram Mini App for wedding event registries, gift ledgers, analytics, admin operations, reports, and immutable audit history.

The application is designed for families and administrators who need a trusted long-term record of weddings and gifts across Uzbek, Russian, and English interfaces. Financial statistics are calculated on the server, currencies are never mixed, destructive actions are auditable and restorable, and database RLS is the final authorization boundary.

## Features

- Telegram Mini App authentication with verified `initData`
- Role-based access: Viewer and Super Admin
- Events, gifts, gift types, currencies, files, settings, users, and audit logs
- Server-side analytics dashboard with realtime updates
- CSV, XLSX, and PDF exports
- Admin Panel with sorting, filtering, pagination, column visibility, and row selection patterns
- Immutable audit history, before/after diffs, restore actions, and activity timeline
- Soft delete by default; hard delete is not exposed in the app
- Dark mode, light mode, and Telegram theme synchronization
- Uzbek, Russian, and English localization
- Private Supabase Storage buckets
- Database integration tests against disposable Postgres

## Screenshots

Place production screenshots here after staging visual QA:

- `docs/assets/dashboard.png` - dashboard analytics
- `docs/assets/events.png` - event list and details
- `docs/assets/admin.png` - admin control surface
- `docs/assets/audit.png` - audit timeline and version comparison
- `docs/assets/mobile-telegram.png` - Telegram mobile WebView

## Tech Stack

- Next.js App Router, React, TypeScript
- Supabase Postgres, RLS, Realtime, private Storage
- Telegram Mini App SDK
- TanStack Query
- Framer Motion
- Recharts
- Zod
- next-intl
- Tailwind CSS
- ExcelJS, jsPDF, jsPDF AutoTable

## Requirements

- Node.js 22 or newer
- npm
- Supabase project for production/staging
- Telegram bot created with BotFather
- PostgreSQL-compatible environment for deployed Supabase migrations

Docker is not required for local database tests; the repo uses `embedded-postgres`.

## Installation

```bash
git clone <repository-url>
cd wedding_day
npm install
cp .env.example .env.local
```

Fill `.env.local` with real Supabase and Telegram values. Never commit `.env.local`.

## Environment Variables

See [.env.example](.env.example) and [Environment Guide](docs/ENVIRONMENT.md).

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `SESSION_SECRET`

Optional:

- `NEXT_PUBLIC_APP_URL`

## Local Development

```bash
npm run db:test
npm run db:types
npm run dev
```

Open the local URL printed by Next.js. Outside Telegram the auth screen intentionally shows a Telegram verification error.

## Production Build

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

## Deployment

The recommended deployment target is Vercel for the Next.js app and Supabase for database, storage, realtime, and API access.

Read [Deployment Guide](docs/DEPLOYMENT.md) before shipping.

## Folder Structure

```text
src/app                 Next.js routes, layouts, route handlers, loading/error states
src/components/ui       Generated base UI primitives
src/features            Domain modules: auth, events, gifts, analytics, admin, audit, reports
src/i18n                Locale config and message catalogs
src/lib                 Environment and Supabase clients
src/providers           App-level React providers
src/shared              Shared components, hooks, formatting, errors, request context
supabase/migrations     Database source of truth
scripts/db              Disposable Postgres test harness and type generator
docs                    Production documentation
```

More detail: [Folder Structure](docs/FOLDER_STRUCTURE.md).

## Useful Commands

| Command                | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start local development server              |
| `npm run build`        | Build production app                        |
| `npm run start`        | Run built app                               |
| `npm run lint`         | ESLint                                      |
| `npm run typecheck`    | TypeScript check                            |
| `npm run format`       | Format files                                |
| `npm run format:check` | Verify Prettier formatting                  |
| `npm run i18n:check`   | Verify locale key parity                    |
| `npm run db:test`      | Apply migrations and run database/RLS tests |
| `npm run db:types`     | Regenerate Supabase TypeScript types        |

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Environment Guide](docs/ENVIRONMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database Documentation](docs/DATABASE.md)
- [API Documentation](docs/API.md)
- [Component Documentation](docs/COMPONENTS.md)
- [Coding Standards](docs/CODING_STANDARDS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Backup and Recovery Guide](docs/BACKUP_RECOVERY.md)
- [Maintenance Guide](docs/MAINTENANCE_GUIDE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Administrator Guide](docs/ADMINISTRATOR_GUIDE.md)
- [User Guide](docs/USER_GUIDE.md)
- [Release Notes](docs/RELEASE_NOTES.md)
- [Project Checklist](docs/PROJECT_CHECKLIST.md)
- [Project Review](docs/PROJECT_REVIEW.md)
- [Production Checklist](docs/PRODUCTION_CHECKLIST.md)
- [Final QA Release Report](docs/FINAL_QA_RELEASE_REPORT.md)
- [Final Phase 10 Review](docs/FINAL_PHASE_10_REVIEW.md)

## Troubleshooting

Common issues are documented in [Troubleshooting Guide](docs/TROUBLESHOOTING.md).

Short version:

- Auth fails in browser: open the app from Telegram or provide real Telegram launch params.
- Env validation fails: compare `.env.local` with `.env.example`.
- DB tests fail to boot: ensure no stale process is using port `55432`.
- Types changed after migrations: run `npm run db:types` and commit `src/lib/supabase/types.ts`.

## FAQ

**Can viewers export reports?**  
No. Viewers can read ledger data in the app, but exports are Super Admin only.

**Are deleted records permanently removed?**  
No. App deletes are soft deletes with audit history. Hard deletes are operational-only.

**Can currencies be combined?**  
No. UZS, USD, and EUR are reported separately.

**Is Supabase Auth used?**  
No. Telegram identity is verified server-side, then the app mints short-lived Supabase-compatible JWTs so RLS can use `auth.uid()`.

## License

Proprietary unless a license file is added by the project owner.

## Credits

Built for the To'y Daftari product using Next.js, Supabase, Telegram Mini Apps, and the open-source packages listed in `package.json`.
