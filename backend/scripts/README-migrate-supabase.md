# Supabase Migration Tool

Script:

- `backend/scripts/migrate-supabase.js`

Run from:

- `backend/`

Command:

```bash
npm run migrate:supabase
```

Required environment variables:

- `PG_BIN_DIR` (optional if `pg_dump` and `psql` are already in `PATH`)
- `SOURCE_DB_URL`
- `TARGET_DB_URL`

Optional for Storage copy:

- `SOURCE_SUPABASE_URL`
- `SOURCE_SUPABASE_SERVICE_KEY`
- `TARGET_SUPABASE_URL`
- `TARGET_SUPABASE_SERVICE_KEY`

Optional behavior flags:

- `MIGRATION_SCHEMAS=public`
- `MIGRATION_INCLUDE_STORAGE=true`
- `MIGRATION_DROP_EXISTING=false`
- `MIGRATION_EXCLUDE_TABLES=table_a,table_b`

What it migrates:

- Postgres schema for the selected schemas
- Postgres table data for the selected schemas
- Supabase Storage buckets and objects if enabled

What it does not migrate:

- Supabase project-level settings
- Edge Functions
- Realtime config
- Custom auth configuration outside what exists in migrated tables

Requirements:

- `pg_dump` installed and available in `PATH`
- `psql` installed and available in `PATH`

If PostgreSQL client tools are installed outside `PATH`, set:

```env
PG_BIN_DIR=/mnt/c/Program Files/PostgreSQL/18/bin
```

Important:

- The copy itself will still read from the old project, so some source egress may be consumed during the migration run.
- For a brand-new target database, leave `MIGRATION_DROP_EXISTING=false`.
- For a target you want to overwrite, set `MIGRATION_DROP_EXISTING=true` carefully.
