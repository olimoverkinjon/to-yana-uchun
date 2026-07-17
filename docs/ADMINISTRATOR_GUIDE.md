# Administrator Guide

## Roles

### Viewer

Can read active events, gifts, settings, and allowed files.

Cannot create, edit, delete, export, manage users, or view audit logs.

### Super Admin

Can manage events, gifts, users, settings, files, reports, audit logs, and restore historical versions.

## User Management

Super Admins can:

- Disable or restore users.
- Assign roles.
- Review user profiles.

Disabled users lose effective permissions immediately.

## Events

Super Admins can:

- Create event.
- Update event.
- Archive event.
- Soft-delete event.
- Restore event.

Deleted records remain available to Super Admins and audit history.

## Gifts

Super Admins can:

- Create gift.
- Update gift.
- Soft-delete gift.
- Restore gift.

Gift validation is driven by gift type metadata.

## Reports

Reports are Super Admin only.

Formats:

- CSV
- XLSX
- PDF

Currencies are always separated.

## Audit Logs

Audit logs show:

- Actor
- Action
- Table
- Affected record
- Before/after diff
- Reason
- Device context
- Related event/gift

Audit logs are immutable.

## Backups

Use Supabase managed backups for full recovery.

The app audit backup endpoint exports audit/settings/system data for operational review.

## Operational Checks

Before major use:

- Verify bot opens app in Telegram.
- Verify first Super Admin can log in.
- Verify event/gift creation.
- Verify report export.
- Verify audit log entries.
- Verify backup download.
