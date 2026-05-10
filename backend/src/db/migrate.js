require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migrations = [
  '001_initial_schema.sql',
  '002_schema_updates.sql',
  '003_phase2_updates.sql',
  '004_tips_to_packages.sql',
  '006_partial_unique_price.sql',
  '007_add_customer_is_active.sql',
];

async function migrate() {
  const client = await pool.connect();
  try {
    for (const filename of migrations) {
      const filePath = path.join(__dirname, 'migrations', filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(` ${filename}`);
    }
    console.log('All migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// TODO: Use a migration tool and a migration table to track which migrations have been run, to support incremental changes later.

migrate();