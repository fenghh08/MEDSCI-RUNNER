import { serveFromRepoRoot } from '@/lib/serve-asset';

export const dynamic = 'force-dynamic';

/** /feedback.html — a single named file from the repo root. */
export async function GET() {
  return serveFromRepoRoot(['feedback.html']);
}
