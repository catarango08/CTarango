import { DEPOSIT_POLICY as P } from '@/config/deposit-policy';
import { round2 } from '../calc';

export interface DepositInput {
  total: number;
  /** Materials + rentals at Corey's cost (assumption: cost, not marked-up price). */
  materials: number;
  laborOnly: boolean;
  generator?: boolean;
  /** Generator unit + transfer switch cost. */
  generatorGear?: number;
}

export interface DepositResult {
  deposit: number;
  rule: string;
  candidates: { rule: string; amount: number }[];
  schedule?: { signing: number; roughIn: number; final: number };
  /** Paren text for the quote sentence. */
  paren: string;
  sentence: string;
  cardFee: number;
  /** Scheduling is not blocked on the deposit. The amount is shown. */
  mandatory: false;
  /** Mixes of rules the screen should not treat as settled. */
  edgeCases: string[];
}

/** Every rule that applies, highest wins, and the screen says which. The deposit is shown, not a gate on scheduling. */
export function computeDeposit(i: DepositInput): DepositResult {
  const total = Math.max(0, i.total);
  const mat = Math.max(0, i.materials);
  const edgeCases: string[] = [];
  const c: { rule: string; amount: number; paren: string }[] = [];
  if (i.laborOnly && mat > 0) edgeCases.push('Marked labor-only and also has materials or rentals. Both rules were calculated; the higher amount is shown and needs a look.');
  if (i.laborOnly && i.generator) edgeCases.push('Marked labor-only and generator. Both rules were calculated; the higher amount is shown and needs a look.');
  if (i.generator && i.generatorGear == null) edgeCases.push('Generator deposit needs the unit and transfer switch cost. That cost was missing, so the 50% branch was the only generator figure available.');
  if (mat > P.materialsAtSigningOver) c.push({ rule: `Materials over $${P.materialsAtSigningOver} due at signing`, amount: mat, paren: 'materials' });
  if (!i.laborOnly && total >= P.furnishedMin) c.push({ rule: `Contractor-furnished $${P.furnishedMin.toLocaleString()}+: greater of ${P.furnishedRate * 100}% or materials`, amount: Math.max(P.furnishedRate * total, mat), paren: mat >= P.furnishedRate * total ? 'materials' : `${P.furnishedRate * 100}%` });
  if (i.laborOnly && total > 0) c.push({ rule: `Labor-only: greater of $${P.laborOnlyMin} or ${P.laborOnlyRate * 100}%, then progress bills every 2 weeks`, amount: Math.max(P.laborOnlyMin, P.laborOnlyRate * total), paren: 'labor-only deposit' });
  if (i.generator) c.push({ rule: `Generator: greater of ${P.generatorRate * 100}% or unit + transfer switch`, amount: Math.max(P.generatorRate * total, i.generatorGear ?? 0), paren: 'generator equipment' });
  let schedule: DepositResult['schedule'];
  if (total > P.progressOver) {
    const signing = Math.max(P.progressSplit[0] * total, mat);
    c.push({ rule: `Over $${P.progressOver.toLocaleString()}: 30/40/30 (signing never below materials)`, amount: signing, paren: '30% at signing' });
  }
  if (c.length > 1) edgeCases.push('More than one Oct 22 rule matched. The higher amount is shown.');
  const best = c.map((x) => ({ ...x, amount: round2(Math.min(total, x.amount)) })).sort((a, b) => b.amount - a.amount)[0];
  const deposit = best?.amount ?? 0;
  if (total > P.progressOver) {
    let roughIn = round2(P.progressSplit[1] * total);
    let final = round2(total - deposit - roughIn);
    if (final < 0) {
      edgeCases.push('30/40/30 does not fit because the signing amount leaves less than the rough-in plus final. The remainder was not invented; review the split.');
      roughIn = round2(Math.max(0, total - deposit));
      final = 0;
    }
    schedule = { signing: deposit, roughIn, final };
  }
  const sentence = deposit > 0
    ? `To schedule your job, a deposit of $${deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${best.paren}) is due at signing and is credited in full to your final invoice.`
    : 'No deposit is required to schedule this job; payment is due on completion.';
  return { deposit, rule: best?.rule ?? 'No deposit rule applies', candidates: c.map(({ rule, amount }) => ({ rule, amount: round2(Math.min(total, amount)) })), schedule, paren: best?.paren ?? '', sentence, cardFee: round2(deposit * P.cardFee), mandatory: false, edgeCases };
}

/** What is kept if they cancel after materials are ordered. The app moves no money. */
export function cancellationRefund(depositPaid: number, materialsOrdered: number): { kept: number; refund: number } {
  const kept = round2(Math.min(depositPaid, materialsOrdered));
  return { kept, refund: round2(Math.max(0, depositPaid - kept)) };
}

export function cardFee(amount: number): number {
  return round2(amount * P.cardFee);
}

export const TERMS = [
  'Deposit is due at signing and credited in full on your final invoice. Jobs with more than $300 of materials or rentals: that cost is collected at signing (stocked or special-order). Change orders over $300 are paid when approved. Card payments carry a 2.5% fee.',
  'Cancellation: if you cancel after materials are ordered, the materials cost is kept and the materials are yours; the rest of the deposit is refunded.',
];
