"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({
  initialValue = "",
  autoFocus = false,
}: {
  initialValue?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  return (
    <form
      className="searchbar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <input
        type="search"
        name="q"
        value={value}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search the code, ampacity, grounding, box fill…"
        aria-label="Search the knowledge base"
      />
      <button type="submit">Search</button>
    </form>
  );
}
