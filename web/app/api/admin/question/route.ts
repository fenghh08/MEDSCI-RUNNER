import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/**
 * { action: 'check' }  validate and look for near-duplicates, write nothing
 * { action: 'save' }   create (no qid) or update (qid)
 * { action: 'remove' } remove by qid
 */
export const POST = adminRoute('lecturer', (user, _request, body) => {
  if (body.action === 'remove') return store.removeQuestion(user, String(body.qid));
  return store.saveQuestion(user, body, { dryRun: body.action === 'check' });
});
