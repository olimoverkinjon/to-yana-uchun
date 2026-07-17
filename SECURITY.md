# Security Policy

## Reporting Vulnerabilities

Report suspected vulnerabilities privately to the project owner or security contact. Do not open public issues containing secrets, exploit details, tokens, or personal data.

Include:

- Affected area
- Steps to reproduce
- Expected and actual behavior
- Impact
- Suggested fix if known

## Authentication

The app verifies Telegram Mini App `initData` server-side using `TELEGRAM_BOT_TOKEN`.

After verification:

- A profile is upserted using the service role client.
- A signed `wr_session` cookie is issued.
- Short-lived Supabase JWTs are minted for PostgREST and Realtime.

## Authorization

Authorization layers:

1. UI hides unavailable controls.
2. Server actions check permissions.
3. Postgres RLS is the final enforcement boundary.

Viewer can read allowed active data.

Super Admin can manage data, users, settings, files, exports, and audit recovery.

Disabled profiles lose effective permissions immediately.

## RLS

All public tables must have RLS enabled. Views must be `security_invoker`.

Run:

```bash
npm run db:test
```

This validates core RLS assumptions.

## Secrets

Never expose:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `SESSION_SECRET`

Rotate immediately if exposed.

## Data Protection

- App deletes are soft deletes.
- Audit logs are immutable.
- Storage buckets are private.
- Exports are Super Admin only.
- Auth/token/session responses use `Cache-Control: no-store`.

## Dependency Security

Run:

```bash
npm audit --audit-level=high
```

The CI pipeline runs this gate.

## Rate Limiting

Sensitive API endpoints use local in-memory rate limits. For multi-instance production deployments, replace or augment this with Redis, Upstash, edge middleware, or platform-native rate limiting.
