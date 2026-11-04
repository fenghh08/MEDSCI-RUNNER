import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Grades exactly one answer.
 *
 * This is the only place the answer key leaves the database, and it only
 * leaves for a question the player has already committed to. Two shapes:
 *
 *   { qid, chosenIndex, optionOrder?, sessionId?, playerUid?, roomId? }
 *   { funFactId, chosenIndex, sessionId? }
 *
 * chosenIndex is a position in what the player was shown. The game shuffles
 * options per serve and sends the shuffle as optionOrder (shown -> authored),
 * so grading happens in authored terms and correctIndex comes back authored
 * too; the client maps it back. chosenIndex -1 means the timer ran out.
 */

// How many times one browser may answer the same question in this window.
// Set below the option count so nobody can simply walk every option: with
// four options you get two tries, never enough to find the answer by
// elimination. Honest limits: sessionId is client-supplied, so this is a
// speed bump, not an authorisation check. A determined person with a script
// can still rotate it — binding attempts to a Firebase uid, once sign-in is
// required, is what would make it airtight.
const ATTEMPT_WINDOW = '10 minutes';
const MAX_ATTEMPTS_PER_QUESTION = 2;

type Body = {
  qid?: unknown; funFactId?: unknown; chosenIndex?: unknown;
  optionOrder?: unknown; sessionId?: unknown; playerUid?: unknown; roomId?: unknown;
};

const text = (v: unknown) => (typeof v === 'string' && v ? v : null);

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'expected a JSON body' }, { status: 400 });
  }

  const chosenIndex = body.chosenIndex;
  if (typeof chosenIndex !== 'number' || !Number.isInteger(chosenIndex) || chosenIndex < -1) {
    return NextResponse.json({ error: 'chosenIndex must be an integer, or -1 for a timeout' }, { status: 400 });
  }

  const qid = text(body.qid);
  const funFactId = text(body.funFactId);
  if (!qid === !funFactId) {
    return NextResponse.json({ error: 'send exactly one of qid or funFactId' }, { status: 400 });
  }

  const sessionId = text(body.sessionId);
  const playerUid = text(body.playerUid);
  const roomId = text(body.roomId);

  // ---- look up the key -------------------------------------------------
  const rows = (qid
    ? await sql`select correct_index, explanation, array_length(options, 1) as option_count
                  from questions where qid = ${qid}`
    : await sql`select correct_index, explanation, array_length(options, 1) as option_count
                  from fun_fact_questions where qid = ${funFactId}`) as {
      correct_index: number; explanation: string | null; option_count: number;
    }[];

  const question = rows[0];
  if (!question) return NextResponse.json({ error: 'no such question' }, { status: 404 });

  // ---- map the shuffle back to authored order --------------------------
  let authoredChoice = chosenIndex;
  if (chosenIndex >= 0 && Array.isArray(body.optionOrder)) {
    const order = body.optionOrder as unknown[];
    if (order.length !== question.option_count) {
      return NextResponse.json({ error: 'optionOrder does not match this question' }, { status: 400 });
    }
    const mapped = order[chosenIndex];
    if (typeof mapped !== 'number' || !Number.isInteger(mapped) || mapped < 0 || mapped >= question.option_count) {
      return NextResponse.json({ error: 'optionOrder is not a valid permutation' }, { status: 400 });
    }
    authoredChoice = mapped;
  }
  if (authoredChoice >= question.option_count) {
    return NextResponse.json({ error: 'chosenIndex is out of range' }, { status: 400 });
  }

  // ---- attempt limit ---------------------------------------------------
  // Only for real questions: the grenade's fun-fact pool is a pass/fail gate
  // on a hit, and rate-limiting it would punish the player being attacked.
  if (qid && sessionId) {
    const [{ attempts }] = (await sql`
      select count(*)::int as attempts
        from answer_events
       where session_id = ${sessionId}
         and question_qid = ${qid}
         and answered_at > now() - ${ATTEMPT_WINDOW}::interval`) as { attempts: number }[];
    if (attempts >= MAX_ATTEMPTS_PER_QUESTION) {
      return NextResponse.json({ error: 'too many attempts at this question' }, { status: 429 });
    }
  }

  // A timeout is recorded, and is never correct.
  const correct = chosenIndex >= 0 && authoredChoice === question.correct_index;

  await sql`
    insert into answer_events (player_uid, session_id, question_qid, fun_fact_qid,
                               chosen_index, was_correct, room_id)
    values (${playerUid}, ${sessionId}, ${qid}, ${funFactId},
            ${chosenIndex}, ${correct}, ${roomId})`;

  return NextResponse.json({
    qid: qid ?? funFactId,
    correct,
    correctIndex: question.correct_index, // authored position
    explanation: question.explanation,
  });
}
