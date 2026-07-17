# Coding Standards

## Naming

- Components: `PascalCase`.
- Hooks: `useSomething`.
- Server actions: `somethingAction`.
- Repositories: `*-repository.ts`.
- Schemas: `*-schema.ts`.
- Types: colocated `types.ts` or `types/index.ts`.
- Migrations: timestamp prefix plus descriptive slug.

## Folder Conventions

- Put domain code in `src/features/<domain>`.
- Put generic app utilities in `src/shared`.
- Put infrastructure in `src/lib`.
- Put route handlers in `src/app/api`.
- Put database changes in `supabase/migrations`.

## TypeScript

- Prefer generated Supabase types.
- Avoid `any`.
- Use Zod at external boundaries.
- Keep casts close to Supabase client limitations and explain them when not obvious.
- Use `server-only` for modules that must never enter client bundles.

## React

- Prefer Server Components for data-loaded pages.
- Use Client Components for interactivity only.
- Use TanStack Query for client-side async state.
- Keep forms controlled by schema and feature actions.
- Memoize derived heavy data only where it has measurable value.

## Supabase

- RLS is the final permission boundary.
- Never rely only on hidden UI controls.
- Mutations that require audit context should go through RPCs.
- Generate types after migrations with `npm run db:types`.
- Do not import the service client outside trusted route handlers.

## Styling

- Use design tokens and existing UI primitives.
- Respect safe areas for Telegram mobile.
- Support dark/light/Telegram theme.
- Use skeletons for loading.
- Use accessible focus states.

## Documentation

- Update docs when adding a feature, table, API, or environment variable.
- Add troubleshooting notes for repeated setup or deployment issues.

## Tests

- Add database tests for every RLS, trigger, function, or migration behavior with security impact.
- Run full gates before merging:

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
