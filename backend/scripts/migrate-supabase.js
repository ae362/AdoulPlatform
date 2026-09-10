#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function logStep(message) {
  console.log(`\n▶ ${message}`);
}

function logInfo(message) {
  console.log(`   ${message}`);
}

function envBool(name, defaultValue = false) {
  const value = process.env[name];
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function normalizePathValue(value) {
  if (!value) return value;
  let normalized = String(value).trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  if (/^[A-Za-z]:\\/.test(normalized)) {
    const driveLetter = normalized[0].toLowerCase();
    const rest = normalized
      .slice(2)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    normalized = `/mnt/${driveLetter}/${rest}`;
  }

  return normalized;
}

function toRuntimePath(value) {
  const normalized = normalizePathValue(value);
  if (!normalized) return normalized;

  if (process.platform === 'win32') {
    const mntMatch = normalized.match(/^\/mnt\/([a-zA-Z])\/(.+)$/);
    if (mntMatch) {
      const driveLetter = mntMatch[1].toUpperCase();
      const rest = mntMatch[2].replace(/\//g, '\\');
      return `${driveLetter}:\\${rest}`;
    }
  }

  return normalized;
}

function parseList(value, fallback = []) {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function runCommand(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });

  if (result.error) {
    fail(`Failed to run ${cmd}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    fail(
      `${cmd} exited with code ${result.status}\n` +
        (stderr ? `stderr:\n${stderr}\n` : '') +
        (stdout ? `stdout:\n${stdout}\n` : '')
    );
  }

  return result;
}

function resolveBinary(binary) {
  const pgBinDir = toRuntimePath(process.env.PG_BIN_DIR);
  if (!pgBinDir) return binary;
  const directPath = path.join(pgBinDir, binary);
  const exePath = path.join(pgBinDir, `${binary}.exe`);

  if (fs.existsSync(directPath)) return directPath;
  if (fs.existsSync(exePath)) return exePath;

  return directPath;
}

function ensureBinaryExists(binary) {
  const resolvedBinary = resolveBinary(binary);
  if (envBool('MIGRATION_DEBUG', false)) {
    console.log(`[migrate-supabase] PG_BIN_DIR(raw)=${process.env.PG_BIN_DIR ?? ''}`);
    console.log(`[migrate-supabase] PG_BIN_DIR(normalized)=${normalizePathValue(process.env.PG_BIN_DIR) ?? ''}`);
    console.log(`[migrate-supabase] PG_BIN_DIR(runtime)=${toRuntimePath(process.env.PG_BIN_DIR) ?? ''}`);
    console.log(`[migrate-supabase] checking binary=${binary}`);
    console.log(`[migrate-supabase] resolved path=${resolvedBinary}`);
    console.log(`[migrate-supabase] exists=${fs.existsSync(resolvedBinary)}`);
  }
  const check = spawnSync(resolvedBinary, ['--version'], { stdio: 'pipe', encoding: 'utf8' });
  if (check.error) {
    fail(
      `${binary} is required but was not found. ` +
        `Set PG_BIN_DIR correctly or install PostgreSQL client tools in PATH.`
    );
  }

  return resolvedBinary;
}

function buildPgDumpArgs({ sourceUrl, outputFile, schemaOnly, dataOnly, schemas, dropExisting, excludeTables }) {
  const args = ['--dbname', sourceUrl, '--file', outputFile, '--no-owner', '--no-privileges'];

  if (schemaOnly) args.push('--schema-only');
  if (dataOnly) args.push('--data-only', '--disable-triggers');
  if (dropExisting && schemaOnly) args.push('--clean', '--if-exists');

  for (const schema of schemas) {
    args.push('--schema', schema);
  }

  for (const table of excludeTables) {
    args.push('--exclude-table', table);
  }

  return args;
}

async function ensureBucket(targetClient, bucket) {
  const { data: existing, error: existingError } = await targetClient.storage.getBucket(bucket.name);
  if (!existingError && existing) return;

  const { error } = await targetClient.storage.createBucket(bucket.name, {
    public: !!bucket.public,
    fileSizeLimit: bucket.file_size_limit ?? undefined,
    allowedMimeTypes: Array.isArray(bucket.allowed_mime_types) ? bucket.allowed_mime_types : undefined,
  });

  if (error && !String(error.message || '').includes('already exists')) {
    throw error;
  }
}

async function listObjectsRecursive(client, bucketName, prefix = '') {
  const all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await client.storage.from(bucketName).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      if (!item || !item.name) continue;
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id == null && !item.metadata) {
        const nested = await listObjectsRecursive(client, bucketName, fullPath);
        all.push(...nested);
      } else {
        all.push({
          path: fullPath,
          metadata: item.metadata || {},
        });
      }
    }

    if (data.length < limit) break;
    offset += data.length;
  }

  return all;
}

async function copyStorage({ sourceUrl, sourceKey, targetUrl, targetKey }) {
  if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
    fail(
      'Storage migration requested, but SOURCE_SUPABASE_URL / SOURCE_SUPABASE_SERVICE_KEY / TARGET_SUPABASE_URL / TARGET_SUPABASE_SERVICE_KEY are missing.'
    );
  }

  const source = createClient(sourceUrl, sourceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const target = createClient(targetUrl, targetKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  logStep('Copying Supabase Storage buckets and objects');

  const { data: buckets, error: bucketError } = await source.storage.listBuckets();
  if (bucketError) throw bucketError;

  let copiedBuckets = 0;
  let copiedObjects = 0;

  for (const bucket of buckets || []) {
    await ensureBucket(target, bucket);
    copiedBuckets += 1;
    logInfo(`Bucket: ${bucket.name}`);

    const objects = await listObjectsRecursive(source, bucket.name);
    for (const object of objects) {
      const { data: fileData, error: downloadError } = await source.storage
        .from(bucket.name)
        .download(object.path);

      if (downloadError) throw downloadError;

      const uploadBody = Buffer.from(await fileData.arrayBuffer());
      const { error: uploadError } = await target.storage.from(bucket.name).upload(object.path, uploadBody, {
        upsert: true,
        contentType: fileData.type || object.metadata?.mimetype || 'application/octet-stream',
      });

      if (uploadError) throw uploadError;
      copiedObjects += 1;
    }
  }

  console.log(`\n✅ Storage copy complete: ${copiedBuckets} bucket(s), ${copiedObjects} object(s).`);
}

async function main() {
  const sourceDbUrl = process.env.SOURCE_DB_URL;
  const targetDbUrl = process.env.TARGET_DB_URL;

  if (!sourceDbUrl) fail('SOURCE_DB_URL is required.');
  if (!targetDbUrl) fail('TARGET_DB_URL is required.');

  const schemas = parseList(process.env.MIGRATION_SCHEMAS, ['public']);
  const excludeTables = parseList(process.env.MIGRATION_EXCLUDE_TABLES, []);
  const includeStorage = envBool('MIGRATION_INCLUDE_STORAGE', true);
  const dropExisting = envBool('MIGRATION_DROP_EXISTING', false);

  const pgDumpBinary = ensureBinaryExists('pg_dump');
  const psqlBinary = ensureBinaryExists('psql');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supabase-migrate-'));
  const schemaFile = path.join(tempDir, 'schema.sql');
  const dataFile = path.join(tempDir, 'data.sql');

  logStep('Dumping source schema');
  runCommand(pgDumpBinary, buildPgDumpArgs({
    sourceUrl: sourceDbUrl,
    outputFile: schemaFile,
    schemaOnly: true,
    dataOnly: false,
    schemas,
    dropExisting,
    excludeTables,
  }));
  logInfo(`Schema dump written to ${schemaFile}`);

  logStep('Restoring schema into target database');
  runCommand(psqlBinary, ['--dbname', targetDbUrl, '--file', schemaFile]);

  logStep('Dumping source table data');
  runCommand(pgDumpBinary, buildPgDumpArgs({
    sourceUrl: sourceDbUrl,
    outputFile: dataFile,
    schemaOnly: false,
    dataOnly: true,
    schemas,
    dropExisting: false,
    excludeTables,
  }));
  logInfo(`Data dump written to ${dataFile}`);

  logStep('Restoring table data into target database');
  runCommand(psqlBinary, ['--dbname', targetDbUrl, '--file', dataFile]);

  console.log('\n✅ Database schema + table data migration complete.');

  if (includeStorage) {
    await copyStorage({
      sourceUrl: process.env.SOURCE_SUPABASE_URL,
      sourceKey: process.env.SOURCE_SUPABASE_SERVICE_KEY,
      targetUrl: process.env.TARGET_SUPABASE_URL,
      targetKey: process.env.TARGET_SUPABASE_SERVICE_KEY,
    });
  } else {
    console.log('\nℹ️ Storage copy skipped (MIGRATION_INCLUDE_STORAGE=false).');
  }

  console.log('\nDone.');
  console.log('Notes:');
  console.log('- This tool migrates app schemas/tables through Postgres plus Storage buckets/files through the Supabase API.');
  console.log('- It does not migrate Supabase project-level settings, Edge Functions, or custom auth configuration.');
  console.log('- Running the copy will still read data from the old project, so some source egress can be consumed during the migration itself.');
}

main().catch((error) => {
  console.error('\n❌ Migration failed.');
  console.error(error);
  process.exit(1);
});
