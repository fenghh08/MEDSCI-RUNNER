import { serveFromRepoRoot } from '@/lib/serve-asset';

export const dynamic = 'force-dynamic';

/** /feedback-questions.js — a single named file from the repo root. */
export async function GET() {
  return serveFromRepoRoot(['feedback-questions.js']);
}
