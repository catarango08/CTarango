import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArticleSlugs, getArticle, getRelatedArticles } from "@/lib/db";
import { Markdown } from "@/components/Markdown";
import { BookmarkButton } from "@/components/BookmarkButton";

export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);
  return {
    title: article ? `${article.title} — Wireman KB` : "Wireman KB",
    description: article?.summary,
  };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);
  if (!article) notFound();

  const tags = article.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const related = getRelatedArticles(article.slug);

  return (
    <article className="article">
      <p className="breadcrumb">
        <Link href="/">Browse</Link> /{" "}
        <Link href={`/category/${article.category_slug}`}>{article.category_name}</Link>
      </p>

      <div className="article-head">
        <h1>{article.title}</h1>
        <BookmarkButton
          slug={article.slug}
          title={article.title}
          summary={article.summary}
          category={article.category_name}
        />
      </div>
      <p className="summary">{article.summary}</p>

      <Markdown source={article.body} />

      {tags.length > 0 && (
        <div className="tags">
          {tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section className="related">
          <h2 className="related-title">Related articles</h2>
          <ul className="related-list">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/article/${r.slug}`}>
                  <span className="related-meta">{r.category_name}</span>
                  <span className="related-name">{r.title}</span>
                  <span className="related-summary">{r.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href={`/quiz/${article.category_slug}`} className="quiz-cta">
        <span className="quiz-cta-icon" aria-hidden>
          ✓
        </span>
        <span>
          <strong>Test yourself on {article.category_name}</strong>
          <br />
          Take the practice quiz for this topic.
        </span>
      </Link>
    </article>
  );
}
