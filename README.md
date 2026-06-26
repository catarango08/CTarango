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
- **AI Troubleshooter** — a streaming chat assistant (powered by Claude) that
  diagnoses electrical problems step by step, leads with electrical-safety
  practice (de-energize, LOTO, verify dead), cites NEC articles, and points back
  to the knowledge base. Requires an `ANTHROPIC_API_KEY` (see below).
- **Related articles** — every article cross-links to related ones, ranked by
  shared tags and category, so you can follow a topic across the KB.
- **Bookmarks** — save articles for quick reference; stored client-side in the
  browser (localStorage), with a live count in the header and a Saved page.
- Fast, server-rendered pages; articles, categories, and quizzes are statically
  generated.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript + React 18
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) with an FTS5
  virtual table for search
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript)
  with `claude-opus-4-8` (streaming) for the AI Troubleshooter
- Plain CSS (no UI framework)

## Getting started

```bash
npm install      # install dependencies
npm run seed     # build data/knowledge.db from the seed content
npm run dev      # start the dev server at http://localhost:3000
```

### Enabling the AI Troubleshooter

The `/troubleshoot` feature calls the Claude API and needs an API key:

```bash
cp .env.example .env.local
# then edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
```

Without a key the rest of the app works normally; the troubleshooter returns a
clear "not configured" message instead of crashing.

## Deploying to miget

The app runs on [miget](https://miget.com) from the included `Dockerfile`.

1. **Builder type:** in the miget app settings, set the Builder Type to
   **Dockerfile** (miget defaults to auto-detect buildpacks; selecting Dockerfile
   uses the tuned multi-stage build in this repo, which compiles the
   `better-sqlite3` native addon).
2. **Port:** nothing to configure — the container binds miget's injected `PORT`
   automatically (falling back to 3000 locally).
3. **Environment variables:** add `ANTHROPIC_API_KEY` to enable the AI
   Troubleshooter (the rest of the app works without it).
4. Deploy. The knowledge base DB regenerates from `src/data/articles.ts` on each
   boot, so no persistent volume is needed.

> The auto-detect buildpack also works (it runs `npm run build` then `npm start`,
> and `better-sqlite3` installs from prebuilt binaries), but the Dockerfile path
> is the most deterministic.

## Deploying to Fly.io

The repo ships a `Dockerfile` and `fly.toml`. Fly runs a normal container with a
writable filesystem, so SQLite works out of the box — the knowledge base DB is
regenerated from `src/data/articles.ts` at startup, so **no volume is needed**.

```bash
# one-time: install flyctl and sign in
#   https://fly.io/docs/flyctl/install/
fly auth login

# first deploy — pick a unique app name and region when prompted
fly launch            # detects the Dockerfile + fly.toml; say no to extra DBs

# set the troubleshooter key as a secret (optional but recommended)
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# subsequent deploys
fly deploy
```

`fly launch` builds the image on Fly's remote builders and gives you a public
`https://<app>.fly.dev` URL. The machine scales to zero when idle
(`auto_stop_machines`) and starts on the next request. Open the URL on your
phone and **Add to Home Screen** for an app-like icon.

### Continuous deployment (auto-deploy on merge)

`.github/workflows/fly-deploy.yml` deploys to Fly automatically on every push to
`master`. Enable it once:

```bash
fly tokens create deploy -x 999999h   # print a long-lived deploy token
```

Add that token as a GitHub repository secret named **`FLY_API_TOKEN`**
(Settings → Secrets and variables → Actions). After that, merging a PR to
`master` ships the change. The workflow runs only on `master`, so it doesn't
gate pull requests.

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
    troubleshoot/page.tsx    # AI troubleshooter page
    api/troubleshoot/route.ts# streaming Claude endpoint (Node runtime)
    bookmarks/page.tsx       # saved articles page
    layout.tsx, globals.css  # shell + styles
  components/
    SearchBar.tsx            # client-side search input
    Markdown.tsx             # minimal Markdown renderer for article bodies
    QuizRunner.tsx           # interactive quiz (client component)
    Troubleshooter.tsx       # streaming chat UI (client component)
    BookmarkButton.tsx       # save/unsave toggle on articles
    BookmarksList.tsx        # saved-articles list (Saved page)
    BookmarksNavLink.tsx     # header Saved link with live count
  data/
    articles.ts              # the knowledge base content (categories + articles)
    quiz.ts                  # exam-style question bank
  lib/
    db.ts                    # SQLite connection, schema, FTS index, related, queries
    quiz.ts                  # quiz query helpers
    kbContext.ts             # KB catalog injected into the troubleshooter prompt
    bookmarks.ts             # localStorage bookmark hook + helpers
    seed.ts                  # `npm run seed` entry point
```

## Adding or editing content

All content lives in [`src/data/articles.ts`](src/data/articles.ts). Add a
`Category` and/or an `Article` object, then re-run `npm run seed` (or just
restart — it reseeds when the table is empty). Article bodies support a small
Markdown subset: `**bold**`, `` `code` ``, `-`/`1.` lists, and `>` blockquotes.

The generated database (`data/*.db`) is git-ignored and rebuilt from the seed
content, so the content source of truth is always `articles.ts`.
