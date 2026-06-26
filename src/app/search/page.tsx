import Link from "next/link";
import { searchArticles } from "@/lib/db";
import { SearchBar } from "@/components/SearchBar";

export const metadata = { title: "Search — Wireman KB" };

// Article bodies are trusted, in-repo content, so the <mark> tags that SQLite's
// snippet() inserts are safe to render. (No user-authored HTML is stored.)
export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = (searchParams.q ?? "").trim();
  const results = query ? searchArticles(query) : [];

  return (
    <>
      <section className="hero">
        <h1>Search</h1>
        <p>Search across every article — titles, summaries, tags, and full text.</p>
        <SearchBar initialValue={query} autoFocus />
      </section>

      {query === "" ? (
        <p className="empty">Type a term above to search the knowledge base.</p>
      ) : results.length === 0 ? (
        <p className="empty">
          No results for <strong>“{query}”</strong>. Try a different or broader term.
        </p>
      ) : (
        <>
          <h2 className="section-title">
            {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;
            {query}&rdquo;
          </h2>
          <div>
            {results.map((r) => (
              <div key={r.slug} className="result">
                <p className="meta">{r.category_name}</p>
                <h3>
                  <Link href={`/article/${r.slug}`}>{r.title}</Link>
                </h3>
                <p
                  className="snippet"
                  dangerouslySetInnerHTML={{
                    __html: r.snippet || r.summary,
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
