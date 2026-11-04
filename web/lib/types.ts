/** What /api/answer sends back once the server has graded one attempt. */
export type Verdict = {
  qid: string;
  correct: boolean;
  /** Position in the AUTHORED option order; the client maps it back. */
  correctIndex: number;
  explanation: string | null;
};
