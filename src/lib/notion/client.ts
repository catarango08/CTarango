/**
 * Minimal, dependency-free Notion REST client.
 *
 * We deliberately talk to the HTTP API rather than the official SDK so the
 * pinned `Notion-Version` is explicit and the file-upload endpoints (which the
 * SDK has churned on) are available without version gymnastics.
 */

export const NOTION_VERSION = '2022-06-28';
const API = 'https://api.notion.com/v1';

export class NotionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'NotionError';
  }
}

export interface NotionClientOptions {
  token?: string;
  fetchImpl?: typeof fetch;
  /** Max attempts for 429 / 5xx responses. */
  maxRetries?: number;
}

export class NotionClient {
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;

  constructor(opts: NotionClientOptions = {}) {
    const token = opts.token ?? process.env.NOTION_TOKEN ?? '';
    if (!token) throw new Error('NOTION_TOKEN is not set. Copy .env.example to .env.local and add your integration token.');
    this.token = token;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.maxRetries = opts.maxRetries ?? 4;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Notion-Version': NOTION_VERSION,
      ...extra,
    };
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.send<T>(method, path, {
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Used by the file-upload flow, which posts multipart form data. */
  async sendForm<T>(url: string, form: FormData): Promise<T> {
    return this.send<T>('POST', url, { headers: this.headers(), body: form });
  }

  private async send<T>(method: string, pathOrUrl: string, init: { headers: Record<string, string>; body?: BodyInit }): Promise<T> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API}${pathOrUrl}`;
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      let res: Response;
      try {
        res = await this.fetchImpl(url, { method, headers: init.headers, body: init.body });
      } catch (err) {
        lastError = err;
        if (attempt === this.maxRetries) break;
        await sleep(backoffMs(attempt));
        continue;
      }

      if (res.ok) return (await res.json()) as T;

      const retryable = res.status === 429 || res.status >= 500;
      const payload = await safeJson(res);
      if (!retryable || attempt === this.maxRetries) {
        const code = typeof payload === 'object' && payload && 'code' in payload ? String((payload as Record<string, unknown>).code) : undefined;
        const message =
          typeof payload === 'object' && payload && 'message' in payload
            ? String((payload as Record<string, unknown>).message)
            : `Notion ${method} ${pathOrUrl} failed with ${res.status}`;
        throw new NotionError(message, res.status, code, payload);
      }

      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt));
    }

    throw new NotionError(
      `Notion ${method} ${pathOrUrl} failed after ${this.maxRetries + 1} attempts: ${String(lastError)}`,
      0,
    );
  }

  /* --- convenience wrappers --------------------------------------- */

  createDatabase(body: unknown) {
    return this.request<NotionDatabase>('POST', '/databases', body);
  }

  retrieveDatabase(id: string) {
    return this.request<NotionDatabase>('GET', `/databases/${id}`);
  }

  updateDatabase(id: string, body: unknown) {
    return this.request<NotionDatabase>('PATCH', `/databases/${id}`, body);
  }

  queryDatabase(id: string, body: unknown = {}) {
    return this.request<NotionQueryResult>('POST', `/databases/${id}/query`, body);
  }

  createPage(body: unknown) {
    return this.request<NotionPage>('POST', '/pages', body);
  }

  retrievePage(id: string) {
    return this.request<NotionPage>('GET', `/pages/${id}`);
  }

  updatePage(id: string, body: unknown) {
    return this.request<NotionPage>('PATCH', `/pages/${id}`, body);
  }

  appendBlocks(blockId: string, children: unknown[]) {
    return this.request<unknown>('PATCH', `/blocks/${blockId}/children`, { children });
  }

  search(body: unknown) {
    return this.request<NotionQueryResult>('POST', '/search', body);
  }

  me() {
    return this.request<{ id: string; name?: string; bot?: { workspace_name?: string } }>('GET', '/users/me');
  }

  /** Query every page of a database, respecting Notion's 100-item pages. */
  async queryAll(id: string, body: Record<string, unknown> = {}, cap = 2000): Promise<NotionPage[]> {
    const out: NotionPage[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.queryDatabase(id, { ...body, page_size: 100, start_cursor: cursor });
      out.push(...(page.results as NotionPage[]));
      cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
    } while (cursor && out.length < cap);
    return out;
  }
}

/* --- types we actually touch --------------------------------------- */

export interface NotionPage {
  id: string;
  url?: string;
  created_time?: string;
  last_edited_time?: string;
  archived?: boolean;
  properties: Record<string, NotionPropertyValue>;
}

export interface NotionDatabase {
  id: string;
  url?: string;
  title?: { plain_text: string }[];
  properties: Record<string, { id: string; type: string; name: string }>;
}

export interface NotionQueryResult {
  results: unknown[];
  has_more: boolean;
  next_cursor: string | null;
}

export type NotionPropertyValue = Record<string, unknown> & { type?: string };

/* --- helpers -------------------------------------------------------- */

function backoffMs(attempt: number): number {
  return Math.min(8000, 2 ** attempt * 400) + Math.random() * 250;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

/** Notion ids are UUIDs; accept dashed, undashed, or a full page URL. */
export function normalizeId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g);
  if (!match || match.length === 0) throw new Error(`Could not find a Notion id in "${input}"`);
  const raw = match[match.length - 1].replace(/-/g, '');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}
