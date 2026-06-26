import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArticleSlugs, getArticle } from "@/lib/db";
import { Markdown } from "@/components/Markdown";

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

  return (
    <article className="article">
      <p className="breadcrumb">
        <Link href="/">Browse</Link> /{" "}
        <Link href={`/category/${article.category_slug}`}>{article.category_name}</Link>
      </p>

      <h1>{article.title}</h1>
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
    </article>
  );
}
