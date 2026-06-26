import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wireman KB — Journeyman Electrician Knowledge Base",
  description:
    "A searchable knowledge base for licensed journeyman wiremen: NEC fundamentals, conductors, overcurrent, grounding, raceways, motors, calculations, and safety.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                ⚡
              </span>
              <span>
                Wireman<span className="brand-accent">KB</span>
              </span>
            </Link>
            <nav className="site-nav">
              <Link href="/">Browse</Link>
              <Link href="/search">Search</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p>
              For study and reference only. Always verify against the NEC edition
              adopted in your jurisdiction and the manufacturer&rsquo;s instructions
              before performing work.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
