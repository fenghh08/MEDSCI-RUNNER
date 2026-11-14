import { serveFromRepoRoot } from '@/lib/serve-asset';

export const dynamic = 'force-dynamic';

/** /battle3d.js — the 3D view for Cell Battle, imported by the game when a battle starts. It holds no answers. */
export async function GET() {
  return serveFromRepoRoot(['battle3d.js']);
}
