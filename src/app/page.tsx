import Link from "next/link";
import { getCategories } from "@/lib/db";
import { SearchBar } from "@/components/SearchBar";
import { getTotalQuestionCount } from "@/lib/quiz";

export default function HomePage() {
  const categories = getCategories();
  const quizCount = getTotalQuestionCount();

  return (
    <>
      <section className="hero">
        <h1>The Journeyman Wireman&rsquo;s Knowledge Base</h1>
        <p>
          Field-ready reference and exam prep on the National Electrical Code,
          conductors, overcurrent protection, grounding, raceways, motors,
          calculations, and safe work practices. Search it or browse by topic.
        </p>
        <SearchBar />
      </section>

      <Link href="/quiz" className="quiz-banner">
        <span className="quiz-banner-icon" aria-hidden>
          ✓
        </span>
        <span>
          <strong>Studying for the exam?</strong> Take a practice quiz —{" "}
          {quizCount} exam-style questions across every topic.
        </span>
        <span className="quiz-banner-arrow" aria-hidden>
          →
        </span>
      </Link>

      <h2 className="section-title">Browse by topic</h2>
      <div className="card-grid">
        {categories.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`} className="card">
            <h3>{c.name}</h3>
            <p>{c.description}</p>
            <span className="count">
              {c.count} {c.count === 1 ? "article" : "articles"}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
