"use client";

import { useEffect, useState } from "react";

// Bookmarks are stored client-side in localStorage. Each entry is denormalized
// (carries title/summary/category) so the /bookmarks page can render without a
// server lookup.

export type Bookmark = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  savedAt: number;
};

const KEY = "wireman-kb:bookmarks";
const EVENT = "wireman-kb:bookmarks-change";

function read(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Bookmark[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: Bookmark[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  // Notify other hook instances in this tab (storage event only fires cross-tab).
  window.dispatchEvent(new Event(EVENT));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setBookmarks(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isBookmarked = (slug: string) => bookmarks.some((b) => b.slug === slug);

  const toggle = (entry: Omit<Bookmark, "savedAt">) => {
    const list = read();
    const exists = list.some((b) => b.slug === entry.slug);
    const next = exists
      ? list.filter((b) => b.slug !== entry.slug)
      : [{ ...entry, savedAt: Date.now() }, ...list];
    write(next);
    setBookmarks(next);
  };

  const remove = (slug: string) => {
    const next = read().filter((b) => b.slug !== slug);
    write(next);
    setBookmarks(next);
  };

  return { bookmarks, isBookmarked, toggle, remove, ready };
}
