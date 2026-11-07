import Stripe from 'stripe';
import type { PayConfig } from './config';
import type { StripeLike } from './checkout';

/**
 * Real Stripe client. The Node SDK's client class is `Stripe` (there is no separate
 * StripeClient export). Keys come from env only; nothing is logged.
 * API version is the SDK's current pinned version.
 */
export function stripeClient(cfg: PayConfig): StripeLike & { webhooks: Stripe['webhooks'] } {
  const s = new Stripe(cfg.secretKey, { apiVersion: Stripe.API_VERSION, maxNetworkRetries: 2, appInfo: { name: 'tarango-field-desk' } });
  return {
    checkout: {
      sessions: {
        create: (p, o) => s.checkout.sessions.create(p, o),
        retrieve: (id) => s.checkout.sessions.retrieve(id),
        expire: (id) => s.checkout.sessions.expire(id),
      },
    },
    webhooks: s.webhooks,
  };
}
