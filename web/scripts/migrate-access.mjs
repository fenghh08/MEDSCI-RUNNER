// Moves who-may-edit out of Firebase and into Postgres.
//
//   npm run db:migrate-access -- --dry
//   npm run db:migrate-access
//   npm run db:migrate-access -- --grant-admin someone@example.com
//
// The dev tool kept two lists in the Realtime Database, gated by access codes
// that were plain text in the page source:
//
//   adminAccess/<email with . as ,>   { name, email, createdAt, createdBy }
//   ucAccess/<6-CHAR CODE>            { name, email, courses:{code:true}, active }
//
// Those become rows in `users` and `user_courses`, where the server reads them
// after verifying a Firebase ID token. The RTDB nodes are left in place: the
// dev tool still reads them until it is retired.
//
// A wrinkle worth knowing: these lists are keyed by EMAIL, but `users` is
// keyed by Firebase uid, which only exists once someone has signed in. So a
// row is written with a placeholder uid of `email:<address>`, and lib/auth.ts
// claims it on that person's first real sign-in. Nobody has to sign in before
// being granted access.
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { loadEnv } from './env.mjs';

loadEnv();

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const grantFlag = args.indexOf('--grant-admin');
const grantAdmin = grantFlag >= 0 ? (args[grantFlag + 1] ?? '').toLowerCase().trim() : null;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}
const sql = neon(url);

const placeholder = (email) => `email:${email}`;

async function upsert({ email, name, role, courses = [] }) {
  const uid = placeholder(email);
  if (dry) return;
  await sql`
    insert into users (uid, email, display_name, role)
    values (${uid}, ${email}, ${name ?? null}, ${role})
    on conflict (email) do update set
      display_name = coalesce(excluded.display_name, users.display_name),
      -- never demote: an admin who also appears in the lecturer list stays admin
      role = case when users.role = 'admin' then users.role else excluded.role end`;
  const [row] = await sql`select uid from users where email = ${email}`;
  for (const course of courses) {
    await sql`
      insert into user_courses (uid, course_code) values (${row.uid}, ${course})
      on conflict do nothing`;
  }
}

// --------------------------------------------------- bootstrap a single admin
if (grantAdmin) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(grantAdmin)) {
    console.error(`"${grantAdmin}" does not look like an email address.`);
    process.exit(1);
  }
  await upsert({ email: grantAdmin, name: null, role: 'admin' });
  console.log(dry ? `Would grant admin to ${grantAdmin}.` : `Granted admin to ${grantAdmin}.`);
  console.log('They get it on their next sign-in; no need to sign in first.');
  process.exit(0);
}

// ------------------------------------------------------- read the RTDB lists
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not set, so the Firebase lists cannot be read.');
  console.error('Either set it (see .env.example), or bootstrap by hand:');
  console.error('  npm run db:migrate-access -- --grant-admin you@example.com');
  process.exit(1);
}

const credentials = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
const { initializeApp, cert } = await import('firebase-admin/app');
const { getDatabase } = await import('firebase-admin/database');

const app = initializeApp({
  credential: cert(credentials),
  databaseURL: process.env.FIREBASE_DATABASE_URL
    ?? 'https://runner-9b11b-default-rtdb.asia-southeast1.firebasedatabase.app',
});
const db = getDatabase(app);

const adminSnap = await db.ref('adminAccess').get();
const ucSnap = await db.ref('ucAccess').get();

const admins = Object.values(adminSnap.val() ?? {});
const lecturers = Object.values(ucSnap.val() ?? {});

console.log(`Firebase: ${admins.length} admin(s), ${lecturers.length} lecturer code(s)\n`);

let n = 0;
for (const a of admins) {
  const email = String(a?.email ?? '').toLowerCase().trim();
  if (!email) continue;
  console.log(`  admin     ${email.padEnd(34)} ${a?.name ?? ''}`);
  await upsert({ email, name: a?.name, role: 'admin' });
  n++;
}
for (const u of lecturers) {
  const email = String(u?.email ?? '').toLowerCase().trim();
  if (!email) continue;
  if (u?.active === false) { console.log(`  (skipped, inactive) ${email}`); continue; }
  const courses = Object.keys(u?.courses ?? {});
  console.log(`  lecturer  ${email.padEnd(34)} ${u?.name ?? ''}  [${courses.join(', ') || 'no courses'}]`);
  await upsert({ email, name: u?.name, role: 'lecturer', courses });
  n++;
}

console.log(dry ? `\n--dry: nothing written (${n} would be).` : `\nWrote ${n} user(s).`);
console.log('Each is claimed by uid on their first sign-in.');
process.exit(0);
