# Project Checklist

## Development

- [ ] Feature has a clear owner.
- [ ] Data model is documented.
- [ ] RLS policy is defined.
- [ ] UI has loading, empty, and error states.
- [ ] Mobile layout is tested.
- [ ] Translations are added.
- [ ] Audit behavior is defined.

## Database

- [ ] Migration added.
- [ ] Indexes support new query patterns.
- [ ] Constraints protect important data.
- [ ] Triggers are documented.
- [ ] `npm run db:test` passes.
- [ ] `npm run db:types` run and committed.

## Security

- [ ] Server-side permission check.
- [ ] RLS verified.
- [ ] Sensitive route rate-limited.
- [ ] No secrets exposed.
- [ ] `npm audit --audit-level=high` passes.

## Release

- [ ] Format check passes.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] i18n check passes.
- [ ] DB tests pass.
- [ ] Production build passes.
- [ ] Staging smoke test passes.
- [ ] Telegram device tests pass.
- [ ] Backup restore drill completed.

## Documentation

- [ ] README updated.
- [ ] API docs updated.
- [ ] Database docs updated.
- [ ] User/Admin guide updated.
- [ ] Changelog updated.
