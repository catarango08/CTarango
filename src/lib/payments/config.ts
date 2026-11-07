/**
 * Stripe configuration, all from env. No keys or IDs live in the repo.
 * See docs/PAYMENTS.md for the exact names.
 */
export interface PayConfig {
  secretKey: string;
  webhookSecret: string;
  linkSecret: string;
  baseUrl: string;
  products: { invoice?: string; deposit?: string; changeOrder?: string; cardFee?: string };
}

const env = (k: string) => process.env[k]?.trim() || undefined;
/** Optional product ids: used only when set AND shaped like a Stripe product id. Never invented. */
const prod = (k: string) => { const v = env(k); return v && /^prod_[A-Za-z0-9]+$/.test(v) ? v : undefined; };

export function payConfig(): { ok: true; cfg: PayConfig } | { ok: false; missing: string[] } {
  const need = { STRIPE_SECRET_KEY: env('STRIPE_SECRET_KEY'), STRIPE_WEBHOOK_SECRET: env('STRIPE_WEBHOOK_SECRET'), PAY_LINK_SECRET: env('PAY_LINK_SECRET'), APP_BASE_URL: env('APP_BASE_URL') };
  const missing = Object.entries(need).filter(([, v]) => !v).map(([k]) => k);
  if (need.PAY_LINK_SECRET && need.PAY_LINK_SECRET.length < 32) missing.push('PAY_LINK_SECRET (at least 32 characters)');
  if (need.STRIPE_SECRET_KEY && !/^(sk|rk)_(test|live)_/.test(need.STRIPE_SECRET_KEY)) missing.push('STRIPE_SECRET_KEY (not a Stripe secret/restricted key)');
  if (need.APP_BASE_URL && !/^https:\/\//.test(need.APP_BASE_URL) && !/^http:\/\/localhost/.test(need.APP_BASE_URL)) missing.push('APP_BASE_URL (must be https)');
  if (missing.length) return { ok: false, missing };
  return { ok: true, cfg: {
    secretKey: need.STRIPE_SECRET_KEY!, webhookSecret: need.STRIPE_WEBHOOK_SECRET!, linkSecret: need.PAY_LINK_SECRET!, baseUrl: need.APP_BASE_URL!.replace(/\/$/, ''),
    products: { invoice: prod('STRIPE_PRODUCT_INVOICE'), deposit: prod('STRIPE_PRODUCT_DEPOSIT'), changeOrder: prod('STRIPE_PRODUCT_CHANGE_ORDER'), cardFee: prod('STRIPE_PRODUCT_CARD_FEE') },
  } };
}
