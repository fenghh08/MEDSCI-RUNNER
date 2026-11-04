import Link from 'next/link';
import { sql } from '@/lib/db';
import type { Course } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function loadCourses(): Promise<{ courses: Course[]; error: string | null }> {
  try {
    const courses = (await sql`
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
    return { courses, error: null };
  } catch (cause) {
    return { courses: [], error: cause instanceof Error ? cause.message : String(cause) };
  }
}

export default async function HomePage() {
  const { courses, error } = await loadCourses();

  return (
    <>
      <h1>Medsci Runner — study site</h1>
      <p className="sub">
        Same question bank as the game, served from Postgres. Answers are checked on the
        server, so nothing in this page&apos;s source tells you which option is right.
      </p>

      {error && (
        <div className="notice" style={{ marginTop: 24 }}>
          <strong>No database yet.</strong>
          <p style={{ margin: '8px 0 0' }}>
            Copy <code>.env.example</code> to <code>.env.local</code>, paste your Neon
            connection string, then run <code>npm run db:schema</code> and{' '}
            <code>npm run db:import</code>.
          </p>
          <p style={{ margin: '8px 0 0', opacity: 0.7 }}>{error}</p>
        </div>
      )}

      {courses.length > 0 && (
        <>
          <h2>COURSES</h2>
          <div className="grid">
            {courses.map((course) => (
              <Link key={course.code} className="card" href={`/play/${course.code}`}>
                <div>
                  {course.icon ? `${course.icon} ` : ''}
                  <strong>{course.code}</strong>
                </div>
                <div className="sub">{course.label}</div>
                <div className="sub" style={{ marginTop: 6 }}>
                  {course.topic_count} topics · {course.question_count} questions
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
