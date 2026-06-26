import Link from "next/link";
import { getQuizCategories, getTotalQuestionCount } from "@/lib/quiz";

export const metadata = { title: "Practice Quizzes — Wireman KB" };

export default function QuizIndexPage() {
  const categories = getQuizCategories();
  const total = getTotalQuestionCount();

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">Browse</Link> / Practice Quizzes
      </p>
      <section className="hero" style={{ paddingTop: 0 }}>
        <h1>Practice Quizzes</h1>
        <p>
          Test yourself by topic with {total} exam-style questions. Each answer
          links back to the article that explains it. Aim for 70% or better —
          roughly the journeyman passing line.
        </p>
      </section>

      <div className="card-grid">
        {categories.map((c) => (
          <Link key={c.slug} href={`/quiz/${c.slug}`} className="card">
            <h3>{c.name}</h3>
            <p>{c.description}</p>
            <span className="count">
              {c.count} {c.count === 1 ? "question" : "questions"}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
