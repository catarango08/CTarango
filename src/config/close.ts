/**
 * Phase 1 "get paid & close" settings. One place to change them.
 */
export const CLOSE = {
  /** Follow-up calls after a quote goes out, in days after Quoted On. */
  followUpDays: [2, 5, 10] as const,

  /**
   * Google review link. PLACEHOLDER until Corey pastes the real one
   * (Google Business Profile → "Ask for reviews" → copy link).
   */
  googleReviewUrl: '',
  googleReviewPlaceholder: 'https://g.page/r/YOUR-REVIEW-LINK/review',

  /** Prewritten review text. {first} and {link} are filled in. Corey sends it himself. */
  reviewText:
    'Hi {first}, this is Corey with Tarango Electric. Thanks for having me out. If I did right by you, a quick Google review helps a small local shop more than anything: {link} Thank you!',

  /** Payment processor: Stripe. Pay links are pasted by hand for now. */
  payment: {
    processor: 'Stripe',
    linkLabel: 'Stripe payment link',
    button: 'Pay with card',
    nextStep: 'Create a Stripe Payment Link per invoice through the Stripe API once the Stripe account is set up. No API or keys in the app yet.',
  },
} as const;
