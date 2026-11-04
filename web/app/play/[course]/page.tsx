import Link from 'next/link';
import PracticeClient from './PracticeClient';

export const dynamic = 'force-dynamic';

export default async function PlayPage({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;

  return (
    <>
      <p className="sub">
        <Link href="/">← all courses</Link>
      </p>
      <h1>{course}</h1>
      <PracticeClient course={course} />
    </>
  );
}
