import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** Every course, topic and item, with question counts. The admin page's left-hand tree. */
export const GET = adminRoute('lecturer', (user) => store.tree(user));
