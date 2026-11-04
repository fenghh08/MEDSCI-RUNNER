'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicQuestion, Verdict } from '@/lib/types';

type Props = { course: string };

export default function PracticeClient({ course }: Props) {
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, asked: 0 });
  const [error, setError] = useState<string | null>(null);

  const loadSet = useCallback(async () => {
    setQuestions(null);
    setIndex(0);
    setVerdict(null);
    setChosen(null);
    setError(null);
    try {
      const response = await fetch(`/api/questions?course=${encodeURIComponent(course)}&limit=10`);
      if (!response.ok) throw new Error(`questions request failed (${response.status})`);
      const body = (await response.json()) as { questions: PublicQuestion[] };
      setQuestions(body.questions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [course]);

  useEffect(() => {
    void loadSet();
  }, [loadSet]);

  async function answer(chosenIndex: number) {
    if (!questions || verdict) return;
    const question = questions[index];
    setChosen(chosenIndex);
    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Once sign-in is wired up, pass the Firebase uid here as playerUid so
        // the attempt lands against the right player in answer_events.
        body: JSON.stringify({ qid: question.qid, chosenIndex }),
      });
      if (!response.ok) throw new Error(`answer request failed (${response.status})`);
      const result = (await response.json()) as Verdict;
      setVerdict(result);
      setScore((s) => ({ right: s.right + (result.correct ? 1 : 0), asked: s.asked + 1 }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setChosen(null);
    }
  }

  function next() {
    setVerdict(null);
    setChosen(null);
    setIndex((i) => i + 1);
  }

  if (error) return <div className="notice">{error}</div>;
  if (!questions) return <p className="sub">Loading…</p>;
  if (questions.length === 0) {
    return <div className="notice">No questions for {course} yet. Run <code>npm run db:import</code>.</div>;
  }

  if (index >= questions.length) {
    return (
      <>
        <p>
          {score.right} / {score.asked} correct.
        </p>
        <button className="primary" onClick={() => void loadSet()}>
          Another ten
        </button>
      </>
    );
  }

  const question = questions[index];

  return (
    <>
      <p className="sub">
        {index + 1} of {questions.length} · {question.topic_icon ?? ''} {question.topic_label}
        {question.class_key ? ` · ${question.class_key}` : ''} · {question.difficulty}
      </p>

      <p style={{ fontSize: 17, margin: '16px 0 20px' }}>{question.prompt}</p>

      {question.options.map((option, i) => {
        // Classes are only applied once the server has graded the attempt, so
        // there is nothing in the pre-answer DOM that gives the answer away.
        const state = !verdict ? '' : i === verdict.correctIndex ? ' correct' : i === chosen ? ' wrong' : '';
        return (
          <button
            key={i}
            className={`option${state}`}
            disabled={Boolean(verdict)}
            onClick={() => void answer(i)}
          >
            {String.fromCharCode(65 + i)}. {option}
          </button>
        );
      })}

      {verdict && (
        <>
          <div className={`verdict ${verdict.correct ? 'correct' : 'wrong'}`}>
            <strong>{verdict.correct ? 'Correct.' : 'Not quite.'}</strong>
            {verdict.explanation ? ` ${verdict.explanation}` : ''}
          </div>
          <button className="primary" onClick={next}>
            {index + 1 === questions.length ? 'See score' : 'Next question'}
          </button>
        </>
      )}
    </>
  );
}
