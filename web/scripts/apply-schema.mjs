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

// One statement at a time. Splitting on a line-ending semicolon is enough
// for this schema, except inside a dollar-quoted body ($$ ... $$), which has
// its own semicolons -- so those are pulled out first and put back after.
const blocks = [];
const masked = schema.replace(/\$\$[\s\S]*?\$\$/g, (block) => {
  blocks.push(block);
  return `$$BLOCK${blocks.length - 1}$$`;
});

const statements = masked
  .split(/;\s*$/m)
  .map((s) => s.replace(/\$\$BLOCK(\d+)\$\$/g, (_, i) => blocks[Number(i)]).trim())
  .filter((s) => s && !s.split('\n').every((line) => line.trim().startsWith('--')));

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Applied ${statements.length} statements from db/schema.sql.`);
