import { serveFromRepoRoot } from '@/lib/serve-asset';

export const dynamic = 'force-dynamic';

/** /maps/* — the real-street Cell Battle maps (built from OpenStreetMap by scripts/build-battle-maps.mjs). */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  return serveFromRepoRoot(['maps', ...segments]);
}
