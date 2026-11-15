import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';
import { loadGameStats } from '@/lib/game-stats';

export const dynamic = 'force-dynamic';

/** Usage, where students struggle, and what is missing, for one course. */
export const GET = adminRoute('lecturer', async (user, request) =>
  store.insights(user, String(param(request, 'course')), { gameStats: await loadGameStats() }));
