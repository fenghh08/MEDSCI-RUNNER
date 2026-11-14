import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** Player reports and suggestions waiting for someone to act on them. */
export const GET = adminRoute('lecturer', (user, request) => store.listSuggestions(user, param(request, 'status') ?? 'open'));
export const POST = adminRoute('lecturer', (user, _request, body) =>
  store.resolveSuggestion(user, Number(body.id), String(body.status)));
