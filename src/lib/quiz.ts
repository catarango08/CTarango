import { questions, type Question } from "@/data/quiz";
import { categories, type Category } from "@/data/articles";

export type QuizCategory = Category & { count: number };

/** Categories that have at least one practice question, with question counts. */
export function getQuizCategories(): QuizCategory[] {
  return categories
    .map((c) => ({
      ...c,
      count: questions.filter((q) => q.categorySlug === c.slug).length,
    }))
    .filter((c) => c.count > 0);
}

export function getQuizCategory(slug: string): QuizCategory | undefined {
  return getQuizCategories().find((c) => c.slug === slug);
}

export function getQuestionsByCategory(categorySlug: string): Question[] {
  return questions.filter((q) => q.categorySlug === categorySlug);
}

export function getTotalQuestionCount(): number {
  return questions.length;
}

export type { Question };
