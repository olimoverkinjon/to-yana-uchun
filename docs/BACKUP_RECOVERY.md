# Backup and Recovery Guide

## Database Backup

Use Supabase managed backups for production.

Recommended:

- Daily automated backups.
- Point-in-time recovery if available.
- Manual backup before major migrations.
- Backup retention policy approved by the business owner.

## Storage Backup

Buckets:

- `avatars`
- `covers`
- `attachments`
- `future-gallery`

All buckets are private. Back up storage objects separately from database rows.

## App-Level Audit Backup

Super Admins can download audit/settings/system backup from:

```text
GET /api/backups/audit
```

This is not a full database backup. It is an operational export for audit review and emergency inspection.

## Restore Process

1. Identify restore target timestamp.
2. Restore database in staging first.
3. Verify migrations and RLS.
4. Restore storage objects.
5. Run smoke tests.
6. Promote restored environment or perform controlled production restore.

## Disaster Recovery Drill

Quarterly:

1. Restore latest backup to staging.
2. Verify login.
3. Verify dashboard.
4. Verify event/gift records.
5. Verify audit logs.
6. Verify reports.
7. Record recovery time and issues.

## Data Integrity Rules

- Do not hard-delete ledger data through the app.
- Do not edit audit logs.
- Do not mix currencies during manual recovery.
- Keep backup credentials restricted.
