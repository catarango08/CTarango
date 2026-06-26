"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const STARTERS = [
  "A 20A breaker keeps tripping on a kitchen small-appliance circuit. How do I find the cause?",
  "Receptacle reads 120V hot-to-ground but only 60V hot-to-neutral. What's going on?",
  "GFCI won't reset in a bathroom. Walk me through diagnosing it.",
  "3-phase motor hums but won't start. Where do I begin?",
];

export function Troubleshooter() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    // Add an empty assistant message we stream into.
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/troubleshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        appendToLast(
          `\n\n[error] ${data?.error ?? "The troubleshooter is unavailable right now."}`
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        appendToLast(decoder.decode(value, { stream: true }));
      }
    } catch {
      appendToLast("\n\n[error] Network error. Please try again.");
    } finally {
      setStreaming(false);
    }
  }

  function appendToLast(chunk: string) {
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (last && last.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: last.content + chunk };
      }
      return copy;
    });
  }

  const empty = messages.length === 0;

  return (
    <div className="ts">
      <div className="ts-thread" ref={scrollRef}>
        {empty ? (
          <div className="ts-welcome">
            <p>
              Describe the symptom — what you&rsquo;re seeing, what you&rsquo;ve measured,
              and what changed. I&rsquo;ll walk the diagnosis with you. Always confirm a
              de-energized, verified-dead circuit before touching conductors.
            </p>
            <div className="ts-starters">
              {STARTERS.map((s) => (
                <button key={s} className="ts-starter" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`ts-msg ts-msg-${m.role}`}>
              <div className="ts-msg-role">
                {m.role === "user" ? "You" : "Troubleshooter"}
              </div>
              <div className="ts-msg-body">
                {m.content ? (
                  <Markdown source={m.content} />
                ) : (
                  <span className="ts-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className="ts-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="Describe the electrical problem…"
          disabled={streaming}
          aria-label="Describe the electrical problem"
        />
        <button type="submit" disabled={streaming || input.trim() === ""}>
          {streaming ? "…" : "Send"}
        </button>
      </form>
      <p className="ts-disclaimer">
        AI-generated guidance for licensed trade use — verify against the NEC adopted in
        your jurisdiction, manufacturer instructions, and your AHJ. De-energize and verify
        dead before working.
      </p>
    </div>
  );
}
