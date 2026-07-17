# Maintenance Guide

## Adding New Gift Types

1. Add or update rows in `gift_types`.
2. Set validation flags:
   - `requires_amount`
   - `requires_currency`
   - `requires_weight`
   - `category`
3. Verify `validate_gift_fields` accepts/rejects the expected shape.
4. Test gift form visibility.
5. Run `npm run db:test`.

No frontend code should be required for ordinary gift type additions.

## Adding New Languages

1. Add a locale in `src/i18n/config.ts`.
2. Add a message file in `src/i18n/messages`.
3. Translate every key.
4. Run:

```bash
npm run i18n:check
```

5. Test layout on mobile for long strings.

## Adding New Pages

1. Create route under `src/app`.
2. Add feature code under `src/features/<feature>`.
3. Add loading and error states where needed.
4. Update navigation only if the page is a primary workflow.
5. Add translations.
6. Document the page in relevant user/admin docs.

## Adding New Features

Follow this order:

1. Define data model and permissions.
2. Add migration and tests.
3. Generate types.
4. Add repository/server action.
5. Add UI.
6. Add loading, empty, error, dark mode, and mobile states.
7. Update documentation.

## Updating Supabase

1. Review Supabase changelog.
2. Test migrations locally.
3. Run database tests.
4. Regenerate types.
5. Stage migration.
6. Verify RLS and Realtime.

## Updating Dependencies

```bash
npm outdated
npm install <package>@latest
npm audit --audit-level=high
npm run build
```

For major upgrades, create a dedicated branch and record risk in the PR.

## Maintaining Audit Integrity

- Never edit `audit_logs`.
- Use restore RPCs for historical version restore.
- Keep `prevent_audit_log_mutation` enabled.
- Treat service role access as operational break-glass.

## Maintaining Performance

- Add indexes before introducing new list/search filters.
- Keep exports server-side.
- Lazy-load heavy chart/report libraries.
- Re-test with 100,000+ records before major releases.

## Maintaining Documentation

Update documentation in the same PR as code changes.

Required docs to consider:

- README
- API docs
- Database docs
- User/Admin guides
- Changelog
- Security docs
