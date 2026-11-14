import { serveFromRepoRoot } from '@/lib/serve-asset';

export const dynamic = 'force-dynamic';

/** /icons/* — see lib/serve-asset.ts for why this is scoped rather than a catch-all. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  return serveFromRepoRoot(['icons', ...segments]);
}
