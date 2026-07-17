# Final QA Release Report

Date: 2026-07-17
Role: Independent production QA review
Decision: READY FOR PRODUCTION after the fixes in this report are included.

## QA Scope

Reviewed authentication, authorization, dashboard, events, gifts, admin panel, audit logs, reports, realtime/database boundaries, search, localization, security headers, session handling, dependency audit, database constraints, storage policies, build output, and runtime smoke behavior.

This pass intentionally focused on breaking production assumptions rather than adding new product features.

## Bugs Found And Fixed

### High - Disabled users kept effective permissions

Severity: High

Description: `admin_set_user_disabled()` marked `profiles.deleted_at`, but `has_role()` and `my_permissions()` only checked `user_roles.deleted_at`. A disabled Viewer or Super Admin could keep effective permissions until their role grant was separately revoked.

Steps to reproduce:

1. Grant a user the `viewer` role.
2. Disable the user through admin.
3. Call `my_permissions()` or query an RLS-protected table as that user.

Expected behavior: Disabled users immediately lose read/write permissions.

Actual behavior: The role grant still made `is_viewer_or_above` true.

Recommended fix: Require `profiles.deleted_at is null` when resolving effective roles.

Fix implemented: Added `20260716000028_disabled_user_permissions.sql` and regression coverage in `scripts/db/test.mjs`.

### High - Database accepted pathological text payloads through RPCs

Severity: High

Description: Forms limited titles and giver names, but the database did not. Direct RPC calls could store huge strings that would hurt search indexes, exports, audit diffs, and mobile rendering.

Steps to reproduce:

1. Call `create_event()` with a title longer than 200 characters.
2. Call `create_gift()` with a giver name longer than 200 characters.

Expected behavior: The database rejects invalid payloads even when the UI is bypassed.

Actual behavior: The database accepted oversized text.

Recommended fix: Add database-level length constraints matching product limits.

Fix implemented: Added `20260716000029_text_length_guards.sql` and regression coverage.

### Medium - Session tokens relied only on cookie expiry

Severity: Medium

Description: Session cookies had `maxAge`, but the signed payload did not enforce `issuedAt` expiry on the server. A copied old token could be accepted if manually replayed.

Steps to reproduce:

1. Obtain a valid old `wr_session` token.
2. Send it manually after its intended lifetime.

Expected behavior: Server rejects expired signed payloads.

Actual behavior: The server only verified signature and shape.

Recommended fix: Reject tokens older than the configured session lifetime.

Fix implemented: `getSession()` now validates `issuedAt` against the same 30-day lifetime as the cookie.

### Medium - Auth responses lacked consistent no-store headers

Severity: Medium

Description: Session and token responses contain identity or auth material and must not be cached by browsers, Telegram WebView, or proxies.

Steps to reproduce:

1. Request `/api/auth/session` or `/api/auth/supabase-token`.
2. Inspect response cache headers.

Expected behavior: `Cache-Control: no-store`.

Actual behavior: Some auth responses did not set it.

Recommended fix: Add `no-store` to auth/session/token/login/logout responses.

Fix implemented: Auth route responses now send `Cache-Control: no-store`; runtime smoke confirmed `/api/auth/session`.

### Medium - Command Palette exposed admin-only destinations to viewers

Severity: Medium

Description: The global Command Palette queried users and settings for every role and returned `/admin/...` links. RLS still protected data, but the UI exposed inaccessible admin destinations and created a confusing workflow.

Steps to reproduce:

1. Sign in as Viewer.
2. Open Command Palette.
3. Search for users/settings.

Expected behavior: Viewer sees only destinations they can use.

Actual behavior: Admin-only destinations could appear.

Recommended fix: Gate user/settings command results behind Super Admin permissions.

Fix implemented: Command Palette now only queries users/settings for Super Admins and changes placeholder text for Viewers.

### Low - Rate limiter bucket map could grow under abusive key cardinality

Severity: Low

Description: The local in-memory rate limiter had no cleanup/cap path, allowing many unique IP/scope keys to grow memory.

Steps to reproduce:

1. Send requests with many spoofed forwarding IPs.
2. Observe bucket growth in a long-lived process.

Expected behavior: Expired buckets are pruned and total buckets are capped.

Actual behavior: Buckets remained until process restart.

Recommended fix: Prune expired buckets and enforce a hard cap.

Fix implemented: Rate limiter now prunes expired entries and caps buckets at 10,000.

## Validation Results

| Gate                      | Result                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| Format                    | Passed                                                                  |
| Lint                      | Passed                                                                  |
| Typecheck                 | Passed                                                                  |
| i18n key sync             | Passed, 337 keys in `en`, `ru`, `uz`                                    |
| Dependency security audit | Passed, 0 vulnerabilities                                               |
| Database tests            | Passed, 39/39                                                           |
| Database type generation  | Passed                                                                  |
| Production build          | Passed                                                                  |
| Runtime smoke             | Passed, `/api/auth/session` 200 with `Cache-Control: no-store`; `/` 200 |

Production build snapshot:

- Shared first-load JS: 103 kB
- `/dashboard`: 381 kB
- `/events`: 392 kB
- `/events/[id]`: 422 kB
- `/admin/audit`: 258 kB

## Category Scores

| Category        |    Score | QA Notes                                                                                                                                     |
| --------------- | -------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture    | 9.2 / 10 | Feature separation, server actions, RLS-first design, and docs are strong.                                                                   |
| Database        | 9.3 / 10 | RLS, triggers, soft delete, audit immutability, disabled-user handling, and length guards are now covered by tests.                          |
| Frontend        | 9.0 / 10 | Good skeletons, lazy loading, realtime hooks, and role-aware command palette.                                                                |
| Backend         | 9.1 / 10 | Auth/session/report/export endpoints are permissioned, rate-limited, and no-store where needed.                                              |
| UI              | 9.0 / 10 | Premium SaaS direction is consistent; final device-lab pass still recommended.                                                               |
| UX              | 9.0 / 10 | Core flows are coherent; viewer/admin command results now match access.                                                                      |
| Security        | 9.2 / 10 | Audit 0 vulnerabilities, fixed disabled-user bypass, session replay window, and auth caching.                                                |
| Performance     | 8.9 / 10 | Bundle is acceptable after lazy loading; production load testing is still required for 100k+ records.                                        |
| Accessibility   | 8.8 / 10 | Zoom, focus, reduced motion, and semantic states are covered; screen-reader audit remains a release gate.                                    |
| Maintainability | 9.2 / 10 | CI/checklists/docs and database regression tests support long-term ownership.                                                                |
| Scalability     | 8.9 / 10 | Indexed query paths and pagination are in place; distributed rate limiting should replace local memory limiter in multi-instance production. |
| Documentation   | 9.1 / 10 | README, production checklist, maintenance guide, CTO review, and this QA report exist.                                                       |

## Final Release Checklist

- Production build: Passed locally.
- Lint/typecheck/format: Passed locally.
- Tests: Database integration tests passed locally.
- Security: Dependency audit passed locally with 0 vulnerabilities.
- Performance: Build bundle reviewed locally; load testing still required on staging.
- Accessibility: Code-level review passed; manual screen-reader pass still required.
- Responsive: Code-level safe-area/mobile review passed; real Telegram Android/iOS/Desktop testing still required.
- Database: 29 migrations applied in disposable Postgres.
- Realtime: Publication coverage tested for `events`, `gifts`, and `audit_logs`.
- Storage: Buckets are private and default-deny coverage is tested.

## Remaining Release Gates

These require real infrastructure or devices and should happen in staging before public launch:

- Telegram Mini App smoke test inside Telegram iOS, Android, Desktop, and Web.
- Lighthouse audit against deployed production build.
- VoiceOver and NVDA screen-reader pass.
- Load test with 100,000+ users/gifts/events.
- Staging Supabase migration dry-run and rollback drill.
- Backup restore drill for audit/settings/system export.
- Multi-instance rate limit design using Redis, Upstash, Supabase Edge, or platform-native middleware.
- Error tracking and alerting credentials wired in production.

## Final Decision

READY FOR PRODUCTION.

Approval condition: deploy only after the staging/device gates above pass with production-like data and real Telegram launch parameters.
