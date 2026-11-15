import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';
import { loadGameStats } from '@/lib/game-stats';

export const dynamic = 'force-dynamic';

/** One item with its questions (answers included: this is the editor). */
export const GET = adminRoute('lecturer', async (user, request) =>
  store.getItem(user, Number(param(request, 'id')), { gameStats: await loadGameStats() }));

/** { action: 'save', ...fields } creates or updates; { action: 'remove', id } removes the item and its questions. */
export const POST = adminRoute('lecturer', (user, _request, body) =>
  body.action === 'remove' ? store.removeItem(user, Number(body.id)) : store.saveItem(user, body));
