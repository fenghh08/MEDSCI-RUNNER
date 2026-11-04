import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import type { Verdict } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/answer  { qid, chosenIndex, playerUid?, roomId? }
 *
 * The whole point of the website version: the browser never holds the answer
 * key, so it has to ask the server whether it got the question right. The
 * verdict comes back with the explanation attached, which is also the moment
 * the client is allowed to see it.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'expected a JSON body' }, { status: 400 });
  }

  const { qid, chosenIndex, playerUid, roomId } = (body ?? {}) as Record<string, unknown>;

  if (typeof qid !== 'string' || !qid) {
    return NextResponse.json({ error: 'qid is required' }, { status: 400 });
  }
  if (typeof chosenIndex !== 'number' || !Number.isInteger(chosenIndex) || chosenIndex < 0) {
    return NextResponse.json({ error: 'chosenIndex must be a non-negative integer' }, { status: 400 });
  }

  const rows = (await sql`
    select correct_index, explanation, array_length(options, 1) as option_count
      from questions
     where qid = ${qid}`) as {
      correct_index: number; explanation: string | null; option_count: number;
    }[];

  const question = rows[0];
  if (!question) {
    return NextResponse.json({ error: 'no such question' }, { status: 404 });
  }
  if (chosenIndex >= question.option_count) {
    return NextResponse.json({ error: 'chosenIndex is out of range' }, { status: 400 });
  }

  const correct = chosenIndex === question.correct_index;

  // Recorded for the review/spaced-repetition features; a missing uid just
  // means an anonymous attempt, which is still worth counting for the room.
  await sql`
    insert into answer_events (player_uid, question_qid, chosen_index, was_correct, room_id)
    values (${typeof playerUid === 'string' ? playerUid : null}, ${qid},
            ${chosenIndex}, ${correct}, ${typeof roomId === 'string' ? roomId : null})`;

  const verdict: Verdict = {
    qid,
    correct,
    correctIndex: question.correct_index,
    explanation: question.explanation,
  };
  return NextResponse.json(verdict);
}
