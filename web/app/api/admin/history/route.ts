import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** Who changed what, newest first. Filter by ?entity=&key= for one thing, or ?course= for a course. */
export const GET = adminRoute('lecturer', (user, request) =>
  store.revisions(user, { entity: param(request, 'entity'), key: param(request, 'key'), course: param(request, 'course') }));

/** { id } puts back what was there before that change. */
export const POST = adminRoute('lecturer', (user, _request, body) => store.revert(user, Number(body.id)));
