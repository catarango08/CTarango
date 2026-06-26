import Link from "next/link";
import { BookmarksList } from "@/components/BookmarksList";

export const metadata = { title: "Saved Articles — Wireman KB" };

export default function BookmarksPage() {
  return (
    <>
      <p className="breadcrumb">
        <Link href="/">Browse</Link> / Saved
      </p>
      <section className="hero" style={{ paddingTop: 0, marginBottom: 20 }}>
        <h1>Saved Articles</h1>
        <p>
          Your bookmarked articles, kept in this browser for quick reference on the job.
        </p>
      </section>

      <BookmarksList />
    </>
  );
}
