import { adminRoute, param } from '@/lib/admin-route';
import { store } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** Lecturers and admins, and which courses each lecturer may edit. Admin only. */
export const GET = adminRoute('admin', (user) => store.listUsers(user));
export const POST = adminRoute('admin', (user, _request, body) => store.setUser(user, body));
