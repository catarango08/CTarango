import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { articles, categories, type Article, type Category } from "@/data/articles";

// ---------------------------------------------------------------------------
// Connection (singleton). In dev, Next reloads modules, so cache on globalThis.
// ---------------------------------------------------------------------------

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "knowledge.db");

declare global {
  // eslint-disable-next-line no-var
  var __wiremanDb: Database.Database | undefined;
}

function openDatabase(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  buildSchema(db);
  seedIfEmpty(db);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__wiremanDb) {
    global.__wiremanDb = openDatabase();
  }
  return global.__wiremanDb;
}

// ---------------------------------------------------------------------------
// Schema + seed
// ---------------------------------------------------------------------------

function buildSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      slug        TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS articles (
      slug          TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      category_slug TEXT NOT NULL REFERENCES categories(slug),
      summary       TEXT NOT NULL,
      tags          TEXT NOT NULL,
      body          TEXT NOT NULL,
      sort_order    INTEGER NOT NULL
    );

    -- Full-text search index over the searchable article fields.
    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
      slug UNINDEXED,
      title,
      summary,
      tags,
      body,
      tokenize = 'porter unicode61'
    );
  `);
}

export function seedDatabase(db: Database.Database): void {
  const insertCategory = db.prepare(
    `INSERT OR REPLACE INTO categories (slug, name, description, sort_order)
     VALUES (@slug, @name, @description, @sort_order)`
  );
  const insertArticle = db.prepare(
    `INSERT OR REPLACE INTO articles (slug, title, category_slug, summary, tags, body, sort_order)
     VALUES (@slug, @title, @category_slug, @summary, @tags, @body, @sort_order)`
  );
  const insertFts = db.prepare(
    `INSERT INTO articles_fts (slug, title, summary, tags, body)
     VALUES (@slug, @title, @summary, @tags, @body)`
  );

  const tx = db.transaction(() => {
    db.exec("DELETE FROM articles_fts; DELETE FROM articles; DELETE FROM categories;");

    categories.forEach((c, i) => {
      insertCategory.run({ ...c, sort_order: i });
    });

    articles.forEach((a, i) => {
      insertArticle.run({
        slug: a.slug,
        title: a.title,
        category_slug: a.categorySlug,
        summary: a.summary,
        tags: a.tags.join(", "),
        body: a.body,
        sort_order: i,
      });
      insertFts.run({
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        tags: a.tags.join(", "),
        body: a.body,
      });
    });
  });

  tx();
}

function seedIfEmpty(db: Database.Database): void {
  const row = db.prepare("SELECT COUNT(*) AS n FROM articles").get() as { n: number };
  if (row.n === 0) {
    seedDatabase(db);
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export type ArticleRow = {
  slug: string;
  title: string;
  category_slug: string;
  category_name: string;
  summary: string;
  tags: string;
  body: string;
};

export type CategoryWithCount = Category & { count: number };

export type RelatedArticle = {
  slug: string;
  title: string;
  category_name: string;
  summary: string;
};

/**
 * Articles related to `slug`, ranked by shared tags (weighted) plus a bonus for
 * sharing a category. Computed from the in-memory content (no SQL needed).
 */
export function getRelatedArticles(slug: string, limit = 4): RelatedArticle[] {
  const target = articles.find((a) => a.slug === slug);
  if (!target) return [];

  const categoryName = (s: string) =>
    categories.find((c) => c.slug === s)?.name ?? s;
  const targetTags = new Set(target.tags);

  const scored = articles
    .filter((a) => a.slug !== slug)
    .map((a) => {
      const sharedTags = a.tags.filter((t) => targetTags.has(t)).length;
      const sameCategory = a.categorySlug === target.categorySlug ? 1 : 0;
      return { a, score: sharedTags * 2 + sameCategory };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);

  return scored.map(({ a }) => ({
    slug: a.slug,
    title: a.title,
    category_name: categoryName(a.categorySlug),
    summary: a.summary,
  }));
}

export type SearchHit = {
  slug: string;
  title: string;
  category_slug: string;
  category_name: string;
  summary: string;
  snippet: string;
};

export function getCategories(): CategoryWithCount[] {
  return getDb()
    .prepare(
      `SELECT c.slug, c.name, c.description,
              COUNT(a.slug) AS count
       FROM categories c
       LEFT JOIN articles a ON a.category_slug = c.slug
       GROUP BY c.slug
       ORDER BY c.sort_order`
    )
    .all() as CategoryWithCount[];
}

export function getCategory(slug: string): Category | undefined {
  return getDb()
    .prepare("SELECT slug, name, description FROM categories WHERE slug = ?")
    .get(slug) as Category | undefined;
}

export function getArticlesByCategory(categorySlug: string): ArticleRow[] {
  return getDb()
    .prepare(
      `SELECT a.slug, a.title, a.category_slug, c.name AS category_name,
              a.summary, a.tags, a.body
       FROM articles a JOIN categories c ON c.slug = a.category_slug
       WHERE a.category_slug = ?
       ORDER BY a.sort_order`
    )
    .all(categorySlug) as ArticleRow[];
}

export function getArticle(slug: string): ArticleRow | undefined {
  return getDb()
    .prepare(
      `SELECT a.slug, a.title, a.category_slug, c.name AS category_name,
              a.summary, a.tags, a.body
       FROM articles a JOIN categories c ON c.slug = a.category_slug
       WHERE a.slug = ?`
    )
    .get(slug) as ArticleRow | undefined;
}

export function getAllArticleSlugs(): string[] {
  return (getDb().prepare("SELECT slug FROM articles").all() as { slug: string }[]).map(
    (r) => r.slug
  );
}

/**
 * Turn raw user input into a safe FTS5 MATCH query. Each whitespace-separated
 * term becomes a prefix match, OR-ed together so partial words still hit.
 */
function toFtsQuery(raw: string): string | null {
  const terms = raw
    .toLowerCase()
    .replace(/["*()]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t}"*`).join(" OR ");
}

export function searchArticles(rawQuery: string): SearchHit[] {
  const match = toFtsQuery(rawQuery);
  if (!match) return [];

  return getDb()
    .prepare(
      `SELECT f.slug, a.title, a.category_slug, c.name AS category_name, a.summary,
              snippet(articles_fts, 4, '<mark>', '</mark>', ' … ', 12) AS snippet
       FROM articles_fts f
       JOIN articles a ON a.slug = f.slug
       JOIN categories c ON c.slug = a.category_slug
       WHERE articles_fts MATCH ?
       ORDER BY bm25(articles_fts, 10.0, 8.0, 6.0, 1.0)
       LIMIT 25`
    )
    .all(match) as SearchHit[];
}
