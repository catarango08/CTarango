import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getQuizCategories,
  getQuizCategory,
  getQuestionsByCategory,
} from "@/lib/quiz";
import { QuizRunner } from "@/components/QuizRunner";

export function generateStaticParams() {
  return getQuizCategories().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const category = getQuizCategory(params.slug);
  return {
    title: category ? `${category.name} Quiz — Wireman KB` : "Quiz — Wireman KB",
  };
}

export default function QuizCategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = getQuizCategory(params.slug);
  if (!category) notFound();

  const questions = getQuestionsByCategory(params.slug);

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">Browse</Link> / <Link href="/quiz">Quizzes</Link> /{" "}
        {category.name}
      </p>
      <section className="hero" style={{ paddingTop: 0, marginBottom: 24 }}>
        <h1>{category.name} Quiz</h1>
        <p>{category.description}</p>
      </section>

      <QuizRunner questions={questions} categorySlug={category.slug} />
    </>
  );
}
