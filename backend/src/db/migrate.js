require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { promisify } = require('util');
const { readSecret } = require('../config/secrets');
const readdir = promisify(fs.readdir);

// Retry configuration
const RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000; // base delay, exponential backoff

async function createMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const res = await client.query('SELECT migration_name FROM schema_migrations');
  return new Set(res.rows.map(row => row.migration_name));
}

async function migrate() {
  const dbPassword = readSecret('DB_PASSWORD_FILE', 'DB_PASSWORD');

  const pool = new Pool({
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    idleTimeoutMillis: 30000,
    max: 1,
    password: dbPassword,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
  });

  try {
    await waitForDatabase(pool);
    const client = await pool.connect();
    try {
      await createMigrationsTable(client);
      const applied = await getAppliedMigrations(client);

      const migrationsDir = path.join(__dirname, 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        throw new Error(`Migrations directory not found: ${migrationsDir}`);
      }

      const files = await readdir(migrationsDir);
      const sqlFiles = files
          .filter(f => f.endsWith('.sql'))
          .sort(); // alphanumeric sort works for timestamp format

      for (const file of sqlFiles) {
        if (applied.has(file)) {
          console.log(`Skipping already applied: ${file}`);
          continue;
        }
        const filePath = path.join(migrationsDir, file);
        await runMigration(client, filePath, file);
      }
      console.log('All migrations completed successfully.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function runMigration(client, filePath, fileName) {
  console.log(`Applying migration: ${fileName}`);
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [fileName]);
    await client.query('COMMIT');
    console.log(`Applied: ${fileName}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed migration ${fileName}:`, err);
    throw err;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForDatabase(pool, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established');
      return;
    } catch (err) {
      const delay = RETRY_DELAY_MS * Math.pow(2, i);
      console.log(`Database not ready (attempt ${i + 1}/${attempts}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Could not connect to database after multiple attempts');
}

// Run
migrate();