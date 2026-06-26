# Wireman KB

A searchable knowledge base application for **licensed journeyman wiremen**.
Field reference and exam prep covering the National Electrical Code, conductors,
overcurrent protection, grounding & bonding, raceways & boxes, motors & controls,
load/voltage-drop calculations, and electrical safe work practices.

> ⚠️ For study and reference only. Code values change between NEC cycles and are
> amended locally. Always verify against the NEC edition adopted in your
> jurisdiction and the manufacturer's instructions before performing work.

## Features

- **Browse by topic** — articles organized into eight categories.
- **Full-text search** — SQLite FTS5 with prefix matching, relevance ranking
  (BM25), and highlighted result snippets.
- **Practice quizzes** — exam-style multiple-choice questions by topic, with
  instant feedback, a progress bar, scoring against the ~70% journeyman pass
  line, and a link from each answer back to the source article.
- Fast, server-rendered pages; articles, categories, and quizzes are statically
  generated.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript + React 18
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) with an FTS5
  virtual table for search
- Plain CSS (no UI framework)

## Getting started

```bash
npm install      # install dependencies
npm run seed     # build data/knowledge.db from the seed content
npm run dev      # start the dev server at http://localhost:3000
```

For a production build:

```bash
npm run build
npm start
```

The database auto-seeds on first access if `data/knowledge.db` is missing or
empty, so `npm run seed` is optional but handy when you edit content.

## Project layout

```
src/
  app/
    page.tsx                 # home — search bar + category grid
    search/page.tsx          # full-text search results
    category/[slug]/page.tsx # articles in a category
    article/[slug]/page.tsx  # a single article
    quiz/page.tsx            # quiz topic picker
    quiz/[slug]/page.tsx     # take a topic quiz
    layout.tsx, globals.css  # shell + styles
  components/
    SearchBar.tsx            # client-side search input
    Markdown.tsx             # minimal Markdown renderer for article bodies
    QuizRunner.tsx           # interactive quiz (client component)
  data/
    articles.ts              # the knowledge base content (categories + articles)
    quiz.ts                  # exam-style question bank
  lib/
    db.ts                    # SQLite connection, schema, FTS index, queries
    quiz.ts                  # quiz query helpers
    seed.ts                  # `npm run seed` entry point
```

## Adding or editing content

All content lives in [`src/data/articles.ts`](src/data/articles.ts). Add a
`Category` and/or an `Article` object, then re-run `npm run seed` (or just
restart — it reseeds when the table is empty). Article bodies support a small
Markdown subset: `**bold**`, `` `code` ``, `-`/`1.` lists, and `>` blockquotes.

The generated database (`data/*.db`) is git-ignored and rebuilt from the seed
content, so the content source of truth is always `articles.ts`.
