import { serveFromRepoRoot } from '@/lib/serve-asset';

export const dynamic = 'force-dynamic';

/** /vendor/* — third-party libraries the game loads at run time (Three.js for the 3D battle view). */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  return serveFromRepoRoot(['vendor', ...segments]);
}
