"use client";

import Link from "next/link";
import { useBookmarks } from "@/lib/bookmarks";

export function BookmarksNavLink() {
  const { bookmarks, ready } = useBookmarks();
  const count = ready ? bookmarks.length : 0;

  return (
    <Link href="/bookmarks">
      Saved
      {count > 0 && <span className="nav-badge">{count}</span>}
    </Link>
  );
}
