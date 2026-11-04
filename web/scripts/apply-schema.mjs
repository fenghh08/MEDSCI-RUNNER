// Applies db/schema.sql to the Neon database in DATABASE_URL.
// Re-runnable: every statement is CREATE ... IF NOT EXISTS or CREATE OR REPLACE.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { loadEnv } from './env.mjs';

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}

const sql = neon(url);
const schema = await readFile(fileURLToPath(new URL('../db/schema.sql', import.meta.url)), 'utf8');

// neon()'s tagged-template form is one statement at a time, so split on the
// statement terminator at end of line. The schema deliberately contains no
// semicolons inside string literals or function bodies, which keeps this safe.
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s && !s.split('\n').every((line) => line.trim().startsWith('--')));

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Applied ${statements.length} statements from db/schema.sql.`);
