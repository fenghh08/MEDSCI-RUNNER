import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import type { PublicQuestion } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;

/**
 * GET /api/questions?course=MEDS3003&topic=carTCellTherapy&class=L19&difficulty=hard&limit=10
 *
 * Reads the public_questions view, which has no correct_index and no
 * explanation column — so there is no way for this handler to leak the answer
 * key even by accident. Grading is /api/answer's job.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const course = params.get('course');
  const topic = params.get('topic');
  const classKey = params.get('class');
  const difficulty = params.get('difficulty');
  const limit = Math.min(Number(params.get('limit') ?? 10) || 10, MAX_LIMIT);

  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json({ error: 'unknown difficulty' }, { status: 400 });
  }

  const rows = (await sql`
    select qid, prompt, options, difficulty, hashtags, course_code, class_key,
           item_key, item_label, topic_key, topic_label, topic_icon, topic_color
      from public_questions
     where (${course}::text     is null or course_code = ${course})
       and (${topic}::text      is null or topic_key   = ${topic})
       and (${classKey}::text   is null or class_key   = ${classKey})
       and (${difficulty}::text is null or difficulty  = ${difficulty})
     order by random()
     limit ${limit}`) as PublicQuestion[];

  return NextResponse.json({ questions: rows });
}
