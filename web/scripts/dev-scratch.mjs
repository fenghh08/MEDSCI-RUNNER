// Runs `next dev` against a scratch Neon branch, signed in as a local admin.
//
//   node scripts/dev-scratch.mjs --endpoint ep-xxxx-xxxx-xxxxxxxx [--port 4090]
//
// For working on /admin without touching live content and without a Firebase
// service account. Takes DATABASE_URL from .env.local and swaps only the
// endpoint (a branch keeps its parent's roles), sets ADMIN_DEV_USER, and makes
// sure a row exists for that user so the audit trail has someone to name.
import { spawn } from 'node:child_process';
import { neon } from '@neondatabase/serverless';
import { loadEnv } from './env.mjs';

loadEnv();
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const endpoint = arg('--endpoint', null);
const port = arg('--port', '4090');
const ENDPOINT = /ep-[a-z]+-[a-z]+-[a-z0-9]+/;
const live = process.env.DATABASE_URL ?? '';
if (!endpoint || !ENDPOINT.test(endpoint) || !ENDPOINT.test(live) || live.match(ENDPOINT)[0] === endpoint) {
  console.error('Pass --endpoint <scratch branch endpoint id>. It must not be the live endpoint.');
  process.exit(1);
}
const url = live.replace(ENDPOINT, endpoint);
const email = 'dev@local.invalid';
await neon(url)`insert into users (uid, email, display_name, role) values (${'dev:' + email}, ${email}, 'Local developer', 'admin')
                on conflict (uid) do nothing`;
const child = spawn('npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url, ADMIN_DEV_USER: email },
});
child.on('exit', (code) => process.exit(code ?? 0));
