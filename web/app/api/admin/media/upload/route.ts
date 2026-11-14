import { NextResponse, type NextRequest } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireRole, AuthError } from '@/lib/auth';
import { LIMITS } from '@/lib/media-rules.mjs';

export const dynamic = 'force-dynamic';

/**
 * Hands the browser a short-lived token to send ONE file straight to blob
 * storage. Files go direct because a serverless function cannot accept a body
 * larger than a few megabytes -- and a model or a clip is bigger than that.
 *
 * The token carries the limits: which content types, and how many bytes.
 * Storage enforces them, so an oversized or mistyped upload is refused before
 * it is stored. What the file actually contains is checked afterwards, by
 * /api/admin/media, before any question can point at it.
 *
 * Without BLOB_READ_WRITE_TOKEN this answers 503 and the admin page offers
 * links and PDB ids only, which need no storage at all.
 */
export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'File uploads are not set up on this server (no BLOB_READ_WRITE_TOKEN). Use a link or a PDB id instead.' }, { status: 503 });
  }
  let body: HandleUploadBody;
  try { body = (await request.json()) as HandleUploadBody; }
  catch { return NextResponse.json({ error: 'not valid JSON' }, { status: 400 }); }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Only this step is called by a person. The completion callback comes
        // from storage itself and is verified by its signature instead.
        await requireRole(request, 'lecturer');
        const isModel = pathname.toLowerCase().endsWith('.glb');
        const rule = isModel ? LIMITS.model : LIMITS.video;
        if (!rule.extensions.some((e) => pathname.toLowerCase().endsWith(e))) {
          throw new Error('Only .glb, .mp4 and .webm files can be uploaded.');
        }
        return {
          // Browsers often report a .glb as application/octet-stream.
          allowedContentTypes: isModel ? [...rule.types, 'application/octet-stream'] : rule.types,
          maximumSizeInBytes: rule.maxBytes,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => { /* the row is created by /api/admin/media, after the content check */ },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'upload refused' }, { status: 400 });
  }
}
