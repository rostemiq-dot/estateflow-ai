# Production Migration Reconciliation

Last verified: 2026-09-19

## Production facts

- Supabase production database contains the 'tasks' and 'notifications' tables.
- Both tables have the expected columns, foreign keys and indexes from '20260812220000_tasks_notifications'.
- Production also has agency-scoped RLS policies for both tables.
- The Prisma '_prisma_migrations' ledger does not contain '20260812220000_tasks_notifications' because those tables were applied directly through Supabase.
- The Prisma ledger contains '20260904095958_add_offer_contract_financial_workflow', but its stored checksum differs from the current repository file.

## Checksum mismatch

Migration: 20260904095958_add_offer_contract_financial_workflow

Production '_prisma_migrations.checksum':
368229437c1c8f7c2f73cd3a9e2ef68d3809fe4936c9bba30f61651c2d75719f

Current repository file SHA-256:
bd2c593939be33be3efdc0c9330348a6ef0ffdf88523f5ec5c0bdd226bc01cc5

Do not delete or reset the migration record.

## Safe reconciliation procedure

Run this only from an environment with direct access to the production PostgreSQL connection and a current database backup.

### 1. Back up / verify first

Confirm a current database backup exists.

Then:

    npx prisma migrate status

Do not run prisma migrate reset.

### 2. Reconcile the Tasks migration

The database already contains the Tasks/Notifications schema, but Prisma does not know that migration is applied.

First verify that the production schema matches:

    20260812220000_tasks_notifications

including:

- TaskStatus enum
- TaskPriority enum
- NotificationType enum
- tasks table
- notifications table
- foreign keys
- indexes

Once verified, mark that migration as already applied:

    npx prisma migrate resolve --applied 20260812220000_tasks_notifications

Then check:

    npx prisma migrate status

### 3. Reconcile the 2026-09-04 checksum

Preferred option: recover the exact SQL file that was originally applied and restore that exact content in Git. This makes Prisma's stored checksum match naturally.

If the original file cannot be recovered, do not blindly change the migration ledger. After independently verifying that the current database schema matches the migration's intended state, the controlled fallback is to update only that migration's checksum in _prisma_migrations to the current repository SHA-256:

    BEGIN;

    UPDATE "_prisma_migrations"
    SET checksum = 'bd2c593939be33be3efdc0c9330348a6ef0ffdf88523f5ec5c0bdd226bc01cc5'
    WHERE migration_name = '20260904095958_add_offer_contract_financial_workflow';

    COMMIT;

Before using that fallback, take a backup and verify the migration is already fully applied. Do not use it to hide a real schema difference.

### 4. Final verification

From the direct-database environment:

    npx prisma migrate status
    npx prisma generate
    npx tsc -p server/tsconfig.json

Only after status is clean should future production deployments use:

    npx prisma migrate deploy

Never use migrate reset against production.
