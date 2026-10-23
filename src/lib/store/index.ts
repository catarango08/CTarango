import { notionConfigured } from '../notion/registry';
import { DemoStore } from './demo-store';
import { NotionStore } from './notion-store';
import type { Store } from './types';

export * from './types';

// Kept on globalThis so dev-mode route handlers and pages share one demo store.
const g = globalThis as unknown as { __teStore?: Store | null };
let instance: Store | null = g.__teStore ?? null;

/**
 * One store per process. Notion when it is fully configured, otherwise the
 * demo data — so a fresh clone boots into a populated app instead of an error.
 */
export function getStore(): Store {
  if (instance) return instance;
  instance = notionConfigured() ? new NotionStore() : new DemoStore();
  g.__teStore = instance;
  if (instance.kind === 'demo' && process.env.NODE_ENV !== 'test') {
    console.info('[voltflow] Running on demo data. Run `npm run notion:bootstrap` to connect Notion.');
  }
  return instance;
}

/** Test/util hook — forget the cached store so env changes take effect. */
export function resetStore(): void {
  instance = null;
  g.__teStore = null;
}
