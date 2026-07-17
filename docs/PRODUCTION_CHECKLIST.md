# Production Checklist

## Release Gates

- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run i18n:check` passes.
- [ ] `npm run db:test` passes.
- [ ] `npm run build` passes.
- [ ] Supabase migrations applied in order.
- [ ] `src/lib/supabase/types.ts` regenerated after migration changes.
- [ ] No service role key is exposed to the browser.

## Environment

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set only in server environment.
- [ ] `TELEGRAM_BOT_TOKEN` rotated after any accidental exposure.
- [ ] `SESSION_SECRET` is at least 32 random bytes.
- [ ] Vercel production domain is HTTPS-only.
- [ ] Telegram BotFather Web App URL points to production HTTPS URL.

## Security

- [ ] RLS enabled on every public table.
- [ ] Audit logs cannot be inserted, updated, or deleted directly.
- [ ] Storage buckets are private.
- [ ] Admin routes require Super Admin server-side.
- [ ] Security headers are enabled.
- [ ] Auth failures write system logs.
- [ ] Destructive actions require confirmation and support undo.

## Performance

- [ ] Dashboard first load stays below target on a real mobile network.
- [ ] Recharts and command palette remain lazy-loaded.
- [ ] Global search uses indexed columns and debounced queries.
- [ ] Audit pages use cursor/infinite loading.
- [ ] Supabase Realtime has one app-wide channel.

## Operations

- [ ] Database backup schedule configured in Supabase.
- [ ] Storage backup procedure documented and tested.
- [ ] Audit backup endpoint tested by Super Admin.
- [ ] Restore event/gift version tested in staging.
- [ ] Monitoring alerts configured for auth, API, DB, storage, and realtime errors.

## UX

- [ ] Tested in Telegram iOS, Telegram Android, Telegram Desktop, Telegram Web.
- [ ] Tested portrait and landscape.
- [ ] Dark, light, and Telegram theme modes checked.
- [ ] Keyboard navigation works for dialogs, command palette, forms, and tables.
- [ ] Reduced motion preference respected.

## Deployment

- [ ] CI passes on the release branch.
- [ ] Supabase migrations deployed before app deployment.
- [ ] Vercel deployment uses production env vars.
- [ ] Smoke test: login, create event, create gift, edit, delete, undo, restore, export audit.
