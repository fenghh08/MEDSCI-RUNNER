/** What the client is allowed to know about a question. No answer key here. */
export type PublicQuestion = {
  qid: string;
  prompt: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  hashtags: string[];
  course_code: string | null;
  class_key: string | null;
  item_key: string;
  item_label: string;
  topic_key: string;
  topic_label: string;
  topic_icon: string | null;
  topic_color: string | null;
};

/** What /api/answer sends back once the server has graded the attempt. */
export type Verdict = {
  qid: string;
  correct: boolean;
  correctIndex: number;
  explanation: string | null;
};

export type Course = {
  code: string;
  label: string;
  icon: string | null;
  blurb: string | null;
  runnable: boolean;
  topic_count: number;
  question_count: number;
};
