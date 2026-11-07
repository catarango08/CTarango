/** Permanent: do not credit, and do not ask Stripe to retry (HTTP 400). */
export class PaymentRejected extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'PaymentRejected';
  }
}

/** Transient: money may be saved, projection or a dependency failed. Stripe should retry (HTTP 500). */
export class PaymentRetry extends Error {
  readonly status = 500;
  constructor(message: string) {
    super(message);
    this.name = 'PaymentRetry';
  }
}
