import { articles, categories } from "@/data/articles";

// Builds a compact catalog of the knowledge base so the troubleshooter can
// cite relevant articles by title. Kept small (titles + summaries only) so it
// stays a stable, cacheable prefix in the system prompt.
export function buildKbCatalog(): string {
  const byCategory = categories.map((c) => {
    const items = articles
      .filter((a) => a.categorySlug === c.slug)
      .map((a) => `  - "${a.title}" — ${a.summary} [/article/${a.slug}]`)
      .join("\n");
    return `${c.name}:\n${items}`;
  });
  return byCategory.join("\n\n");
}
