import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** The quiz-quality audit and answer statistics for one course. */
export const GET = adminRoute('lecturer', (user, request) => store.analytics(user, String(param(request, 'course'))));
