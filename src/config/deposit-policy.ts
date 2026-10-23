/**
 * DEPOSIT POLICY FALLBACK — the one marked file.
 * Corey locked this policy Oct 22, 2026 (mirrors /workspace/estimates/_build/deposit.py).
 * The live Rate Book row "Payment & deposit terms" wins for the printed terms
 * when it exists; these numbers are used when it does not parse.
 */
export const DEPOSIT_POLICY = {
  materialsAtSigningOver: 300,
  furnishedMin: 1000,
  furnishedRate: 0.3,
  progressOver: 5000,
  progressSplit: [0.3, 0.4, 0.3] as const,
  laborOnlyMin: 500,
  laborOnlyRate: 0.1,
  generatorRate: 0.5,
  changeOrderDueOver: 300,
  cardFee: 0.025,
  rateBookRow: 'Payment & deposit terms',
} as const;
