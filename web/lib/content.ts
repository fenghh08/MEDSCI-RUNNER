import { sql } from '@/lib/db';
import { makeStore } from '@/lib/content-store.mjs';

/** The admin write layer, bound to the live database. See content-store.mjs. */
export const store = makeStore(sql);
