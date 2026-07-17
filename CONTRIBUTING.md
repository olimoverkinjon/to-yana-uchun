# Contributing

## Branching

Use short descriptive branches:

```text
feature/report-filters
fix/audit-restore-permission
docs/deployment-guide
```

## Commit Messages

Use clear imperative messages:

```text
Add disabled-user permission regression test
Fix report export cache headers
Document Supabase deployment
```

## Pull Requests

Every PR should include:

- Summary
- Screenshots for UI changes
- Migration notes for database changes
- Security notes for auth/RLS changes
- Test evidence
- Rollback notes for risky changes

## Code Review

Reviewers should check:

- RLS and server-side authorization
- Input validation
- Audit logging
- Loading/empty/error states
- Localization keys
- Mobile safe-area behavior
- Bundle impact
- Database indexes for new query patterns

## Testing

Run before requesting review:

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

## Database Changes

- Add a migration.
- Add or update database tests.
- Regenerate Supabase types.
- Document new tables/functions/policies in `docs/DATABASE.md`.

## Security Changes

For auth, role, RLS, export, storage, or audit changes:

- Add regression tests.
- Update `SECURITY.md` if assumptions change.
- Verify Viewer cannot escalate privileges.
- Verify disabled users lose access immediately.
