# Folder Structure

## Root

- `.github/workflows` - CI verification.
- `docs` - long-term project documentation.
- `scripts/db` - disposable Postgres harness, migration tests, type generation.
- `supabase/migrations` - database source of truth.
- `src` - application source.

## `src/app`

Next.js App Router routes.

- `(app)` - authenticated application shell routes.
- `api` - route handlers.
- `layout.tsx` - root HTML, fonts, providers.
- `globals.css` - design tokens, base styles, mobile safe-area behavior.

## `src/components/ui`

Base UI primitives generated from the component system.

Do not put product-specific business logic here.

## `src/features`

Feature-first modules:

- `activity` - activity log reads and telemetry hook.
- `admin` - users, settings, files, system health, admin tables.
- `analytics` - dashboard analytics repositories, hooks, charts.
- `audit` - audit explorer, diff viewer, version restore.
- `auth` - Telegram session, permissions, auth hooks.
- `dashboard` - legacy dashboard summary components.
- `events` - event repository, forms, list/detail UI, actions.
- `gifts` - gift repository, forms, list rows, actions.
- `navigation` - header, bottom nav, language and theme switching.
- `realtime` - Supabase realtime cache invalidation.
- `reference-data` - currencies and gift types.
- `reports` - report data and server-side renderers.
- `search` - global search and command palette.
- `telegram` - Telegram SDK integration.

## `src/i18n`

Locales and message catalogs:

- `en.json`
- `ru.json`
- `uz.json`

Run `npm run i18n:check` after editing messages.

## `src/lib`

Low-level infrastructure:

- `env.ts` - environment validation.
- `supabase` - browser, server, service clients, JWT helpers, generated types.
- `utils.ts` - general utilities.

## `src/providers`

App-level providers:

- TanStack Query
- theme
- Telegram theme sync
- command palette

## `src/shared`

Reusable app-level building blocks:

- `components` - layout, empty/error states, confirmation dialog.
- `hooks` - animation, media query, debounce.
- `lib` - formatting, errors, rate limit, request context.

## Dependency Rules

- Keep database access inside repositories, server actions, or route handlers.
- Keep domain code inside its feature folder.
- Export stable APIs through each feature `index.ts`.
- Avoid cross-feature imports unless the dependency is foundational, such as auth permissions.
