import React from "react";

// A deliberately small Markdown renderer for the subset our articles use:
// **bold**, headings via **bold lines**, `inline code`, "- " bullet lists,
// "1. " numbered lists, and blockquotes ("> "). Good enough for trusted,
// in-repo content without pulling a full Markdown dependency.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on **bold** and `code` while keeping delimiters.
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(<code key={`${keyPrefix}-c-${i}`}>{part.slice(1, -1)}</code>);
    } else {
      nodes.push(<React.Fragment key={`${keyPrefix}-t-${i}`}>{part}</React.Fragment>);
    }
  });
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!listBuffer) return;
    const items = listBuffer.items.map((item, i) => (
      <li key={i}>{renderInline(item, `li-${key}-${i}`)}</li>
    ));
    blocks.push(
      listBuffer.ordered ? (
        <ol key={`ol-${key++}`}>{items}</ol>
      ) : (
        <ul key={`ul-${key++}`}>{items}</ul>
      )
    );
    listBuffer = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flushList();
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);

    if (bullet) {
      if (listBuffer && listBuffer.ordered) flushList();
      listBuffer = listBuffer ?? { ordered: false, items: [] };
      listBuffer.items.push(bullet[1]);
      continue;
    }
    if (numbered) {
      if (listBuffer && !listBuffer.ordered) flushList();
      listBuffer = listBuffer ?? { ordered: true, items: [] };
      listBuffer.items.push(numbered[1]);
      continue;
    }

    flushList();

    // A line that is entirely bold acts as a sub-heading.
    const headingMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      blocks.push(<h3 key={`h-${key++}`}>{headingMatch[1]}</h3>);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      blocks.push(
        <blockquote key={`q-${key++}`}>
          {renderInline(trimmed.slice(2), `q-${key}`)}
        </blockquote>
      );
      continue;
    }

    blocks.push(<p key={`p-${key++}`}>{renderInline(trimmed, `p-${key}`)}</p>);
  }

  flushList();
  return <>{blocks}</>;
}
