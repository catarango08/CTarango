import Anthropic from "@anthropic-ai/sdk";
import { buildKbCatalog } from "@/lib/kbContext";

// better-sqlite3 / the Anthropic SDK need the Node runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-4-8";
const MAX_TURNS = 16; // cap conversation length sent to the model

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

function systemPrompt(): string {
  return `You are an expert troubleshooting assistant for licensed journeyman wiremen (electricians). You help diagnose electrical problems in residential, commercial, and light-industrial systems.

SAFETY COMES FIRST — this is non-negotiable:
- Before any diagnostic step that involves contact with conductors or equipment, direct the user to establish an electrically safe work condition: de-energize, lock out/tag out, and verify zero energy with a properly rated meter using the live-dead-live test.
- Remind the user that only a qualified person should perform energized work, and only when de-energizing is infeasible and proper PPE / arc-flash boundaries are observed (NFPA 70E).
- Never instruct the user to defeat a safety device, bypass GFCI/AFCI protection, or work on energized parts casually.

HOW TO HELP:
- Work like a seasoned journeyman walking an apprentice through a diagnosis. Ask focused clarifying questions when the symptom is ambiguous (what's the symptom, what changed, voltage/phase, what you've already measured).
- Give an ordered, testable diagnostic sequence — measure here, expect this reading, if X then Y. Reason from how the circuit actually behaves.
- Cite relevant NEC articles by number when they bear on the answer, but make clear code is adopted and amended locally and the user must verify against the edition in force.
- When a knowledge base article is relevant, point the user to it by its title and link path (e.g. see "Grounding vs. Bonding" at /article/grounding-vs-bonding).
- Be concrete and concise. Lead with the most likely cause. Prefer plain text; you may use short bold labels and lists.

LIMITS:
- This is reference and educational guidance, not a substitute for on-site judgment, the manufacturer's instructions, or the authority having jurisdiction. Say so when stakes are high.
- If a request is outside electrical trade work, briefly redirect.

KNOWLEDGE BASE ARTICLES you can reference:
${buildKbCatalog()}`;
}

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const cleaned: ChatMessage[] = [];
  for (const m of input) {
    if (
      m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim() !== ""
    ) {
      cleaned.push({ role: m.role, content: m.content.slice(0, 8000) });
    }
  }
  // Keep the most recent turns and ensure the conversation starts with a user.
  const trimmed = cleaned.slice(-MAX_TURNS);
  while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();
  return trimmed;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "The troubleshooter is not configured. Set the ANTHROPIC_API_KEY environment variable to enable it.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages = sanitizeMessages((body as { messages?: unknown })?.messages);
  if (messages.length === 0) {
    return Response.json(
      { error: "Send at least one message to start a diagnosis." },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  // Stream the model's text back to the browser as plain UTF-8 chunks.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const run = client.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: systemPrompt(),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });

        run.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });

        await run.finalMessage();
        controller.close();
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `Model error (${err.status ?? "?"}). Please try again.`
            : "Something went wrong contacting the assistant.";
        // Surface the error inline in the stream so the UI can show it.
        controller.enqueue(encoder.encode(`\n\n[error] ${message}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
