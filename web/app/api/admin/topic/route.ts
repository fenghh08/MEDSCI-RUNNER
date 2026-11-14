import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** Create (course + label) or rename (id) a topic. */
export const POST = adminRoute('lecturer', (user, _request, body) => store.saveTopic(user, body));
