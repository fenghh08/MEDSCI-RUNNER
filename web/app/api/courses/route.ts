import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Course } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = (await sql`
    select c.code, c.label, c.icon, c.blurb, c.runnable,
           count(distinct t.id)::int as topic_count,
           count(q.id)::int          as question_count
      from courses c
      left join topics    t on t.course_code = c.code
      left join items     i on i.topic_id = t.id
      left join questions q on q.item_id = i.id
     group by c.code, c.label, c.icon, c.blurb, c.runnable, c.position
     having count(q.id) > 0
     order by c.position`) as Course[];

  return NextResponse.json({ courses: rows });
}
