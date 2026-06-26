"use client";

import Link from "next/link";
import { useBookmarks } from "@/lib/bookmarks";

export function BookmarksList() {
  const { bookmarks, remove, ready } = useBookmarks();

  if (!ready) {
    return <p className="empty">Loading your saved articles…</p>;
  }

  if (bookmarks.length === 0) {
    return (
      <p className="empty">
        You haven&rsquo;t saved anything yet. Open any article and tap{" "}
        <strong>☆ Save</strong> to keep it here for quick reference.
      </p>
    );
  }

  return (
    <ul className="article-list">
      {bookmarks.map((b) => (
        <li key={b.slug} className="bookmark-row">
          <Link href={`/article/${b.slug}`} className="article-link">
            <h3>{b.title}</h3>
            <p>{b.summary}</p>
          </Link>
          <button
            type="button"
            className="bookmark-remove"
            onClick={() => remove(b.slug)}
            aria-label={`Remove ${b.title} from saved`}
            title="Remove from saved"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
