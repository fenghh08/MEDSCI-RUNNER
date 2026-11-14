import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** A course's lectures: key, title, intro and learning outcomes. */
export const GET = adminRoute('lecturer', (user, request) => store.listClasses(user, String(param(request, 'course'))));
export const POST = adminRoute('lecturer', (user, _request, body) => store.saveClass(user, body));
