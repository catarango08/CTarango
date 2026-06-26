import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getCategory, getArticlesByCategory } from "@/lib/db";

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const category = getCategory(params.slug);
  return { title: category ? `${category.name} — Wireman KB` : "Wireman KB" };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const category = getCategory(params.slug);
  if (!category) notFound();

  const articles = getArticlesByCategory(params.slug);

  return (
    <>
      <p className="breadcrumb">
        <Link href="/">Browse</Link> / {category.name}
      </p>
      <section className="hero" style={{ paddingTop: 0 }}>
        <h1>{category.name}</h1>
        <p>{category.description}</p>
      </section>

      <ul className="article-list">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/article/${a.slug}`} className="article-link">
              <h3>{a.title}</h3>
              <p>{a.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
