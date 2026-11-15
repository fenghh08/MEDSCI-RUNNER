import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** Usage, where students struggle, and what is missing, for one course. */
export const GET = adminRoute('lecturer', (user, request) => store.insights(user, String(param(request, 'course'))));
