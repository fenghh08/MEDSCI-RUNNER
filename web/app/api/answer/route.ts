import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { noteActivity } from '@/lib/keepalive';

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
  noteActivity();
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

  // ---- one round trip ---------------------------------------------------
  // Look up the key, count recent attempts, and record this one, in a single
  // statement. This used to be three awaited queries; the Neon HTTP driver
  // makes a fresh request per query, so from Sydney that was three round trips
  // on every click and the question card sat frozen for all of them.
  //
  // The option-order mapping has to happen before the insert knows whether the
  // answer was right, so it happens here in SQL: `authored` is the chosen
  // position translated through optionOrder, and the statement checks it
  // against the real option count rather than trusting the client.
  const order = Array.isArray(body.optionOrder) ? (body.optionOrder as unknown[]) : null;
  const orderOk = order?.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0) ?? true;
  if (!orderOk) {
    return NextResponse.json({ error: 'optionOrder is not a valid permutation' }, { status: 400 });
  }
  const orderInts = (order ?? []) as number[];

  const rows = (qid
    ? await sql`
        with q as (
          select correct_index, explanation, array_length(options, 1) as option_count
            from questions where qid = ${qid}
        ),
        choice as (
          select q.*,
                 case
                   when ${chosenIndex} < 0 then -1
                   when ${orderInts.length} = 0 then ${chosenIndex}
                   when ${orderInts.length} <> q.option_count then null
                   else (${orderInts}::int[])[${chosenIndex} + 1]
                 end as authored
            from q
        ),
        graded as (
          select *, (authored is not null and authored >= 0 and authored = correct_index) as correct
            from choice
        ),
        att as (
          select count(*)::int as n from answer_events
           where session_id = ${sessionId}
             and question_qid = ${qid}
             and answered_at > now() - ${ATTEMPT_WINDOW}::interval
        ),
        ins as (
          insert into answer_events (player_uid, session_id, question_qid,
                                     chosen_index, was_correct, room_id)
          select ${playerUid}, ${sessionId}, ${qid}, ${chosenIndex}, g.correct, ${roomId}
            from graded g, att
           where (${sessionId}::text is null or att.n < ${MAX_ATTEMPTS_PER_QUESTION})
             and (g.authored is not null or ${chosenIndex} < 0)
             and (g.authored is null or g.authored < g.option_count)
          returning 1
        )
        select g.correct_index, g.explanation, g.option_count, g.authored, g.correct,
               att.n as attempts, (select count(*)::int from ins) as recorded
          from graded g, att`
    : await sql`
        with q as (
          select correct_index, explanation, array_length(options, 1) as option_count
            from fun_fact_questions where qid = ${funFactId}
        ),
        choice as (
          select q.*,
                 case
                   when ${chosenIndex} < 0 then -1
                   when ${orderInts.length} = 0 then ${chosenIndex}
                   when ${orderInts.length} <> q.option_count then null
                   else (${orderInts}::int[])[${chosenIndex} + 1]
                 end as authored
            from q
        ),
        graded as (
          select *, (authored is not null and authored >= 0 and authored = correct_index) as correct
            from choice
        ),
        ins as (
          insert into answer_events (player_uid, session_id, fun_fact_qid,
                                     chosen_index, was_correct, room_id)
          select ${playerUid}, ${sessionId}, ${funFactId}, ${chosenIndex}, g.correct, ${roomId}
            from graded g
           where g.authored is null or g.authored < g.option_count
          returning 1
        )
        -- The grenade's trivia pool is exempt from the attempt limit: it is a
        -- pass/fail gate on being hit, and rate-limiting it would punish the
        -- player under attack.
        select g.correct_index, g.explanation, g.option_count, g.authored, g.correct,
               0 as attempts, (select count(*)::int from ins) as recorded
          from graded g`) as {
      correct_index: number; explanation: string | null; option_count: number;
      authored: number | null; correct: boolean; attempts: number; recorded: number;
    }[];

  const question = rows[0];
  if (!question) return NextResponse.json({ error: 'no such question' }, { status: 404 });

  if (question.authored === null) {
    return NextResponse.json({ error: 'optionOrder does not match this question' }, { status: 400 });
  }
  if (question.authored >= question.option_count) {
    return NextResponse.json({ error: 'chosenIndex is out of range' }, { status: 400 });
  }
  if (!question.recorded && qid && sessionId) {
    return NextResponse.json({ error: 'too many attempts at this question' }, { status: 429 });
  }

  const correct = question.correct;

  return NextResponse.json({
    qid: qid ?? funFactId,
    correct,
    correctIndex: question.correct_index, // authored position
    explanation: question.explanation,
  });
}
