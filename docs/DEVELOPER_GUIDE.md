# Developer Guide

## Development Philosophy

The database is the trust boundary. Frontend checks improve UX, but RLS, constraints, triggers, and RPCs enforce correctness.

## Daily Workflow

```bash
npm install
npm run dev
```

Before committing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run i18n:check
npm audit --audit-level=high
npm run db:test
npm run build
```

## Adding a Database Change

1. Add migration in `supabase/migrations`.
2. Add or update tests in `scripts/db/test.mjs`.
3. Run `npm run db:test`.
4. Run `npm run db:types`.
5. Update `docs/DATABASE.md`.

## Adding a Server Action

1. Put action in the relevant feature `api` folder.
2. Validate input with Zod.
3. Check permissions server-side.
4. Use RPC if audit context or transactional behavior matters.
5. Return `ActionResult`.
6. Revalidate affected paths.

## Adding a Client Feature

1. Keep state local when possible.
2. Use TanStack Query for server state.
3. Add skeletons, empty states, and error states.
4. Add translations in all locales.
5. Test mobile safe-area behavior.

## Adding an API Route

1. Validate input.
2. Authenticate and authorize.
3. Rate-limit sensitive routes.
4. Use `no-store` for identity, token, report, or backup responses.
5. Document route in `docs/API.md`.

## Working With Translations

Edit every locale file together:

- `src/i18n/messages/en.json`
- `src/i18n/messages/ru.json`
- `src/i18n/messages/uz.json`

Run:

```bash
npm run i18n:check
```

## Working With Reports

Reports run on the server. Do not move financial report calculations to the client.

Supported formats:

- CSV
- XLSX
- PDF

## Debugging Permissions

Use database tests to reproduce permission issues.

Useful checks:

- Does user have active profile?
- Does user have active role grant?
- Does RLS policy check active parent rows?
- Does the RPC call run as authenticated user or service role?
