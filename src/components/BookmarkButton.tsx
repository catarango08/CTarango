"use client";

import { useBookmarks } from "@/lib/bookmarks";

export function BookmarkButton({
  slug,
  title,
  summary,
  category,
}: {
  slug: string;
  title: string;
  summary: string;
  category: string;
}) {
  const { isBookmarked, toggle, ready } = useBookmarks();
  const saved = ready && isBookmarked(slug);

  return (
    <button
      type="button"
      className={`bookmark-btn ${saved ? "saved" : ""}`}
      aria-pressed={saved}
      onClick={() => toggle({ slug, title, summary, category })}
      title={saved ? "Remove from saved" : "Save this article"}
    >
      <span aria-hidden>{saved ? "★" : "☆"}</span>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
