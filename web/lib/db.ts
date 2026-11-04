import { neon } from '@neondatabase/serverless';

// DATABASE_URL is server-only on purpose — no NEXT_PUBLIC_ prefix, so Next
// will refuse to bundle it into anything the browser downloads.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and paste the ' +
    'pooled connection string from your Neon project.'
  );
}

export const sql = neon(url);
