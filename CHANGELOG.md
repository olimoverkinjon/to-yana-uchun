# Changelog

This project follows Semantic Versioning.

## [0.1.0] - 2026-07-17

### Added

- Telegram Mini App authentication.
- Event and gift ledger.
- Server-side dashboard analytics.
- Admin Panel for users, settings, files, and system health.
- Immutable audit logs, activity timeline, version comparison, and restore.
- CSV, XLSX, and PDF exports.
- Private Supabase Storage buckets.
- Uzbek, Russian, and English localization.
- Production hardening headers, rate limiting, and dependency audit overrides.
- Database integration test harness with disposable Postgres.
- Enterprise documentation set.

### Security

- RLS policies for all public tables.
- Disabled users lose effective permissions immediately.
- Auth/session/token routes use no-store cache headers.
- Audit logs are immutable even for roles bypassing RLS.
- Dependency audit passes with zero high-level vulnerabilities.

### Documentation

- README
- Installation Guide
- Environment Guide
- Architecture
- Database Docs
- API Docs
- Deployment Guide
- Backup and Recovery
- Maintenance Guide
- QA Release Report

## Release Process

1. Update this changelog.
2. Run all quality gates.
3. Tag release as `vMAJOR.MINOR.PATCH`.
4. Deploy staging.
5. Run staging/device checks.
6. Promote to production.
