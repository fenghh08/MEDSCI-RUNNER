// Minimal .env.local reader, so the scripts can run under plain `node` without
// pulling in dotenv. Next.js loads .env.local itself at runtime; this is only
// for the command-line scripts.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const path = fileURLToPath(new URL(`../${name}`, import.meta.url));
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue; // a real env var always wins
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
}
